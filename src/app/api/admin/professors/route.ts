import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

// GET /api/admin/professors
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const professors = await prisma.user.findMany({
      where: { role: "PROFESSOR" },
      include: {
        _count: {
          select: { sections: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ professors });
  } catch (error) {
    console.error("Admin professors error:", error);
    return NextResponse.json({ error: "Failed to load professors" }, { status: 500 });
  }
}

// POST /api/admin/professors (Invite / Create Professor)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const { email, displayName, initialPassword } = await request.json();

    if (!email || !displayName) {
      return NextResponse.json({ error: "Email and display name are required" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    const tempPassword = initialPassword || "FacultyPass2026!";
    const passwordHash = await hashPassword(tempPassword);

    const professor = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        displayName: displayName.trim(),
        passwordHash,
        role: "PROFESSOR",
        status: "ACTIVE",
      },
    });

    await recordAuditLog({
      actorId: session.id,
      actorEmail: session.email,
      action: "PROFESSOR_INVITED",
      targetType: "USER",
      targetId: professor.id,
      metadata: { email: professor.email, displayName: professor.displayName },
    });

    return NextResponse.json({
      success: true,
      professor: {
        id: professor.id,
        email: professor.email,
        displayName: professor.displayName,
      },
      initialPassword: tempPassword,
    });
  } catch (error) {
    console.error("Create professor error:", error);
    return NextResponse.json({ error: "Failed to invite professor" }, { status: 500 });
  }
}
