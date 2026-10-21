import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createStudentSession } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rate-limit";

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

    // 2. Validate section
    const section = await prisma.section.findUnique({
      where: { sectionCode: cleanSectionCode },
    });

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
    });

    if (!student) {
      await recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { error: "Invalid section code, Student ID, or access password. Please verify your credentials." },
        { status: 401 }
      );
    }

    // 4. Find section enrollment
    const enrollment = await prisma.sectionStudent.findUnique({
      where: {
        sectionId_studentId: {
          sectionId: section.id,
          studentId: student.id,
        },
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

    // Success: clear rate limit, update lastAccessAt
    await clearRateLimit(rateLimitKey);
    await prisma.sectionStudent.update({
      where: { id: enrollment.id },
      data: { lastAccessAt: new Date() },
    });

    // Create student session
    await createStudentSession({
      sectionStudentId: enrollment.id,
      studentId: student.id,
      sectionId: section.id,
      sectionCode: section.sectionCode,
      studentNumber: student.studentNumber,
      displayName: student.displayName,
    });

    return NextResponse.json({
      success: true,
      redirect: `/section/${section.sectionCode}/grades`,
    });
  } catch (error) {
    console.error("Student login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while validating your credentials." },
      { status: 500 }
    );
  }
}
