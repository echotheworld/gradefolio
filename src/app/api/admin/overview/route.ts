import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access: Super Admin only" }, { status: 403 });
    }

    const [
      activeProfessors,
      totalSections,
      publishedSections,
      draftSections,
      totalStudents,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "PROFESSOR", status: "ACTIVE" } }),
      prisma.section.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.section.count({ where: { status: "PUBLISHED" } }),
      prisma.section.count({ where: { status: "DRAFT" } }),
      prisma.student.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      metrics: {
        activeProfessors,
        totalSections,
        publishedSections,
        draftSections,
        totalStudents,
      },
      recentActivity: recentAuditLogs,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return NextResponse.json({ error: "Failed to load admin overview" }, { status: 500 });
  }
}
