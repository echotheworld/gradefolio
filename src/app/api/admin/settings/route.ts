import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

// GET /api/admin/settings
export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access: Super Admin only" }, { status: 403 });
    }

    let settings = await prisma.systemSetting.findUnique({
      where: { id: "global" },
    });

    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: {
          id: "global",
          institutionName: "GradeView University Portal",
          supportEmail: "support@gradeview.edu",
          maxUploadSizeMb: 15,
          defaultShowFinalGrade: true,
          defaultShowBreakdown: true,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

// POST /api/admin/settings
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access: Super Admin only" }, { status: 403 });
    }

    const body = await request.json();
    const {
      institutionName,
      supportEmail,
      maxUploadSizeMb,
      defaultShowFinalGrade,
      defaultShowBreakdown,
    } = body;

    const updated = await prisma.systemSetting.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        institutionName: institutionName || "GradeView University Portal",
        supportEmail: supportEmail || "support@gradeview.edu",
        maxUploadSizeMb: Number(maxUploadSizeMb) || 15,
        defaultShowFinalGrade: Boolean(defaultShowFinalGrade),
        defaultShowBreakdown: Boolean(defaultShowBreakdown),
      },
      update: {
        institutionName,
        supportEmail,
        maxUploadSizeMb: Number(maxUploadSizeMb),
        defaultShowFinalGrade: Boolean(defaultShowFinalGrade),
        defaultShowBreakdown: Boolean(defaultShowBreakdown),
      },
    });

    await recordAuditLog({
      actorId: session.id,
      actorEmail: session.email,
      action: "PLATFORM_SETTINGS_UPDATED",
      targetType: "SYSTEM",
      targetId: "global",
      metadata: { institutionName, supportEmail },
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    console.error("Save settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
