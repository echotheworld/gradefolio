import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized access: Super Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const actionFilter = searchParams.get("action");
    const query = searchParams.get("q")?.toLowerCase();

    const where: any = {};
    if (actionFilter) {
      where.action = actionFilter;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const filtered = query
      ? logs.filter(
          (l) =>
            l.actorEmail.toLowerCase().includes(query) ||
            l.action.toLowerCase().includes(query) ||
            l.targetType.toLowerCase().includes(query) ||
            (l.metadata && l.metadata.toLowerCase().includes(query))
        )
      : logs;

    return NextResponse.json({ logs: filtered });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
