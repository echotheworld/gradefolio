import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json({ error: "Section code is required" }, { status: 400 });
    }

    const section = await prisma.section.findUnique({
      where: { sectionCode: code },
      include: {
        ownerProfessor: {
          select: { displayName: true },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ exists: false, error: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({
      exists: true,
      section: {
        sectionCode: section.sectionCode,
        sectionName: section.sectionName,
        subjectName: section.subjectName,
        academicYear: section.academicYear,
        term: section.term,
        status: section.status,
        professorName: section.ownerProfessor.displayName,
        announcement: section.announcement,
        publishedAt: section.publishedAt,
        updatedAt: section.updatedAt,
      },
    });
  } catch (error) {
    console.error("Lookup error:", error);
    return NextResponse.json({ error: "Failed to look up section" }, { status: 500 });
  }
}
