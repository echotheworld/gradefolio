import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { validateNistPassword } from "@/lib/nist-password";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
    }

    const professor = await prisma.user.findUnique({ where: { id } });
    if (!professor) {
      return NextResponse.json({ error: "Professor not found" }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, any> = {};

    if (body.displayName && typeof body.displayName === "string") {
      const trimmedName = body.displayName.trim();
      if (!trimmedName) {
        return NextResponse.json({ error: "Display name cannot be empty" }, { status: 400 });
      }

      updateData.displayName = trimmedName;

      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: "PROFESSOR_NAME_UPDATED_BY_ADMIN",
        targetType: "USER",
        targetId: professor.id,
        metadata: {
          previousName: professor.displayName,
          newName: trimmedName,
          email: professor.email,
        },
      });
    }

    if (body.status && (body.status === "ACTIVE" || body.status === "SUSPENDED")) {
      updateData.status = body.status;

      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: body.status === "SUSPENDED" ? "PROFESSOR_SUSPENDED" : "PROFESSOR_REACTIVATED",
        targetType: "USER",
        targetId: professor.id,
        metadata: { email: professor.email, previousStatus: professor.status, newStatus: body.status },
      });
    }

    if (body.newPassword) {
      const validation = validateNistPassword(body.newPassword, {
        email: professor.email,
        displayName: professor.displayName,
      });
      if (!validation.isValid) {
        return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
      }

      updateData.passwordHash = await hashPassword(body.newPassword.trim());

      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: "PROFESSOR_PASSWORD_RESET_BY_ADMIN",
        targetType: "USER",
        targetId: professor.id,
        metadata: { email: professor.email },
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, professor: updated });
  } catch (error) {
    console.error("Update professor error:", error);
    return NextResponse.json({ error: "Failed to update professor" }, { status: 500 });
  }
}
