import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { generateSectionSnapshots } from "@/lib/snapshot";
import { serverCache } from "@/lib/server-cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/professor/sections/[id]
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const cacheKey = `prof_section_${id}`;
    const cached = serverCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(
        { section: cached },
        {
          headers: {
            "Cache-Control": "private, max-age=5, stale-while-revalidate=30",
          },
        }
      );
    }

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        ownerProfessor: {
          select: { id: true, displayName: true, email: true },
        },
        gradeItems: {
          select: {
            id: true,
            name: true,
            category: true,
            maxScore: true,
            displayOrder: true,
          },
          orderBy: { displayOrder: "asc" },
        },
        sectionStudents: {
          select: {
            id: true,
            finalGrade: true,
            finalGradeStatus: true,
            remarks: true,
            credentialStatus: true,
            student: {
              select: {
                id: true,
                studentNumber: true,
                displayName: true,
              },
            },
            gradeRecords: {
              select: {
                gradeItemId: true,
                score: true,
                status: true,
              },
            },
          },
          orderBy: { student: { studentNumber: "asc" } },
        },
        imports: {
          select: {
            id: true,
            fileName: true,
            status: true,
            createdCount: true,
            updatedCount: true,
            skippedCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    // Authorization check: cannot access another professor's section unless super admin
    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to access this section" },
        { status: 403 }
      );
    }

    serverCache.set(cacheKey, section, 20);

    return NextResponse.json(
      { section },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error("Fetch section error:", error);
    return NextResponse.json({ error: "Failed to fetch section" }, { status: 500 });
  }
}

// PATCH /api/professor/sections/[id]
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.sectionName !== undefined) updateData.sectionName = body.sectionName;
    if (body.subjectName !== undefined) updateData.subjectName = body.subjectName;
    if (body.academicYear !== undefined) updateData.academicYear = body.academicYear;
    if (body.term !== undefined) updateData.term = body.term;
    if (body.announcement !== undefined) updateData.announcement = body.announcement;
    if (body.showFinalGrade !== undefined) updateData.showFinalGrade = Boolean(body.showFinalGrade);
    if (body.showBreakdown !== undefined) updateData.showBreakdown = Boolean(body.showBreakdown);
    if (body.showProvisionalNotice !== undefined)
      updateData.showProvisionalNotice = Boolean(body.showProvisionalNotice);
    if (body.publishedPeriod !== undefined) updateData.publishedPeriod = String(body.publishedPeriod);
    if (body.weightConfig !== undefined) {
      updateData.weightConfig =
        typeof body.weightConfig === "string"
          ? body.weightConfig
          : JSON.stringify(body.weightConfig);
    }

    // Publication state change
    if (body.status !== undefined) {
      const newStatus = body.status;
      updateData.status = newStatus;
      if (newStatus === "PUBLISHED" && section.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }

      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: newStatus === "PUBLISHED" ? "GRADES_PUBLISHED" : "SECTION_STATUS_UPDATED",
        targetType: "SECTION",
        targetId: section.id,
        metadata: {
          previousStatus: section.status,
          newStatus,
          sectionCode: section.sectionCode,
        },
      });
    }

    const updated = await prisma.section.update({
      where: { id },
      data: updateData,
    });

    if (updated.status === "PUBLISHED") {
      // Pre-compute student grade snapshots in the background for 0.8ms point lookups
      generateSectionSnapshots(id).catch((err) =>
        console.error("Failed to generate section snapshots on update:", err)
      );
    }

    serverCache.delete(`prof_section_${id}`);
    serverCache.invalidatePrefix("prof_sections_");
    serverCache.invalidatePrefix("sec_meta_");

    return NextResponse.json({ success: true, section: updated });
  } catch (error) {
    console.error("Update section error:", error);
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
  }
}

// DELETE /api/professor/sections/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.section.delete({ where: { id } });

    serverCache.delete(`prof_section_${id}`);
    serverCache.invalidatePrefix("prof_sections_");
    serverCache.invalidatePrefix("sec_meta_");

    await recordAuditLog({
      actorId: session.id,
      actorEmail: session.email,
      action: "SECTION_DELETED",
      targetType: "SECTION",
      targetId: id,
      metadata: { sectionCode: section.sectionCode, sectionName: section.sectionName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete section error:", error);
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
