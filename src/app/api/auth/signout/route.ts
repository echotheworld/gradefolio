import { NextResponse } from "next/server";
import { destroySession, destroyStudentSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    let role: string | undefined;
    try {
      const body = await request.json();
      role = body?.role;
    } catch {
      // Body may be empty, handle gracefully
    }

    if (role === "STUDENT") {
      await destroyStudentSession();
    } else if (role === "PROFESSOR" || role === "FACULTY" || role === "ADMIN") {
      await destroySession();
    } else {
      await Promise.all([destroySession(), destroyStudentSession()]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signout error:", error);
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
  }
}
