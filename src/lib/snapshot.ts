import { prisma } from "@/lib/prisma";

const R_GRADE_MESSAGE = "Grade is unavaible to view. Kindly contact your professor for this matter. ";

export const isRValue = (val: string | null | undefined): boolean => {
  if (!val) return false;
  const s = val.trim().toUpperCase();
  if (
    s === "R" ||
    s.startsWith("R ") ||
    s.startsWith("R(") ||
    s.startsWith("R-") ||
    s === "REPEAT" ||
    s.includes("REPEAT") ||
    s.includes("MIDTERM: R") ||
    s.includes("FINALS: R") ||
    s.includes("FINAL: R") ||
    s.includes("KINDLY CONTACT YOUR PROFESSOR") ||
    s.includes("GRADES IS UNAVAILABLE") ||
    s.includes("UNAVAIBLE") ||
    s.includes("UNAVAILABLE")
  ) {
    return true;
  }
  const pctMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    if (!isNaN(pct) && pct < 60.0) return true;
  }
  const num = parseFloat(s);
  if (!isNaN(num) && num > 5.0 && num < 60.0) return true;
  return false;
};

export const sanitizeFinalGrade = (val: string | null | undefined): string | null => {
  if (!val) return null;
  return isRValue(val) ? "R" : val;
};

export const sanitizeRemarks = (remarks: string | null | undefined, finalGrade: string | null | undefined): string | null => {
  if (isRValue(finalGrade) || isRValue(remarks)) {
    return R_GRADE_MESSAGE;
  }
  return remarks || null;
};

/**
 * Pre-computes and materializes the published grade report for every student in a section.
 * This executes the heavy 5-table joins and calculations ONCE during publish,
 * enabling 5,000 students to read their pre-rendered JSON in a single <1ms point-lookup.
 */
export async function generateSectionSnapshots(sectionId: string): Promise<number> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      ownerProfessor: {
        select: {
          displayName: true,
          email: true,
        },
      },
      gradeItems: {
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          name: true,
          category: true,
          maxScore: true,
        },
      },
      sectionStudents: {
        include: {
          student: {
            select: {
              id: true,
              displayName: true,
              studentNumber: true,
            },
          },
          gradeRecords: {
            select: {
              gradeItemId: true,
              score: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!section || section.status !== "PUBLISHED") {
    return 0;
  }

  const updates: Array<{ id: string; snapshot: string }> = [];

  for (const enrollment of section.sectionStudents) {
    let breakdown: Array<{
      id: string;
      name: string;
      category: string | null;
      maxScore: number;
      score: number | null;
      status: string;
    }> | null = null;

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

    const finalGradeSanitized = section.showFinalGrade
      ? sanitizeFinalGrade(enrollment.finalGrade)
      : null;
    const remarksSanitized = section.showFinalGrade
      ? sanitizeRemarks(enrollment.remarks, enrollment.finalGrade)
      : null;

    const payload = {
      student: {
        displayName: enrollment.student.displayName,
        studentNumber: enrollment.student.studentNumber,
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
        publishedPeriod: section.publishedPeriod || "ALL",
        weightConfig: section.weightConfig,
        professorName: section.ownerProfessor?.displayName || "Professor",
        professorEmail: section.ownerProfessor?.email || "",
      },
      grade: {
        finalGrade: finalGradeSanitized,
        finalGradeStatus: section.showFinalGrade ? enrollment.finalGradeStatus : null,
        remarks: remarksSanitized,
        showFinalGrade: section.showFinalGrade,
        showBreakdown: section.showBreakdown,
        showProvisionalNotice: section.showProvisionalNotice,
      },
      breakdown,
    };

    updates.push({
      id: enrollment.id,
      snapshot: JSON.stringify(payload),
    });
  }

  // Update in small concurrent batches
  const batchSize = 25;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await Promise.all(
      batch.map((u) =>
        prisma.sectionStudent.update({
          where: { id: u.id },
          data: { publishedSnapshot: u.snapshot },
        })
      )
    );
  }

  return updates.length;
}
