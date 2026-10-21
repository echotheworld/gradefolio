import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "gradeview-super-secure-jwt-session-secret-key-32-chars-min"
);

export type Role = "SUPER_ADMIN" | "PROFESSOR";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: string;
}

export interface StudentSessionPayload {
  sectionStudentId: string;
  studentId: string;
  sectionId: string;
  sectionCode: string;
  studentNumber: string;
  displayName: string;
}

const AUTH_COOKIE_NAME = "gv_auth_token";
const STUDENT_COOKIE_NAME = "gv_student_token";

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function createStudentSession(student: StudentSessionPayload) {
  const token = await new SignJWT({ ...student })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("6h")
    .sign(SECRET_KEY);

  const cookieStore = await cookies();
  cookieStore.set(STUDENT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6, // 6 hours
  });

  return token;
}

export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as StudentSessionPayload;
  } catch {
    return null;
  }
}

export async function destroyStudentSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STUDENT_COOKIE_NAME);
}
