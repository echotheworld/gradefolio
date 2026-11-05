import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";
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
        gradeItems: {
          orderBy: { displayOrder: "asc" },
        },
        sectionStudents: {
          include: {
            student: true,
            gradeRecords: true,
          },
          orderBy: { student: { displayName: "asc" } },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Locate base template file:
    // Priority 1: Uploaded template for this section
    // Priority 2: public/template.xlsx
    // Priority 3: public/class_record.xlsx
    // Priority 4: public/grading_sheet_v3.xlsx
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

    let exportFilePath: string | null = null;
    if (fs.existsSync(uploadedFilePath)) {
      exportFilePath = uploadedFilePath;
    } else {
      const candidates = [
        path.join(process.cwd(), "public", "template.xlsx"),
        path.join(process.cwd(), "public", "class_record.xlsx"),
        path.join(process.cwd(), "public", "grading_sheet_v3.xlsx"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          exportFilePath = candidate;
          break;
        }
      }
    }

    if (!exportFilePath || !fs.existsSync(exportFilePath)) {
      return NextResponse.json({ error: "Template file not found" }, { status: 404 });
    }

    // 2. Read template workbook with XLSX
    const fileBuffer = fs.readFileSync(exportFilePath);
    const wb = XLSX.read(fileBuffer, { type: "buffer" });

    // 3. Locate target data sheet
    let targetSheetName =
      wb.SheetNames.find((n) => n === "Input Here") ||
      wb.SheetNames.find((n) => n === "1") ||
      wb.SheetNames.find(
        (n) => n.trim().toLowerCase() === section.sectionName.trim().toLowerCase()
      ) ||
      wb.SheetNames.find(
        (n) => !n.toLowerCase().includes("cover") && !n.toLowerCase().includes("instruction")
      ) ||
      wb.SheetNames[0];

    const ws = wb.Sheets[targetSheetName];
    if (!ws) {
      return NextResponse.json({ error: "Worksheet not found in template" }, { status: 500 });
    }

    // 4. Update Cover Page if present
    const coverSheetName = wb.SheetNames.find((n) => {
      const clean = n.trim().toLowerCase();
      return clean === "cover page" || clean === "cover";
    });
    if (coverSheetName && wb.Sheets[coverSheetName]) {
      const cp = wb.Sheets[coverSheetName];
      if (section.ownerProfessor?.displayName) {
        cp["C13"] = { v: section.ownerProfessor.displayName, t: "s" };
      }
      if (section.academicYear) {
        cp["M13"] = { v: section.academicYear, t: "s" };
      }
      if (section.term) {
        cp["R13"] = { v: section.term, t: "s" };
      }
      cp["E19"] = { v: section.sectionName || section.sectionCode, t: "s" };

      const subjParts = section.subjectName.split(" - ");
      const code = subjParts.length > 1 ? subjParts[0] : "";
      const title = subjParts.length > 1 ? subjParts.slice(1).join(" - ") : section.subjectName;
      cp["G19"] = { v: code, t: "s" };
      cp["I19"] = { v: title, t: "s" };
    }

    // 5. Populate Header Metadata on the target data sheet
    if (section.ownerProfessor?.displayName) {
      ws["G2"] = { v: section.ownerProfessor.displayName, t: "s" };
    }
    ws["G6"] = { v: `${section.term} SY ${section.academicYear}`, t: "s" };

    const subjParts = section.subjectName.split(" - ");
    const code = subjParts.length > 1 ? subjParts[0] : "";
    const title = subjParts.length > 1 ? subjParts.slice(1).join(" - ") : section.subjectName;

    ws["O2"] = { v: title, t: "s" };
    ws["O4"] = { v: code, t: "s" };
    ws["O6"] = { v: 3, t: "n" };
    ws["R6"] = { v: section.sectionName || section.sectionCode, t: "s" };

    // 6. Map Grade Items and Assessment Columns
    const ALL_ASSESSMENT_COLS = [
      "G", "H", "I", "J", "K", "L", "M", // CP Mid (Weeks 1-7)
      "N", "O", "P", "Q", "R", "S", "T", // CP Fin (Weeks 8-13)
      "U", "V", "W", "X", "Y", "Z", "AA", // EA Mid (Weeks 1-7)
      "AB", "AC", "AD", "AE", "AF", "AG", "AH", // EA Fin (Weeks 8-13)
      "AI", // MPT
      "AJ", // CPT
      "AK", // Bonus
    ];

    const itemColumnMap = new Map<string, string>();
    const usedCols = new Set<string>();

    // Pass 1: Match existing item names in row 11
    for (const col of ALL_ASSESSMENT_COLS) {
      const colTitle = String(ws[`${col}11`]?.v || "").trim();
      if (colTitle && colTitle !== "-") {
        const matched = section.gradeItems.find(
          (gi) => gi.name.trim().toLowerCase() === colTitle.toLowerCase()
        );
        if (matched) {
          itemColumnMap.set(matched.id, col);
          usedCols.add(col);
        }
      }
    }

    // Pass 2: Place any unmapped gradeItems into available columns
    let nextColIdx = 0;
    for (const gi of section.gradeItems) {
      if (itemColumnMap.has(gi.id)) continue;
      while (nextColIdx < ALL_ASSESSMENT_COLS.length && usedCols.has(ALL_ASSESSMENT_COLS[nextColIdx])) {
        nextColIdx++;
      }
      if (nextColIdx < ALL_ASSESSMENT_COLS.length) {
        const col = ALL_ASSESSMENT_COLS[nextColIdx];
        ws[`${col}11`] = { v: gi.name, t: "s" };
        ws[`${col}12`] = { v: gi.maxScore, t: "n" };
        itemColumnMap.set(gi.id, col);
        usedCols.add(col);
        nextColIdx++;
      }
    }

    // 7. Write All Enrolled Students (Starting at Row 13)
    section.sectionStudents.forEach((secSt, idx) => {
      const r = 13 + idx;
      ws[`B${r}`] = { v: idx + 1, t: "n" };
      ws[`C${r}`] = { v: secSt.student.studentNumber, t: "s" };
      ws[`D${r}`] = { v: secSt.student.displayName, t: "s" };

      // Write Assessment Scores
      if (secSt.gradeRecords && secSt.gradeRecords.length > 0) {
        for (const rec of secSt.gradeRecords) {
          const col = itemColumnMap.get(rec.gradeItemId);
          if (col && rec.score !== null && rec.score !== undefined) {
            ws[`${col}${r}`] = { v: rec.score, t: "n" };
          }
        }
      }

      // Write Final Grade / Equivalent
      if (secSt.finalGrade) {
        ws[`AO${r}`] = { v: secSt.finalGrade, t: "s" };
      }

      // Write Remarks
      if (secSt.remarks) {
        ws[`AP${r}`] = { v: secSt.remarks, t: "s" };
      }
    });

    // 8. Expand worksheet range to cover all written student rows
    const maxRow = Math.max(62, 13 + section.sectionStudents.length + 2);
    ws["!ref"] = `B1:AP${maxRow}`;

    // 9. Write workbook to output buffer
    const outputBuffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
      compression: true,
    });

    const safeFilename = originalFileName
      ? (originalFileName.toLowerCase().endsWith(".xlsx") ? originalFileName : `${originalFileName}.xlsx`)
      : `${section.sectionCode}_Class_Record.xlsx`;

    return new NextResponse(outputBuffer, {
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
