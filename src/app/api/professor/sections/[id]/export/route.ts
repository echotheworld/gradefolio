import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import JSZip from "jszip";
import path from "path";
import fs from "fs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function escapeXml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function setCellText(
  xml: string,
  cellCoord: string,
  text: string | null | undefined,
  defaultStyle: string = "231"
): string {
  if (text === null || text === undefined) return xml;
  const escaped = escapeXml(text);
  const regex = new RegExp(`<c r="${cellCoord}"[^>]*\\/>|<c r="${cellCoord}"[^>]*>[\\s\\S]*?<\\/c>`);
  if (regex.test(xml)) {
    return xml.replace(regex, (match) => {
      const sMatch = match.match(/s="(\d+)"/);
      const style = sMatch ? sMatch[1] : defaultStyle;
      return `<c r="${cellCoord}" s="${style}" t="inlineStr"><is><t>${escaped}</t></is></c>`;
    });
  }
  return xml;
}

function setCellValue(
  xml: string,
  cellCoord: string,
  val: number | string | null | undefined,
  defaultStyle: string = "100"
): string {
  if (val === null || val === undefined) return xml;
  const regex = new RegExp(`<c r="${cellCoord}"[^>]*\\/>|<c r="${cellCoord}"[^>]*>[\\s\\S]*?<\\/c>`);
  if (regex.test(xml)) {
    return xml.replace(regex, (match) => {
      const sMatch = match.match(/s="(\d+)"/);
      const style = sMatch ? sMatch[1] : defaultStyle;
      return `<c r="${cellCoord}" s="${style}"><v>${val}</v></c>`;
    });
  }
  return xml;
}

function updateFormulaCachedValue(xml: string, cellCoord: string, val: string | number): string {
  const regex = new RegExp(`(<c r="${cellCoord}"[^>]*>.*?<v>)([^<]*)(<\\/v><\\/c>)`);
  if (regex.test(xml)) {
    return xml.replace(regex, `$1${escapeXml(val)}$3`);
  }
  return setCellText(xml, cellCoord, String(val));
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
    // Priority 1: User's uploaded template for this section
    // Priority 2: public/grading_sheet_v3.xlsx (official National University visual template)
    // Priority 3: public/template.xlsx
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
        path.join(process.cwd(), "public", "grading_sheet_v3.xlsx"),
        path.join(process.cwd(), "public", "template.xlsx"),
        path.join(process.cwd(), "public", "class_record.xlsx"),
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

    // 2. Load the binary file directly into JSZip
    // This PRESERVES 100% of logos, theme colors, drawing XML, headers, shapes, and formulas
    const fileBuffer = fs.readFileSync(exportFilePath);
    const zip = await JSZip.loadAsync(fileBuffer);

    // 3. Remove calcChain.xml and its relationships to prevent Excel file-level validation repair popup
    zip.remove("xl/calcChain.xml");

    let relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("text");
    if (relsXml) {
      relsXml = relsXml.replace(/<Relationship[^>]*Target="calcChain\.xml"[^>]*\/>/g, "");
      zip.file("xl/_rels/workbook.xml.rels", relsXml);
    }

    let ctXml = await zip.file("[Content_Types].xml")?.async("text");
    if (ctXml) {
      ctXml = ctXml.replace(/<Override[^>]*PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, "");
      zip.file("[Content_Types].xml", ctXml);
    }

    // 4. Resolve worksheet paths from workbook.xml
    let coverSheetPath = "xl/worksheets/sheet1.xml";
    let dataSheetPath = "xl/worksheets/sheet2.xml";

    const wbXml = await zip.file("xl/workbook.xml")?.async("text");
    if (wbXml && relsXml) {
      const dataSheetMatch =
        wbXml.match(/<sheet[^>]*name="Input Here"[^>]*r:id="([^"]+)"/) ||
        wbXml.match(/<sheet[^>]*name="1"[^>]*r:id="([^"]+)"/) ||
        wbXml.match(/<sheet[^>]*r:id="([^"]+)"/);

      if (dataSheetMatch) {
        const rId = dataSheetMatch[1];
        const relMatch = relsXml.match(new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]+)"`));
        if (relMatch) {
          const target = relMatch[1].replace(/^\/?/, "");
          dataSheetPath = target.startsWith("xl/") ? target : `xl/${target}`;
        }
      }

      const coverMatch = wbXml.match(/<sheet[^>]*name="Cover Page"[^>]*r:id="([^"]+)"/);
      if (coverMatch) {
        const rId = coverMatch[1];
        const relMatch = relsXml.match(new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]+)"`));
        if (relMatch) {
          const target = relMatch[1].replace(/^\/?/, "");
          coverSheetPath = target.startsWith("xl/") ? target : `xl/${target}`;
        }
      }
    }

    // 5. Update Cover Page (sheet1.xml)
    let coverXml = await zip.file(coverSheetPath)?.async("text");
    if (coverXml) {
      if (section.ownerProfessor?.displayName) {
        coverXml = setCellText(coverXml, "C13", section.ownerProfessor.displayName, "231");
      }
      if (section.academicYear) {
        coverXml = setCellText(coverXml, "M13", section.academicYear, "18");
      }
      if (section.term) {
        coverXml = setCellText(coverXml, "R13", section.term, "18");
      }
      coverXml = setCellText(coverXml, "E19", section.sectionName || section.sectionCode, "18");

      const subjParts = section.subjectName.split(" - ");
      const code = subjParts.length > 1 ? subjParts[0] : "";
      const title = subjParts.length > 1 ? subjParts.slice(1).join(" - ") : section.subjectName;

      coverXml = setCellText(coverXml, "G19", code, "18");
      coverXml = setCellText(coverXml, "I19", title, "18");
      coverXml = setCellValue(coverXml, "T19", 3, "18");

      zip.file(coverSheetPath, coverXml);
    }

    // 6. Update Target Data Sheet (sheet2.xml / Input Here)
    let dataXml = await zip.file(dataSheetPath)?.async("text");
    if (!dataXml) {
      return NextResponse.json({ error: "Worksheet data not found in template" }, { status: 500 });
    }

    // Populate header values while preserving their Cover Page formulas
    const subjParts = section.subjectName.split(" - ");
    const code = subjParts.length > 1 ? subjParts[0] : "";
    const title = subjParts.length > 1 ? subjParts.slice(1).join(" - ") : section.subjectName;

    if (section.ownerProfessor?.displayName) {
      dataXml = updateFormulaCachedValue(dataXml, "G2", section.ownerProfessor.displayName);
    }
    dataXml = updateFormulaCachedValue(dataXml, "G6", `${section.term} SY ${section.academicYear}`);
    dataXml = updateFormulaCachedValue(dataXml, "O2", title);
    dataXml = updateFormulaCachedValue(dataXml, "O4", code);
    dataXml = updateFormulaCachedValue(dataXml, "O6", 3);
    dataXml = updateFormulaCachedValue(dataXml, "R6", section.sectionName || section.sectionCode);

    // 7. Map Assessment Columns
    const ALL_ASSESSMENT_COLS = [
      "G", "H", "I", "J", "K", "L", "M", // CP Mid
      "N", "O", "P", "Q", "R", "S", "T", // CP Fin
      "U", "V", "W", "X", "Y", "Z", "AA", // EA Mid
      "AB", "AC", "AD", "AE", "AF", "AG", "AH", // EA Fin
      "AI", // MPT
      "AJ", // CPT
      "AK", // Bonus
    ];

    const itemColumnMap = new Map<string, string>();
    const usedCols = new Set<string>();

    for (const col of ALL_ASSESSMENT_COLS) {
      const match = dataXml.match(new RegExp(`<c r="${col}11"[^>]*><is><t>([^<]+)<\\/t><\\/is><\\/c>`));
      const colTitle = match ? match[1].trim() : "";
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

    let nextColIdx = 0;
    for (const gi of section.gradeItems) {
      if (itemColumnMap.has(gi.id)) continue;
      while (nextColIdx < ALL_ASSESSMENT_COLS.length && usedCols.has(ALL_ASSESSMENT_COLS[nextColIdx])) {
        nextColIdx++;
      }
      if (nextColIdx < ALL_ASSESSMENT_COLS.length) {
        const col = ALL_ASSESSMENT_COLS[nextColIdx];
        dataXml = setCellText(dataXml, `${col}11`, gi.name, "96");
        dataXml = setCellValue(dataXml, `${col}12`, gi.maxScore, "97");
        itemColumnMap.set(gi.id, col);
        usedCols.add(col);
        nextColIdx++;
      }
    }

    // 8. Write Enrolled Students Starting at Row 13
    for (let idx = 0; idx < section.sectionStudents.length; idx++) {
      const secSt = section.sectionStudents[idx];
      const r = 13 + idx;

      if (r <= 62) {
        // Pre-existing styled rows in template
        dataXml = setCellValue(dataXml, `B${r}`, idx + 1, "6");
        dataXml = setCellText(dataXml, `C${r}`, secSt.student.studentNumber, "61");
        dataXml = setCellText(dataXml, `D${r}`, secSt.student.displayName, "62");

        // Write Assessment Scores
        if (secSt.gradeRecords && secSt.gradeRecords.length > 0) {
          for (const rec of secSt.gradeRecords) {
            const col = itemColumnMap.get(rec.gradeItemId);
            if (col && rec.score !== null && rec.score !== undefined) {
              dataXml = setCellValue(dataXml, `${col}${r}`, rec.score, "79");
            }
          }
        }

        // Remarks (AP)
        if (secSt.remarks) {
          dataXml = setCellText(dataXml, `AP${r}`, secSt.remarks, "106");
        }
      } else {
        // Extended rows beyond row 62: construct cleanly styled row before </sheetData>
        let extraCells = `<c r="B${r}" s="6"><v>${idx + 1}</v></c><c r="C${r}" s="61" t="inlineStr"><is><t>${escapeXml(secSt.student.studentNumber)}</t></is></c><c r="D${r}" s="62" t="inlineStr"><is><t>${escapeXml(secSt.student.displayName)}</t></is></c>`;

        if (secSt.gradeRecords && secSt.gradeRecords.length > 0) {
          for (const rec of secSt.gradeRecords) {
            const col = itemColumnMap.get(rec.gradeItemId);
            if (col && rec.score !== null && rec.score !== undefined) {
              extraCells += `<c r="${col}${r}" s="79"><v>${rec.score}</v></c>`;
            }
          }
        }

        if (secSt.remarks) {
          extraCells += `<c r="AP${r}" s="106" t="inlineStr"><is><t>${escapeXml(secSt.remarks)}</t></is></c>`;
        }

        const newRowXml = `<row r="${r}" spans="2:42" s="5" customFormat="1" ht="23.25" customHeight="1">${extraCells}</row>`;
        dataXml = dataXml.replace("</sheetData>", `${newRowXml}</sheetData>`);
      }
    }

    zip.file(dataSheetPath, dataXml);

    // 9. Generate final package
    const outputBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const safeFilename = originalFileName
      ? (originalFileName.toLowerCase().endsWith(".xlsx") ? originalFileName : `${originalFileName}.xlsx`)
      : `${section.sectionCode}_Class_Record.xlsx`;

    return new NextResponse(outputBuffer as any, {
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
