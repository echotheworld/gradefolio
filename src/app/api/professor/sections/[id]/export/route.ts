import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import * as XLSX from "xlsx";

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

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "xlsx";

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        gradeItems: { orderBy: { displayOrder: "asc" } },
        sectionStudents: {
          include: {
            student: true,
            gradeRecords: true,
          },
          orderBy: { student: { studentNumber: "asc" } },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build header row
    const headers = ["Student ID", "Student Name"];
    section.gradeItems.forEach((item) => {
      headers.push(`${item.name} (${item.maxScore})`);
    });
    headers.push("Final Grade");
    headers.push("Final Grade Status");
    headers.push("Remarks");

    // Build data rows
    const rows: (string | number)[][] = [headers];

    section.sectionStudents.forEach((secStudent) => {
      const recordsMap = new Map<string, number | null>();
      secStudent.gradeRecords.forEach((r) => recordsMap.set(r.gradeItemId, r.score));

      const row: (string | number)[] = [
        secStudent.student.studentNumber,
        secStudent.student.displayName,
      ];

      section.gradeItems.forEach((item) => {
        const val = recordsMap.get(item.id);
        row.push(val !== undefined && val !== null ? val : "");
      });

      row.push(secStudent.finalGrade || "");
      row.push(secStudent.finalGradeStatus || "");
      row.push(secStudent.remarks || "");

      rows.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, section.sectionName || "Grades");

    const safeFilename = `${section.sectionCode}_Gradebook`;

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeFilename}.csv"`,
        },
      });
    }

    // XLSX format
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeFilename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export gradebook" }, { status: 500 });
  }
}
