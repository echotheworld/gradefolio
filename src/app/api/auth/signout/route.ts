import { NextResponse } from "next/server";
import { destroySession, destroyStudentSession } from "@/lib/auth";

export async function POST() {
  await Promise.all([destroySession(), destroyStudentSession()]);
  return NextResponse.json({ success: true });
}
