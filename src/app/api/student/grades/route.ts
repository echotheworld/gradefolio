import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";
import { serverCache } from "@/lib/server-cache";

export async function GET() {
  try {
    const session = await getStudentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 0ms RAM CACHE: Check Server-Side Micro-Cache (Shields Supabase Connection Pool)
    const cachedRaw = serverCache.get<string>(`student_report_raw_${session.sectionStudentId}`);
    if (cachedRaw) {
      return new NextResponse(cachedRaw, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-transform, max-age=180, stale-while-revalidate=600",
        },
      });
    }

    // FAST PATH: Check pre-computed snapshot first (0.5ms single PK lookup, zero joins)
    const fastLookup = await prisma.sectionStudent.findUnique({
      where: { id: session.sectionStudentId },
      select: {
        id: true,
        publishedSnapshot: true,
        section: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!fastLookup || fastLookup.section.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "This grade report is either unavailable or has not been published." },
        { status: 404 }
      );
    }

    // High-concurrency enterprise path: Stream pre-computed JSON directly
    if (fastLookup.publishedSnapshot) {
      serverCache.set(`student_report_raw_${session.sectionStudentId}`, fastLookup.publishedSnapshot, 180);
      return new NextResponse(fastLookup.publishedSnapshot, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-transform, max-age=180, stale-while-revalidate=600",
        },
      });
    }

    // FALLBACK PATH: Dynamic calculation if snapshot was not yet materialized
    const enrollment = await prisma.sectionStudent.findUnique({
      where: { id: session.sectionStudentId },
      select: {
        id: true,
        finalGrade: true,
        finalGradeStatus: true,
        remarks: true,
        student: {
          select: {
            id: true,
            displayName: true,
            studentNumber: true,
          },
        },
        section: {
          select: {
            id: true,
            sectionCode: true,
            sectionName: true,
            subjectName: true,
            academicYear: true,
            term: true,
            announcement: true,
            publishedAt: true,
            updatedAt: true,
            status: true,
            showFinalGrade: true,
            showBreakdown: true,
            showProvisionalNotice: true,
            publishedPeriod: true,
            weightConfig: true,
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

    // Return lightweight payload with browser micro-caching (30s) to handle heavy traffic spikes
    const R_GRADE_MESSAGE = "Grade is unavaible to view. Kindly contact your professor for this matter. ";

    const isRValue = (val: string | null) => {
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

    // Final grade: R variants (incl. legacy rows that stored the advisory text) are shown as "R"
    const sanitizeFinalGrade = (val: string | null) => (isRValue(val) ? "R" : val);
    const finalIsR = isRValue(enrollment.finalGrade);
    // Remarks: R grades always carry the advisory note
    const sanitizeRemarks = (val: string | null) =>
      finalIsR || isRValue(val) ? R_GRADE_MESSAGE : val;

    return NextResponse.json(
      {
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
          publishedPeriod: section.publishedPeriod || "ALL",
          weightConfig: section.weightConfig,
          professorName: section.ownerProfessor.displayName,
          professorEmail: section.ownerProfessor.email,
        },
        grade: {
          finalGrade: section.showFinalGrade ? sanitizeFinalGrade(enrollment.finalGrade) : null,
          finalGradeStatus: section.showFinalGrade ? enrollment.finalGradeStatus : null,
          remarks: section.showFinalGrade ? sanitizeRemarks(enrollment.remarks) : null,
          showFinalGrade: section.showFinalGrade,
          showBreakdown: section.showBreakdown,
          showProvisionalNotice: section.showProvisionalNotice,
        },
        breakdown,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Fetch student grade error:", error);
    return NextResponse.json({ error: "Failed to load grade report" }, { status: 500 });
  }
}
