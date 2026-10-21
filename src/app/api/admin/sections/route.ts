import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

// GET /api/admin/sections
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access: Super Admin only" }, { status: 403 });
    }

    const sections = await prisma.section.findMany({
      include: {
        ownerProfessor: {
          select: { id: true, displayName: true, email: true },
        },
        _count: {
          select: {
            sectionStudents: true,
            gradeItems: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("Admin sections error:", error);
    return NextResponse.json({ error: "Failed to load sections" }, { status: 500 });
  }
}

// PATCH /api/admin/sections (Archive section)
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access: Super Admin only" }, { status: 403 });
    }

    const { sectionId, action } = await request.json();

    if (!sectionId) {
      return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
    }

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const newStatus = action === "archive" ? "ARCHIVED" : "DRAFT";

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: { status: newStatus },
    });

    await recordAuditLog({
      actorId: session.id,
      actorEmail: session.email,
      action: action === "archive" ? "SECTION_ARCHIVED_BY_ADMIN" : "SECTION_RESTORED_BY_ADMIN",
      targetType: "SECTION",
      targetId: section.id,
      metadata: { sectionCode: section.sectionCode, newStatus },
    });

    return NextResponse.json({ success: true, section: updated });
  } catch (error) {
    console.error("Admin section archive error:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}
