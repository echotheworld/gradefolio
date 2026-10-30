import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import path from "path";
import fs from "fs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/professor/sections/[id]/reset
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
        _count: {
          select: {
            sectionStudents: true,
            gradeItems: true,
            imports: true,
          },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to reset this section" },
        { status: 403 }
      );
    }

    // Execute atomic reset
    await prisma.$transaction([
      // 1. Delete all grade records for this section
      prisma.gradeRecord.deleteMany({
        where: {
          sectionStudent: {
            sectionId: id,
          },
        },
      }),
      // 2. Delete all student enrollments in this section
      prisma.sectionStudent.deleteMany({
        where: {
          sectionId: id,
        },
      }),
      // 3. Delete all assessment grade items for this section
      prisma.gradeItem.deleteMany({
        where: {
          sectionId: id,
        },
      }),
      // 4. Delete import logs for this section
      prisma.importHistory.deleteMany({
        where: {
          sectionId: id,
        },
      }),
      // 5. Revert section status to DRAFT
      prisma.section.update({
        where: { id },
        data: {
          status: "DRAFT",
          publishedAt: null,
          announcement: null,
        },
      }),
    ]);

    // 6. Clean up stored uploaded template file if present
    try {
      const storageDir = path.join(process.cwd(), "storage", "sections", id);
      if (fs.existsSync(storageDir)) {
        fs.rmSync(storageDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Failed to clean up section storage dir on reset:", e);
    }

    await recordAuditLog({
      action: "RESET_SECTION",
      actorId: session.id,
      actorEmail: session.email,
      targetId: id,
      targetType: "SECTION",
      metadata: {
        sectionCode: section.sectionCode,
        clearedStudents: section._count.sectionStudents,
        clearedGradeItems: section._count.gradeItems,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Section ${section.sectionCode} has been cleared of all student records and grade items. You can now re-import the sheet.`,
    });
  } catch (error: any) {
    console.error("Reset section error:", error);
    return NextResponse.json({ error: error.message || "Failed to reset section" }, { status: 500 });
  }
}
