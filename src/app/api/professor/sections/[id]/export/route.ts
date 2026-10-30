import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import path from "path";
import fs from "fs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        ownerProfessor: { select: { displayName: true, email: true } },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Locate the exact uploaded template file for this section
    const sectionUploadDir = path.join(process.cwd(), "storage", "sections", section.id);
    const uploadedFilePath = path.join(sectionUploadDir, "uploaded_template.xlsx");
    let originalFileName: string | null = null;
    const originalNamePath = path.join(sectionUploadDir, "original_filename.txt");
    if (fs.existsSync(originalNamePath)) {
      try {
        originalFileName = fs.readFileSync(originalNamePath, "utf8").trim();
      } catch (e) {
        console.error("Failed to read original_filename.txt:", e);
      }
    }

    // 2. Select file to export:
    // Priority 1: The exact template file uploaded during import (preserves 100% of the design, logo, colors, watermarks, and contents)
    // Priority 2: The official master template from public/template.xlsx (or public/grading_sheet_v3.xlsx)
    let exportFilePath: string | null = null;
    if (fs.existsSync(uploadedFilePath)) {
      exportFilePath = uploadedFilePath;
    } else {
      const publicMaster = path.join(process.cwd(), "public", "template.xlsx");
      const fallbackMaster = path.join(process.cwd(), "public", "grading_sheet_v3.xlsx");
      if (fs.existsSync(publicMaster)) {
        exportFilePath = publicMaster;
      } else if (fs.existsSync(fallbackMaster)) {
        exportFilePath = fallbackMaster;
      }
    }

    if (!exportFilePath || !fs.existsSync(exportFilePath)) {
      return NextResponse.json({ error: "Template file not found" }, { status: 404 });
    }

    // Read the binary file directly to prevent any loss of styles, theme colors, drawing XML, or logo images
    const fileBuffer = fs.readFileSync(exportFilePath);

    const safeFilename = originalFileName
      ? (originalFileName.toLowerCase().endsWith(".xlsx") ? originalFileName : `${originalFileName}.xlsx`)
      : `${section.sectionCode}_Class_Record.xlsx`;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Export section error:", error);
    return NextResponse.json({ error: "Failed to export section" }, { status: 500 });
  }
}
