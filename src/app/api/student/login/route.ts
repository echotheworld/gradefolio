import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createStudentSession } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";
import { serverCache } from "@/lib/server-cache";

export async function POST(request: Request) {
  try {
    const { sectionCode, studentNumber, password } = await request.json();

    if (!sectionCode || !studentNumber || !password) {
      return NextResponse.json(
        { error: "Section code, Student ID, and access password are required." },
        { status: 400 }
      );
    }

    const cleanSectionCode = sectionCode.trim().toUpperCase();
    const cleanStudentNumber = studentNumber.trim();
    const rateLimitKey = `student:${cleanSectionCode}:${cleanStudentNumber}`;

    // 1. Rate limiting check
    const rateCheck = await checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed access attempts. Please wait ${rateCheck.retryAfterMinutes} minutes before trying again or contact your professor.`,
        },
        { status: 429 }
      );
    }

    // 2. Validate section (with Server-Side Micro-Cache to protect Supabase connection pool)
    const secCacheKey = `sec_meta_${cleanSectionCode}`;
    let section = serverCache.get<{ id: string; sectionCode: string; status: string }>(secCacheKey);
    if (!section) {
      section = await prisma.section.findUnique({
        where: { sectionCode: cleanSectionCode },
        select: { id: true, sectionCode: true, status: true },
      });
      if (section) serverCache.set(secCacheKey, section, 30);
    }

    if (!section) {
      // Use generic error to avoid revealing section existence
      await recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid section code, Student ID, or access password. Please verify your credentials." },
        { status: 401 }
      );
    }

    if (section.status !== "PUBLISHED") {
      return NextResponse.json(
        {
          error:
            "Grades for this section are currently in draft or archived status. Only published sections are accessible.",
        },
        { status: 403 }
      );
    }

    // 3. Find student
    const student = await prisma.student.findUnique({
      where: { studentNumber: cleanStudentNumber },
      select: { id: true, studentNumber: true, displayName: true },
    });

    if (!student) {
      await recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid section code, Student ID, or access password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // 4. Find section enrollment (fetch snapshot in same query to pipeline report)
    const enrollment = await prisma.sectionStudent.findUnique({
      where: {
        sectionId_studentId: {
          sectionId: section.id,
          studentId: student.id,
        },
      },
      select: {
        id: true,
        credentialHash: true,
        credentialStatus: true,
        publishedSnapshot: true,
      },
    });

    if (!enrollment || !enrollment.credentialHash || enrollment.credentialStatus !== "ACTIVE") {
      await recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid section code, Student ID, or access password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // 5. Verify hashed password
    const isPasswordValid = await verifyPassword(password.trim(), enrollment.credentialHash);
    if (!isPasswordValid) {
      await recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid section code, Student ID, or access password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // Success: clear rate limit, update lastAccessAt in background (zero blocking latency)
    await clearRateLimit(rateLimitKey);
    prisma.sectionStudent.update({
      where: { id: enrollment.id },
      data: { lastAccessAt: new Date() },
    }).catch((err) => console.error("Non-blocking lastAccessAt update error:", err));

    // Create student session
    await createStudentSession({
      sectionStudentId: enrollment.id,
      studentId: student.id,
      sectionId: section.id,
      sectionCode: section.sectionCode,
      studentNumber: student.studentNumber,
      displayName: student.displayName,
    });

    // Pipeline report snapshot directly into response and Server Micro-Cache for 0ms page load
    let pipelinedReport: any = null;
    if (enrollment.publishedSnapshot) {
      try {
        pipelinedReport = typeof enrollment.publishedSnapshot === "string"
          ? JSON.parse(enrollment.publishedSnapshot)
          : enrollment.publishedSnapshot;
        serverCache.set(`student_report_${enrollment.id}`, pipelinedReport, 180);
      } catch (e) {
        console.error("Report pipeline parse error:", e);
      }
    }

    return NextResponse.json({
      success: true,
      redirect: `/section/${section.sectionCode}/grades`,
      report: pipelinedReport,
    });
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while validating your credentials." },
      { status: 500 }
    );
  }
}
