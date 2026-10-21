import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { generateStudentPassword } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/professor/sections/[id]/credentials
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        sectionStudents: {
          include: { student: true },
          orderBy: { student: { studentNumber: "asc" } },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const students = section.sectionStudents.map((ss) => ({
      sectionStudentId: ss.id,
      studentId: ss.student.id,
      studentNumber: ss.student.studentNumber,
      displayName: ss.student.displayName,
      credentialStatus: ss.credentialStatus,
      hasCredential: Boolean(ss.credentialHash),
      lastAccessAt: ss.lastAccessAt,
    }));

    return NextResponse.json({ students, sectionCode: section.sectionCode });
  } catch (error) {
    console.error("Fetch credentials error:", error);
    return NextResponse.json({ error: "Failed to fetch student credentials" }, { status: 500 });
  }
}

// POST /api/professor/sections/[id]/credentials
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        sectionStudents: {
          include: { student: true },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, studentId, targetStatus } = body;

    // Action 1: Batch generate credentials for all students
    if (action === "generate_all") {
      const generatedList: Array<{
        studentNumber: string;
        displayName: string;
        password: string;
      }> = [];

      for (const ss of section.sectionStudents) {
        const plainPassword = generateStudentPassword();
        const hashed = await hashPassword(plainPassword);

        await prisma.sectionStudent.update({
          where: { id: ss.id },
          data: {
            credentialHash: hashed,
            credentialStatus: "ACTIVE",
          },
        });

        generatedList.push({
          studentNumber: ss.student.studentNumber,
          displayName: ss.student.displayName,
          password: plainPassword,
        });
      }

      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: "CREDENTIALS_BATCH_GENERATED",
        targetType: "SECTION",
        targetId: section.id,
        metadata: {
          sectionCode: section.sectionCode,
          count: generatedList.length,
        },
      });

      return NextResponse.json({
        success: true,
        credentials: generatedList,
      });
    }

    // Action 2: Reissue for a single student
    if (action === "reissue_single") {
      if (!studentId) {
        return NextResponse.json({ error: "Student ID required" }, { status: 400 });
      }

      const ss = section.sectionStudents.find((s) => s.studentId === studentId);
      if (!ss) {
        return NextResponse.json({ error: "Student not found in this section" }, { status: 404 });
      }

      const newPassword = generateStudentPassword();
      const hashed = await hashPassword(newPassword);

      await prisma.sectionStudent.update({
        where: { id: ss.id },
        data: {
          credentialHash: hashed,
          credentialStatus: "ACTIVE",
        },
      });

      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: "CREDENTIAL_REISSUED",
        targetType: "STUDENT",
        targetId: studentId,
        metadata: {
          sectionCode: section.sectionCode,
          studentNumber: ss.student.studentNumber,
        },
      });

      return NextResponse.json({
        success: true,
        password: newPassword,
        studentNumber: ss.student.studentNumber,
        displayName: ss.student.displayName,
      });
    }

    // Action 3: Toggle active/revoked
    if (action === "toggle_status") {
      if (!studentId || !targetStatus) {
        return NextResponse.json({ error: "Student ID and target status required" }, { status: 400 });
      }

      const ss = section.sectionStudents.find((s) => s.studentId === studentId);
      if (!ss) {
        return NextResponse.json({ error: "Student not found in this section" }, { status: 404 });
      }

      await prisma.sectionStudent.update({
        where: { id: ss.id },
        data: { credentialStatus: targetStatus },
      });

      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: targetStatus === "REVOKED" ? "CREDENTIAL_REVOKED" : "CREDENTIAL_REACTIVATED",
        targetType: "STUDENT",
        targetId: studentId,
        metadata: {
          sectionCode: section.sectionCode,
          studentNumber: ss.student.studentNumber,
          status: targetStatus,
        },
      });

      return NextResponse.json({ success: true, newStatus: targetStatus });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Credentials error:", error);
    return NextResponse.json({ error: "Failed to manage student credentials" }, { status: 500 });
  }
}
