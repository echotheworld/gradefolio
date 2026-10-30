import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { generateRandomCode, generateStudentPassword } from "@/lib/utils";
import { serverCache } from "@/lib/server-cache";

// GET /api/professor/sections
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const cacheKey = `prof_sections_${session.id}_${session.role}`;
    const cached = serverCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { sections: cached },
        { headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=30" } }
      );
    }

    // A professor can ONLY access their own sections
    const sections = await prisma.section.findMany({
      where: session.role === "SUPER_ADMIN" ? {} : { ownerProfessorId: session.id },
      include: {
        _count: {
          select: {
            sectionStudents: true,
            gradeItems: true,
          },
        },
        ownerProfessor: {
          select: { displayName: true, email: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    serverCache.set(cacheKey, sections, 15);

    return NextResponse.json(
      { sections },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    console.error("Fetch sections error:", error);
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

// POST /api/professor/sections
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const {
      sectionName,
      subjectName,
      academicYear,
      term,
      sectionCode: customCode,
      announcement,
      showFinalGrade = true,
      showBreakdown = true,
      showProvisionalNotice = true,
    } = body;

    if (!sectionName || !subjectName || !academicYear || !term) {
      return NextResponse.json(
        { error: "Section name, course title, academic year, and term are required." },
        { status: 400 }
      );
    }

    // Determine unique section code
    let finalCode = (customCode || "").trim().toUpperCase();
    if (finalCode) {
      const existing = await prisma.section.findUnique({ where: { sectionCode: finalCode } });
      if (existing) {
        return NextResponse.json(
          { error: `Section Code '${finalCode}' is already in use. Please choose another.` },
          { status: 400 }
        );
      }
    } else {
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 50) {
        finalCode = generateRandomCode("");
        const existing = await prisma.section.findUnique({ where: { sectionCode: finalCode } });
        if (!existing) {
          isUnique = true;
          break;
        }
        attempts++;
      }
    }

    const section = await prisma.section.create({
      data: {
        ownerProfessorId: session.id,
        sectionCode: finalCode,
        sectionName,
        subjectName,
        academicYear,
        term,
        announcement: announcement || null,
        status: "DRAFT",
        showFinalGrade: Boolean(showFinalGrade),
        showBreakdown: Boolean(showBreakdown),
        showProvisionalNotice: Boolean(showProvisionalNotice),
      },
    });

    // If student roster is provided (e.g. from Classlist PDF parsing), enroll them automatically in fast parallel batches
    const students = Array.isArray(body.students) ? body.students : [];
    let enrolledCount = 0;

    if (students.length > 0) {
      const BATCH_SIZE = 8;
      for (let i = 0; i < students.length; i += BATCH_SIZE) {
        const batch = students.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (st: any) => {
            const studentNumber = String(st.studentNumber || "").trim();
            const displayName = String(st.displayName || "").trim() || `Student ${studentNumber}`;
            if (!studentNumber) return;

            // Find or create student
            let student = await prisma.student.findUnique({
              where: { studentNumber },
            });

            if (!student) {
              student = await prisma.student.create({
                data: { studentNumber, displayName },
              });
            } else if (displayName && student.displayName !== displayName) {
              await prisma.student.update({
                where: { id: student.id },
                data: { displayName },
              });
            }

            // Generate student password & hash
            const plainPassword = generateStudentPassword();
            const hashedPassword = await hashPassword(plainPassword);

            // Create SectionStudent enrollment
            await prisma.sectionStudent.upsert({
              where: {
                sectionId_studentId: {
                  sectionId: section.id,
                  studentId: student.id,
                },
              },
              update: {},
              create: {
                sectionId: section.id,
                studentId: student.id,
                credentialHash: hashedPassword,
                credentialStatus: "ACTIVE",
              },
            });

            enrolledCount++;
          })
        );
      }
    }

    await recordAuditLog({
      actorId: session.id,
      actorEmail: session.email,
      action: "SECTION_CREATED",
      targetType: "SECTION",
      targetId: section.id,
      metadata: {
        sectionCode: section.sectionCode,
        sectionName: section.sectionName,
        enrolledCount,
        fromPdf: students.length > 0,
      },
    });

    serverCache.invalidatePrefix("prof_sections_");
    serverCache.invalidatePrefix("admin_");

    return NextResponse.json({
      success: true,
      section,
      enrolledCount,
    });
  } catch (error) {
    console.error("Create section error:", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}
