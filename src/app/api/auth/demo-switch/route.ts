import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, createStudentSession, destroySession, destroyStudentSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { role } = await request.json();

    // Clear any existing cookies
    await Promise.all([destroySession(), destroyStudentSession()]);

    if (role === "admin") {
      const admin = await prisma.user.findFirst({
        where: { role: "SUPER_ADMIN" },
      });
      if (!admin) {
        return NextResponse.json({ error: "Super Admin account not found" }, { status: 404 });
      }
      await createSession({
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: "SUPER_ADMIN",
        status: admin.status,
      });
      return NextResponse.json({ success: true, redirect: "/admin" });
    }

    if (role === "prof") {
      const prof = await prisma.user.findFirst({
        where: { email: "prof.reyes@gradeview.edu" },
      });
      if (!prof) {
        return NextResponse.json({ error: "Professor account not found" }, { status: 404 });
      }
      await createSession({
        id: prof.id,
        email: prof.email,
        displayName: prof.displayName,
        role: "PROFESSOR",
        status: prof.status,
      });
      return NextResponse.json({ success: true, redirect: "/professor" });
    }

    if (role === "student") {
      const student = await prisma.student.findFirst({
        where: { studentNumber: "2024-00101" },
        include: {
          sectionStudents: {
            include: { section: true },
          },
        },
      });

      if (!student || student.sectionStudents.length === 0) {
        return NextResponse.json({ error: "Demo student not found" }, { status: 404 });
      }

      const secStudent = student.sectionStudents[0];
      await createStudentSession({
        sectionStudentId: secStudent.id,
        studentId: student.id,
        sectionId: secStudent.section.id,
        sectionCode: secStudent.section.sectionCode,
        studentNumber: student.studentNumber,
        displayName: student.displayName,
      });

      return NextResponse.json({
        success: true,
        redirect: `/section/${secStudent.section.sectionCode}/grades`,
      });
    }

    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  } catch (error) {
    console.error("Demo switch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
