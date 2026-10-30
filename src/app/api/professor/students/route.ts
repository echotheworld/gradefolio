import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const whereClause = session.role === "SUPER_ADMIN" ? {} : { section: { ownerProfessorId: session.id } };

    const students = await prisma.sectionStudent.findMany({
      where: whereClause,
      select: {
        id: true,
        finalGrade: true,
        finalGradeStatus: true,
        remarks: true,
        credentialStatus: true,
        lastAccessAt: true,
        student: {
          select: {
            id: true,
            studentNumber: true,
            displayName: true,
          },
        },
        section: {
          select: {
            id: true,
            sectionCode: true,
            sectionName: true,
            subjectName: true,
            status: true,
          },
        },
      },
      orderBy: [
        { section: { sectionCode: "asc" } },
        { student: { studentNumber: "asc" } },
      ],
    });

    return NextResponse.json(
      { students },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Fetch professor students error:", error);
    return NextResponse.json({ error: "Failed to fetch student directory" }, { status: 500 });
  }
}
