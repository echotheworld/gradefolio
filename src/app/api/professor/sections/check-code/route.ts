import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRandomCode } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toUpperCase();

    if (code) {
      // Validate specific code provided by user
      const existing = await prisma.section.findUnique({
        where: { sectionCode: code },
        select: { id: true, sectionName: true },
      });

      return NextResponse.json({
        code,
        available: !existing,
        message: existing
          ? `Section code "${code}" is already in use. Please enter a different code.`
          : `Section code "${code}" is available.`,
      });
    }

    // Generate a guaranteed unique code that is NOT in the database
    let uniqueCode = "";
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 50) {
      uniqueCode = generateRandomCode("");
      const existing = await prisma.section.findUnique({
        where: { sectionCode: uniqueCode },
        select: { id: true },
      });
      if (!existing) {
        isUnique = true;
        break;
      }
      attempts++;
    }

    return NextResponse.json({
      code: uniqueCode,
      available: true,
      message: `Section code "${uniqueCode}" is unique and available.`,
    });
  } catch (error) {
    console.error("Check section code error:", error);
    return NextResponse.json({ error: "Failed to verify section code" }, { status: 500 });
  }
}
