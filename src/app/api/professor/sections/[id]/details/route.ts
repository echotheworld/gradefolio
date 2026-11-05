import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { generateStudentPassword } from "@/lib/utils";
import { serverCache } from "@/lib/server-cache";
import { generateSectionSnapshots } from "@/lib/snapshot";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const FIELD_LABELS: Record<string, string> = {
  subjectName: "Subject Name",
  subjectCode: "Subject Code",
  sectionName: "Section",
  instructor: "Instructor",
  offeredTo: "Offered To",
  classLimit: "Class Limit",
  academicYear: "Academic Year",
  term: "Term",
  schedules: "Subject Schedules",
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

function scheduleText(rows: any[]): string {
  return rows
    .map((s) => `${str(s.day)} ${str(s.time)} (${str(s.roomType)} ${str(s.room)})`.trim())
    .join("; ");
}

function normalizeSchedules(input: any): any[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((s) => s && (s.day || s.time || s.room))
    .map((s) => ({
      day: str(s.day),
      time: str(s.time),
      roomType: str(s.roomType),
      room: str(s.room),
    }));
}

// POST /api/professor/sections/[id]/details  { mode: "preview" | "execute", section, students?, removeMissing? }
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        sectionStudents: { include: { student: true } },
      },
    });
    if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const mode = body.mode === "execute" ? "execute" : "preview";
    const incoming = body.section || {};
    const removeMissing = body.removeMissing !== false;
    const incomingStudents: any[] | null = Array.isArray(body.students) ? body.students : null;

    // ---- Section field changes ----
    let oldSchedules: any[] = [];
    try {
      oldSchedules = section.schedules ? JSON.parse(section.schedules) : [];
    } catch {
      oldSchedules = [];
    }

    const next = {
      subjectName: str(incoming.subjectName) || section.subjectName,
      subjectCode: str(incoming.subjectCode),
      sectionName: str(incoming.sectionName) || section.sectionName,
      instructor: str(incoming.instructor),
      offeredTo: str(incoming.offeredTo),
      classLimit: str(incoming.classLimit),
      academicYear: str(incoming.academicYear) || section.academicYear,
      term: str(incoming.term) || section.term,
      schedules: normalizeSchedules(incoming.schedules),
    };

    const current: Record<string, string> = {
      subjectName: section.subjectName,
      subjectCode: str(section.subjectCode),
      sectionName: section.sectionName,
      instructor: str(section.instructor),
      offeredTo: str(section.offeredTo),
      classLimit: str(section.classLimit),
      academicYear: section.academicYear,
      term: section.term,
      schedules: scheduleText(oldSchedules),
    };
    const proposed: Record<string, string> = {
      ...next,
      schedules: scheduleText(next.schedules),
    } as any;

    const fieldChanges = Object.keys(FIELD_LABELS)
      .filter((k) => current[k] !== proposed[k])
      .map((k) => ({
        field: k,
        label: FIELD_LABELS[k],
        before: current[k] || "—",
        after: proposed[k] || "—",
      }));

    // ---- Roster diff ----
    const existingByNumber = new Map(
      section.sectionStudents.map((ss) => [ss.student.studentNumber, ss])
    );
    const added: any[] = [];
    const updated: any[] = [];
    const unchanged: string[] = [];
    const removed: any[] = [];

    if (incomingStudents) {
      const seen = new Set<string>();
      for (const st of incomingStudents) {
        const studentNumber = str(st.studentNumber);
        if (!studentNumber || seen.has(studentNumber)) continue;
        seen.add(studentNumber);
        const row = {
          studentNumber,
          displayName: str(st.displayName) || `Student ${studentNumber}`,
          course: str(st.course),
          strand: str(st.strand),
          gender: str(st.gender),
          email: str(st.email),
          dateEnrolled: str(st.dateEnrolled),
          status: str(st.status),
        };
        const ex = existingByNumber.get(studentNumber);
        if (!ex) {
          added.push(row);
          continue;
        }
        const diffs: string[] = [];
        const cmp = (label: string, a: string, b: string) => {
          if (a !== b) diffs.push(`${label}: ${a || "—"} → ${b || "—"}`);
        };
        cmp("Name", ex.student.displayName, row.displayName);
        cmp("Course", str(ex.student.course), row.course);
        cmp("Strand", str(ex.student.strand), row.strand);
        cmp("Gender", str(ex.student.gender), row.gender);
        cmp("Email", str(ex.student.email), row.email);
        cmp("Date Enrolled", str(ex.dateEnrolled), row.dateEnrolled);
        cmp("Status", str(ex.enrollmentStatus), row.status);
        if (diffs.length > 0) updated.push({ ...row, changes: diffs });
        else unchanged.push(studentNumber);
      }
      for (const ss of section.sectionStudents) {
        if (!seen.has(ss.student.studentNumber)) {
          removed.push({
            studentNumber: ss.student.studentNumber,
            displayName: ss.student.displayName,
            hasGrades: Boolean(ss.finalGrade),
          });
        }
      }
    }

    const summary = {
      fieldChanges,
      rosterIncluded: Boolean(incomingStudents),
      added,
      updated,
      removed,
      unchangedCount: unchanged.length,
      removeMissing,
    };

    if (mode === "preview") {
      return NextResponse.json({ success: true, mode, summary });
    }

    // ---- Execute ----
    const parsedLimit = parseInt(next.classLimit, 10);
    await prisma.section.update({
      where: { id },
      data: {
        subjectName: next.subjectName,
        subjectCode: next.subjectCode || null,
        sectionName: next.sectionName,
        instructor: next.instructor || null,
        offeredTo: next.offeredTo || null,
        classLimit: Number.isFinite(parsedLimit) ? parsedLimit : null,
        academicYear: next.academicYear,
        term: next.term,
        schedules: next.schedules.length > 0 ? JSON.stringify(next.schedules) : null,
      },
    });

    const upsertStudent = async (row: any) => {
      const data = {
        displayName: row.displayName,
        course: row.course || null,
        strand: row.strand || null,
        gender: row.gender || null,
        email: row.email || null,
      };
      return prisma.student.upsert({
        where: { studentNumber: row.studentNumber },
        update: data,
        create: { studentNumber: row.studentNumber, ...data },
      });
    };

    const BATCH = 8;
    for (let i = 0; i < added.length; i += BATCH) {
      await Promise.all(
        added.slice(i, i + BATCH).map(async (row) => {
          const student = await upsertStudent(row);
          const hash = await hashPassword(generateStudentPassword());
          await prisma.sectionStudent.upsert({
            where: { sectionId_studentId: { sectionId: id, studentId: student.id } },
            update: {
              dateEnrolled: row.dateEnrolled || null,
              enrollmentStatus: row.status || null,
            },
            create: {
              sectionId: id,
              studentId: student.id,
              credentialHash: hash,
              credentialStatus: "ACTIVE",
              dateEnrolled: row.dateEnrolled || null,
              enrollmentStatus: row.status || null,
            },
          });
        })
      );
    }

    for (let i = 0; i < updated.length; i += BATCH) {
      await Promise.all(
        updated.slice(i, i + BATCH).map(async (row) => {
          const student = await upsertStudent(row);
          await prisma.sectionStudent.update({
            where: { sectionId_studentId: { sectionId: id, studentId: student.id } },
            data: {
              dateEnrolled: row.dateEnrolled || null,
              enrollmentStatus: row.status || null,
            },
          });
        })
      );
    }

    if (removeMissing && removed.length > 0) {
      await prisma.sectionStudent.deleteMany({
        where: {
          sectionId: id,
          student: { studentNumber: { in: removed.map((r) => r.studentNumber) } },
        },
      });
    }

    await recordAuditLog({
      actorId: session.id,
      actorEmail: session.email,
      action: "SECTION_DETAILS_UPDATED",
      targetType: "SECTION",
      targetId: id,
      metadata: {
        sectionCode: section.sectionCode,
        fieldChanges: fieldChanges.map((f) => f.field),
        added: added.length,
        updated: updated.length,
        removed: removeMissing ? removed.length : 0,
      },
    });

    if (section.status === "PUBLISHED") {
      generateSectionSnapshots(id).catch((err) =>
        console.error("Failed to refresh snapshots after details update:", err)
      );
    }

    serverCache.delete(`prof_section_${id}`);
    serverCache.invalidatePrefix("prof_sections_");
    serverCache.invalidatePrefix("sec_meta_");
    serverCache.invalidatePrefix("admin_");

    return NextResponse.json({
      success: true,
      mode,
      summary,
      applied: {
        added: added.length,
        updated: updated.length,
        removed: removeMissing ? removed.length : 0,
      },
    });
  } catch (error) {
    console.error("Section details update error:", error);
    return NextResponse.json({ error: "Failed to update section details" }, { status: 500 });
  }
}
