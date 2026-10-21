import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession, destroySession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "This account has been suspended. Please contact your platform administrator." },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Update last sign in
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSignInAt: new Date() },
    });

    await createSession({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as "SUPER_ADMIN" | "PROFESSOR",
      status: user.status,
    });

    await recordAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      action: "USER_SIGNED_IN",
      targetType: "USER",
      targetId: user.id,
      metadata: { role: user.role },
    });

    const redirect = user.role === "SUPER_ADMIN" ? "/admin" : "/professor";
    return NextResponse.json({ success: true, redirect });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "An unexpected error occurred during sign in" }, { status: 500 });
  }
}
