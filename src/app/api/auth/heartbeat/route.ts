import { NextResponse } from "next/server";
import { getSession, createSession, getStudentSession, createStudentSession } from "@/lib/auth";

export async function POST() {
  try {
    const faculty = await getSession();
    if (faculty) {
      await createSession(faculty);
      return NextResponse.json({ success: true, role: faculty.role });
    }

    const student = await getStudentSession();
    if (student) {
      await createStudentSession(student);
      return NextResponse.json({ success: true, role: "STUDENT" });
    }

    return NextResponse.json({ error: "No active session to refresh" }, { status: 401 });
  } catch (error) {
    console.error("Session heartbeat error:", error);
    return NextResponse.json({ error: "Failed to refresh session" }, { status: 500 });
  }
}
