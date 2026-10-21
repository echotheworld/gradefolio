import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const enrollment = await prisma.sectionStudent.findUnique({
      where: { id: session.sectionStudentId },
      include: {
        student: true,
        section: {
          include: {
            ownerProfessor: {
              select: {
                displayName: true,
                email: true,
              },
            },
            gradeItems: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
        gradeRecords: true,
      },
    });

    if (!enrollment || enrollment.section.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "This grade report is either unavailable or has not been published." },
        { status: 404 }
      );
    }

    const { section, student } = enrollment;

    // Filter assessment breakdown according to professor settings
    let breakdown = null;
    if (section.showBreakdown) {
      const recordsMap = new Map<string, { score: number | null; status: string }>();
      enrollment.gradeRecords.forEach((r) => {
        recordsMap.set(r.gradeItemId, { score: r.score, status: r.status });
      });

      breakdown = section.gradeItems.map((item) => {
        const record = recordsMap.get(item.id);
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          maxScore: item.maxScore,
          score: record?.score ?? null,
          status: record?.status ?? "NOT_RECORDED",
        };
      });
    }

    return NextResponse.json({
      student: {
        displayName: student.displayName,
        studentNumber: student.studentNumber,
      },
      section: {
        id: section.id,
        sectionCode: section.sectionCode,
        sectionName: section.sectionName,
        subjectName: section.subjectName,
        academicYear: section.academicYear,
        term: section.term,
        announcement: section.announcement,
        publishedAt: section.publishedAt,
        updatedAt: section.updatedAt,
        professorName: section.ownerProfessor.displayName,
        professorEmail: section.ownerProfessor.email,
      },
      grade: {
        finalGrade: section.showFinalGrade ? enrollment.finalGrade : null,
        finalGradeStatus: section.showFinalGrade ? enrollment.finalGradeStatus : null,
        remarks: section.showFinalGrade ? enrollment.remarks : null,
        showFinalGrade: section.showFinalGrade,
        showBreakdown: section.showBreakdown,
        showProvisionalNotice: section.showProvisionalNotice,
      },
      breakdown,
    });
  } catch (error) {
    console.error("Fetch student grade error:", error);
    return NextResponse.json({ error: "Failed to load grade report" }, { status: 500 });
  }
}
