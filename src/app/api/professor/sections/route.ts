import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { generateRandomCode } from "@/lib/utils";

// GET /api/professor/sections
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
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

    return NextResponse.json({ sections });
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
    let finalCode = (customCode || generateRandomCode("GV")).trim().toUpperCase();
    const existing = await prisma.section.findUnique({ where: { sectionCode: finalCode } });
    if (existing) {
      if (customCode) {
        return NextResponse.json(
          { error: `Section Code '${finalCode}' is already in use. Please choose another.` },
          { status: 400 }
        );
      }
      finalCode = generateRandomCode("GV");
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

    await recordAuditLog({
      actorId: session.id,
      actorEmail: session.email,
      action: "SECTION_CREATED",
      targetType: "SECTION",
      targetId: section.id,
      metadata: { sectionCode: section.sectionCode, sectionName: section.sectionName },
    });

    return NextResponse.json({ success: true, section });
  } catch (error) {
    console.error("Create section error:", error);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}
