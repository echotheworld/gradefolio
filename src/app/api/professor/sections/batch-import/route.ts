import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { generateRandomCode, generateStudentPassword } from "@/lib/utils";
import { serverCache } from "@/lib/server-cache";
import { parseMultiSectionWorkbook, MultiSectionSheetSummary } from "@/lib/class-record-parser";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

export const maxDuration = 60; // Allow sufficient time for batch processing

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    let mode = "preview";
    let selectedSheets: string[] = [];
    let wb: XLSX.WorkBook | null = null;
    let fileName = "class_record.xlsx";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      mode = (formData.get("mode") as string) || "preview";
      const useSample = formData.get("useSample") === "true";
      const selectedSheetsRaw = formData.get("selectedSheets") as string;
      if (selectedSheetsRaw) {
        try {
          selectedSheets = JSON.parse(selectedSheetsRaw);
        } catch {
          selectedSheets = [];
        }
      }

      if (useSample) {
        const samplePath = path.join(process.cwd(), "public", "class_record.xlsx");
        if (fs.existsSync(samplePath)) {
          const fileBuffer = fs.readFileSync(samplePath);
          wb = XLSX.read(fileBuffer, { type: "buffer" });
          fileName = "sample_class_record.xlsx";
        } else {
          return NextResponse.json({ error: "Sample class record template not found on server" }, { status: 404 });
        }
      } else {
        const file = formData.get("file") as File | null;
        if (!file) {
          return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }
        fileName = file.name;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        wb = XLSX.read(buffer, { type: "buffer" });
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      mode = body.mode || "preview";
      selectedSheets = Array.isArray(body.selectedSheets) ? body.selectedSheets : [];
      if (body.useSample) {
        const samplePath = path.join(process.cwd(), "public", "class_record.xlsx");
        if (fs.existsSync(samplePath)) {
          const fileBuffer = fs.readFileSync(samplePath);
          wb = XLSX.read(fileBuffer, { type: "buffer" });
          fileName = "sample_class_record.xlsx";
        }
      }
    }

    if (!wb) {
      return NextResponse.json({ error: "Failed to read Excel workbook" }, { status: 400 });
    }

    // Parse the multi-section workbook
    const parseResult = parseMultiSectionWorkbook(wb);

    // Fetch existing professor's sections to identify matching sections
    const existingSections = await prisma.section.findMany({
      where: session.role === "SUPER_ADMIN" ? {} : { ownerProfessorId: session.id },
      select: {
        id: true,
        sectionCode: true,
        sectionName: true,
        subjectName: true,
        _count: {
          select: { sectionStudents: true, gradeItems: true },
        },
      },
    });

    const findMatchingExistingSection = (summary: MultiSectionSheetSummary) => {
      const targetSec = summary.sectionName.trim().toLowerCase();
      const targetCode = summary.sectionCode.trim().toLowerCase();
      return (
        existingSections.find(
          (s) =>
            s.sectionName.trim().toLowerCase() === targetSec ||
            s.sectionCode.trim().toLowerCase() === targetCode
        ) || null
      );
    };

    // MODE 1: PREVIEW
    if (mode === "preview") {
      const sectionsPreview = parseResult.sections.map((sec) => {
        const matched = findMatchingExistingSection(sec);
        return {
          sheetName: sec.sheetName,
          sheetIndex: sec.sheetIndex,
          sectionCode: sec.sectionCode,
          sectionName: sec.sectionName,
          subjectCode: sec.subjectCode,
          subjectTitle: sec.subjectTitle,
          academicYear: sec.academicYear,
          term: sec.term,
          units: sec.units,
          studentCount: sec.studentCount,
          assessmentCount: sec.assessmentCount,
          isEmpty: sec.isEmpty,
          isValid: sec.isValid,
          matchedExistingSection: matched
            ? {
                id: matched.id,
                sectionCode: matched.sectionCode,
                sectionName: matched.sectionName,
                subjectName: matched.subjectName,
                enrolledCount: matched._count.sectionStudents,
              }
            : null,
          recommendedAction: matched ? ("UPDATE" as const) : ("CREATE" as const),
          studentsPreview: sec.parsedData.students.slice(0, 5).map((st) => ({
            studentNumber: st.studentNumber,
            displayName: st.displayName,
            midtermEquivalent: st.midtermEquivalent,
            finalEquivalent: st.finalEquivalent,
            remarks: st.remarks,
          })),
        };
      });

      return NextResponse.json({
        success: true,
        fileName,
        coverPageFound: parseResult.coverPageFound,
        facultyName: parseResult.facultyName,
        academicYear: parseResult.academicYear,
        term: parseResult.term,
        department: parseResult.department,
        totalSections: parseResult.sections.length,
        activeSectionsCount: parseResult.totalActiveSections,
        totalStudents: parseResult.totalStudents,
        sections: sectionsPreview,
      });
    }

    // MODE 2: EXECUTE BATCH IMPORT
    if (mode === "execute") {
      // Filter target sections
      let targetSections = parseResult.sections.filter((s) => !s.isEmpty && s.studentCount > 0);
      if (selectedSheets.length > 0) {
        targetSections = targetSections.filter(
          (s) =>
            selectedSheets.includes(s.sheetName) ||
            selectedSheets.includes(s.sectionName) ||
            selectedSheets.includes(s.sectionCode)
        );
      }

      if (targetSections.length === 0) {
        return NextResponse.json(
          { error: "No active sections with student rosters selected for import." },
          { status: 400 }
        );
      }

      const importResults: any[] = [];
      let totalEnrolledAcrossAll = 0;

      for (const secSummary of targetSections) {
        const { sectionName, subjectCode, subjectTitle, academicYear, term, parsedData } = secSummary;

        // Check if section exists for this professor
        let section = await prisma.section.findFirst({
          where: {
            ownerProfessorId: session.id,
            OR: [
              { sectionCode: secSummary.sectionCode },
              { sectionName: secSummary.sectionName },
            ],
          },
          include: { gradeItems: true },
        });

        const subjectCombined = subjectTitle
          ? `${subjectCode ? subjectCode + " - " : ""}${subjectTitle}`
          : "Course Section";

        if (!section) {
          // Generate unique section code
          let finalCode = (secSummary.sectionCode || sectionName || "SEC")
            .toUpperCase()
            .replace(/[^A-Z0-9_-]/g, "");

          if (!finalCode) finalCode = generateRandomCode("");

          const existingGlobalCode = await prisma.section.findUnique({
            where: { sectionCode: finalCode },
          });

          if (existingGlobalCode) {
            finalCode = `${finalCode}_${generateRandomCode("", 4)}`;
          }

          section = await prisma.section.create({
            data: {
              ownerProfessorId: session.id,
              sectionCode: finalCode,
              sectionName,
              subjectName: subjectCombined,
              academicYear: academicYear || "2024-2025",
              term: term || "1st Term",
              status: "DRAFT",
              showFinalGrade: true,
              showBreakdown: true,
              showProvisionalNotice: true,
              weightConfig: JSON.stringify(parsedData.weights),
            },
            include: { gradeItems: true },
          });
        } else {
          // Update existing section
          section = await prisma.section.update({
            where: { id: section.id },
            data: {
              subjectName: subjectCombined || section.subjectName,
              academicYear: academicYear || section.academicYear,
              term: term || section.term,
              weightConfig: JSON.stringify(parsedData.weights),
              updatedAt: new Date(),
            },
            include: { gradeItems: true },
          });
        }

        // 1. Grade items mapping
        const itemMap = new Map<string, string>(); // itemName -> gradeItemId
        section.gradeItems.forEach((gi) => itemMap.set(gi.name.trim(), gi.id));

        let displayOrder = section.gradeItems.length + 1;
        for (const itemDef of parsedData.assessmentItems) {
          const trimmedName = itemDef.name?.trim();
          if (!trimmedName || itemMap.has(trimmedName)) continue;

          const createdItem = await prisma.gradeItem.create({
            data: {
              sectionId: section.id,
              name: trimmedName,
              category: itemDef.category || null,
              maxScore: itemDef.hps > 0 ? itemDef.hps : 100,
              displayOrder: displayOrder++,
            },
          });
          itemMap.set(trimmedName, createdItem.id);
        }

        // 2. Students and enrollments
        let secCreatedCount = 0;
        let secUpdatedCount = 0;

        for (const st of parsedData.students) {
          const studentNumber = String(st.studentNumber || "").trim();
          const displayName = String(st.displayName || "").trim() || `Student ${studentNumber}`;
          if (!studentNumber) continue;

          // Upsert student record
          let student = await prisma.student.findUnique({
            where: { studentNumber },
          });

          if (!student) {
            student = await prisma.student.create({
              data: { studentNumber, displayName },
            });
          } else if (displayName && student.displayName !== displayName) {
            await prisma.student.update({
              where: { id: student.id },
              data: { displayName },
            });
          }

          // SectionStudent enrollment
          let secStudent = await prisma.sectionStudent.findUnique({
            where: {
              sectionId_studentId: {
                sectionId: section.id,
                studentId: student.id,
              },
            },
          });

          const finalEquiv = st.finalEquivalent || st.midtermEquivalent || null;

          if (!secStudent) {
            // New student in this section: generate credentials
            const plainPassword = generateStudentPassword();
            const hashedPassword = await hashPassword(plainPassword);

            secStudent = await prisma.sectionStudent.create({
              data: {
                sectionId: section.id,
                studentId: student.id,
                credentialHash: hashedPassword,
                credentialStatus: "ACTIVE",
                finalGrade: finalEquiv,
                finalGradeStatus: finalEquiv ? "FINAL" : "PROVISIONAL",
              },
            });
            secCreatedCount++;
          } else {
            // Existing enrollment: preserve password, update grade
            await prisma.sectionStudent.update({
              where: { id: secStudent.id },
              data: {
                finalGrade: finalEquiv || secStudent.finalGrade,
                finalGradeStatus: finalEquiv ? "FINAL" : secStudent.finalGradeStatus,
              },
            });
            secUpdatedCount++;
          }

          // 3. Upsert Grade Scores
          if (st.scores && typeof st.scores === "object") {
            for (const [itemName, scoreVal] of Object.entries(st.scores)) {
              const itemId = itemMap.get(itemName.trim());
              if (!itemId) continue;

              const numScore =
                scoreVal !== null && scoreVal !== undefined && !isNaN(Number(scoreVal))
                  ? Number(scoreVal)
                  : null;

              await prisma.gradeRecord.upsert({
                where: {
                  sectionStudentId_gradeItemId: {
                    sectionStudentId: secStudent.id,
                    gradeItemId: itemId,
                  },
                },
                create: {
                  sectionStudentId: secStudent.id,
                  gradeItemId: itemId,
                  score: numScore,
                  status: numScore !== null ? "RECORDED" : "NOT_RECORDED",
                },
                update: {
                  score: numScore,
                  status: numScore !== null ? "RECORDED" : "NOT_RECORDED",
                },
              });
            }
          }
        }

        totalEnrolledAcrossAll += secCreatedCount + secUpdatedCount;

        // Record import history for this section
        await prisma.importHistory.create({
          data: {
            sectionId: section.id,
            uploadedById: session.id,
            fileName: `${fileName} [${secSummary.sheetName}]`,
            status: "SUCCESS",
            createdCount: secCreatedCount,
            updatedCount: secUpdatedCount,
            skippedCount: 0,
          },
        });

        importResults.push({
          sectionId: section.id,
          sectionCode: section.sectionCode,
          sectionName: section.sectionName,
          createdCount: secCreatedCount,
          updatedCount: secUpdatedCount,
        });
      }

      // Record comprehensive audit log
      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: "BATCH_SECTIONS_IMPORTED",
        targetType: "SECTION",
        targetId: importResults.map((r) => r.sectionId).join(","),
        metadata: {
          fileName,
          totalSectionsImported: importResults.length,
          totalStudentsProcessed: totalEnrolledAcrossAll,
          sectionCodes: importResults.map((r) => r.sectionCode),
        },
      });

      // Invalidate relevant server caches
      serverCache.invalidatePrefix("prof_sections_");
      serverCache.invalidatePrefix("admin_");

      return NextResponse.json({
        success: true,
        message: `Successfully imported ${importResults.length} sections (${totalEnrolledAcrossAll} students processed)`,
        importedCount: importResults.length,
        results: importResults,
      });
    }

    return NextResponse.json({ error: "Invalid mode specified" }, { status: 400 });
  } catch (error) {
    console.error("Batch import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process batch import" },
      { status: 500 }
    );
  }
}
