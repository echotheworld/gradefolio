import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const section = await prisma.section.findUnique({
      where: { id },
      include: { gradeItems: true },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { fileName, gradeItems = [], rows = [], errorSummary } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No valid rows to import" }, { status: 400 });
    }

    // 1. Process grade items: create missing grade items
    const itemMap = new Map<string, string>(); // itemName -> gradeItemId
    section.gradeItems.forEach((gi) => itemMap.set(gi.name.trim(), gi.id));

    let displayOrderCounter = section.gradeItems.length + 1;
    for (const itemDef of gradeItems) {
      const trimmedName = itemDef.name?.trim();
      if (!trimmedName) continue;

      if (!itemMap.has(trimmedName)) {
        const createdItem = await prisma.gradeItem.create({
          data: {
            sectionId: section.id,
            name: trimmedName,
            category: itemDef.category || null,
            maxScore: typeof itemDef.maxScore === "number" ? itemDef.maxScore : 100,
            displayOrder: displayOrderCounter++,
          },
        });
        itemMap.set(trimmedName, createdItem.id);
      }
    }

    // 2. Process student records and grade scores
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
      const studentNumber = String(row.studentNumber || "").trim();
      const displayName = String(row.displayName || "").trim() || `Student ${studentNumber}`;

      if (!studentNumber) {
        skippedCount++;
        continue;
      }

      // Upsert Student
      let student = await prisma.student.findUnique({
        where: { studentNumber },
      });

      if (!student) {
        student = await prisma.student.create({
          data: {
            studentNumber,
            displayName,
          },
        });
      } else if (displayName && student.displayName !== displayName) {
        await prisma.student.update({
          where: { id: student.id },
          data: { displayName },
        });
      }

      // Upsert SectionStudent enrollment
      let secStudent = await prisma.sectionStudent.findUnique({
        where: {
          sectionId_studentId: {
            sectionId: section.id,
            studentId: student.id,
          },
        },
      });

      if (!secStudent) {
        secStudent = await prisma.sectionStudent.create({
          data: {
            sectionId: section.id,
            studentId: student.id,
            finalGrade: row.finalGrade !== undefined && row.finalGrade !== null ? String(row.finalGrade) : null,
            finalGradeStatus: row.finalGrade ? "FINAL" : "PROVISIONAL",
          },
        });
        createdCount++;
      } else {
        await prisma.sectionStudent.update({
          where: { id: secStudent.id },
          data: {
            finalGrade:
              row.finalGrade !== undefined && row.finalGrade !== null
                ? String(row.finalGrade)
                : secStudent.finalGrade,
          },
        });
        updatedCount++;
      }

      // Upsert grade records for each mapped assessment
      if (row.scores && typeof row.scores === "object") {
        for (const [itemName, scoreVal] of Object.entries(row.scores)) {
          const itemId = itemMap.get(itemName.trim());
          if (!itemId) continue;

          const numScore =
            scoreVal !== null && scoreVal !== undefined && !isNaN(Number(scoreVal))
              ? Number(scoreVal)
              : null;

          await prisma.gradeRecord.upsert({
            where: {
              sectionStudentId_gradeItemId: {
                sectionStudentId: secStudent.id,
                gradeItemId: itemId,
              },
            },
            create: {
              sectionStudentId: secStudent.id,
              gradeItemId: itemId,
              score: numScore,
              status: numScore !== null ? "RECORDED" : "NOT_RECORDED",
            },
            update: {
              score: numScore,
              status: numScore !== null ? "RECORDED" : "NOT_RECORDED",
            },
          });
        }
      }
    }

    // Set section to DRAFT (intentional publishing: must review before publishing)
    await prisma.section.update({
      where: { id: section.id },
      data: {
        status: "DRAFT",
        updatedAt: new Date(),
      },
    });

    // Record import history
    await prisma.importHistory.create({
      data: {
        sectionId: section.id,
        uploadedById: session.id,
        fileName: fileName || "gradebook_upload.xlsx",
        status: errorSummary ? "WARNINGS" : "SUCCESS",
        createdCount,
        updatedCount,
        skippedCount,
        errorSummary: errorSummary || null,
      },
    });

    // Record audit log
    await recordAuditLog({
      actorId: session.id,
      actorEmail: session.email,
      action: "GRADEBOOK_IMPORTED",
      targetType: "SECTION",
      targetId: section.id,
      metadata: {
        fileName,
        createdCount,
        updatedCount,
        skippedCount,
      },
    });

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("Import processing error:", error);
    return NextResponse.json({ error: "Failed to process import" }, { status: 500 });
  }
}
