import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseClasslistPDF } from "@/lib/pdf-classlist-parser";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    let buffer: Buffer | null = null;
    let fileName = "classlist.pdf";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const isSample = formData.get("sample") === "true";

      if (isSample) {
        const samplePath = path.join(process.cwd(), "public", "SampleOfficialClasslistFetch.pdf");
        if (fs.existsSync(samplePath)) {
          buffer = fs.readFileSync(samplePath);
          fileName = "SampleOfficialClasslistFetch.pdf";
        }
      } else if (file) {
        const bytes = await file.arrayBuffer();
        buffer = Buffer.from(bytes);
        fileName = file.name;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      if (body.sample) {
        const samplePath = path.join(process.cwd(), "public", "SampleOfficialClasslistFetch.pdf");
        if (fs.existsSync(samplePath)) {
          buffer = fs.readFileSync(samplePath);
          fileName = "SampleOfficialClasslistFetch.pdf";
        }
      }
    }

    if (!buffer) {
      return NextResponse.json(
        { error: "No PDF file or sample provided for parsing." },
        { status: 400 }
      );
    }

    const parseResult = await parseClasslistPDF(buffer);

    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error || "Failed to parse PDF." }, { status: 400 });
    }

    // Check code availability in database
    const initialCode = (parseResult.sectionName || "").trim().toUpperCase();
    let suggestedCode = initialCode;
    let codeAvailable = true;

    if (initialCode) {
      const existing = await prisma.section.findUnique({
        where: { sectionCode: initialCode },
      });
      if (existing) {
        codeAvailable = false;
        // Generate suffix variant e.g. ACT261-2
        let counter = 2;
        let candidate = `${initialCode}-${counter}`;
        while (counter < 20) {
          const check = await prisma.section.findUnique({ where: { sectionCode: candidate } });
          if (!check) {
            suggestedCode = candidate;
            break;
          }
          counter++;
          candidate = `${initialCode}-${counter}`;
        }
      }
    }

    return NextResponse.json({
      success: true,
      fileName,
      metadata: {
        academicYear: parseResult.academicYear,
        term: parseResult.term,
        subjectName: parseResult.subjectName,
        subjectCode: parseResult.subjectCode,
        sectionName: parseResult.sectionName,
        instructor: parseResult.instructor,
        classLimit: parseResult.classLimit,
        offeredTo: parseResult.offeredTo || "",
        schedules: parseResult.schedules || [],
        suggestedCode,
        codeAvailable,
      },
      students: parseResult.students,
      totalStudents: parseResult.totalStudents,
    });
  } catch (error: any) {
    console.error("Parse classlist PDF error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error parsing PDF." },
      { status: 500 }
    );
  }
}
