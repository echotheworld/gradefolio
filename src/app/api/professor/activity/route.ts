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

    const imports = await prisma.importHistory.findMany({
      where: whereClause,
      include: {
        section: {
          select: {
            id: true,
            sectionCode: true,
            sectionName: true,
            subjectName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const auditLogs = await prisma.auditLog.findMany({
      where: session.role === "SUPER_ADMIN" ? {} : { actorId: session.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      { imports, auditLogs },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Fetch professor activity error:", error);
    return NextResponse.json({ error: "Failed to fetch activity history" }, { status: 500 });
  }
}
