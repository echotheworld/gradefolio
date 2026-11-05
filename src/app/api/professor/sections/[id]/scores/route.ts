import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { serverCache } from "@/lib/server-cache";
import { generateSectionSnapshots } from "@/lib/snapshot";
import {
  classifyGradeItem,
  computeStudentGradesFromItems,
  formatCategoryString,
  ItemPeriod,
  ItemType,
  parseWeightConfig,
} from "@/lib/grade-calculator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function recomputeSectionStanding(sectionId: string, onlyStudentIds?: string[]) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      gradeItems: { orderBy: { displayOrder: "asc" } },
      sectionStudents: {
        where: onlyStudentIds && onlyStudentIds.length > 0 ? { id: { in: onlyStudentIds } } : undefined,
        include: { gradeRecords: true },
      },
    },
  });
  if (!section) return;

  const weights = parseWeightConfig(section.weightConfig);
  const assessmentItems = section.gradeItems.filter((gi) => classifyGradeItem(gi) !== null);
  if (assessmentItems.length === 0) return;

  const BATCH = 10;
  for (let i = 0; i < section.sectionStudents.length; i += BATCH) {
    const chunk = section.sectionStudents.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (ss) => {
        const res = computeStudentGradesFromItems(
          assessmentItems,
          ss.gradeRecords,
          weights,
          section.subjectName
        );
        await prisma.sectionStudent.update({
          where: { id: ss.id },
          data: {
            finalGrade: res.hasRecorded ? res.finalGrade : null,
            finalGradeStatus: res.hasRecorded ? "FINAL" : "PROVISIONAL",
            remarks: res.hasRecorded ? res.remarks : null,
          },
        });
      })
    );
  }
}

// POST /api/professor/sections/[id]/scores
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || (session.role !== "PROFESSOR" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const section = await prisma.section.findUnique({
      where: { id },
      include: { gradeItems: { orderBy: { displayOrder: "asc" } } },
    });
    if (!section) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }
    if (session.role !== "SUPER_ADMIN" && section.ownerProfessorId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const action = String(body.action || "");

    if (action === "create_item") {
      const name = String(body.name || "").trim();
      const type = (String(body.type || "CP").toUpperCase() as ItemType) || "CP";
      const period = (String(body.period || "MIDTERMS").toUpperCase() as ItemPeriod) || "MIDTERMS";
      const rawMax = Number(body.maxScore);
      const maxScore = type === "BONUS" ? (rawMax > 0 ? rawMax : 10) : rawMax > 0 ? rawMax : 100;

      if (!name) {
        return NextResponse.json({ error: "Column title is required (e.g. Q1, Quiz 1, L1)." }, { status: 400 });
      }
      if (type !== "BONUS" && (!Number.isFinite(rawMax) || rawMax <= 0)) {
        return NextResponse.json({ error: "Highest Possible Score (HPS) must be greater than 0." }, { status: 400 });
      }

      const dup = section.gradeItems.find((gi) => gi.name.trim().toLowerCase() === name.toLowerCase());
      if (dup) {
        return NextResponse.json(
          { error: `An assessment column named "${name}" already exists in this section.` },
          { status: 400 }
        );
      }

      if (type === "MPT" || type === "CPT" || type === "BONUS") {
        const targetBucket = type.toLowerCase();
        const existingSingle = section.gradeItems.find((gi) => classifyGradeItem(gi) === targetBucket);
        if (existingSingle) {
          return NextResponse.json(
            {
              error: `This section already has a ${type} column ("${existingSingle.name}"). Edit that column instead of adding a duplicate.`,
            },
            { status: 400 }
          );
        }
      }

      const category = formatCategoryString(type, period);
      const maxOrder = section.gradeItems.reduce((m, gi) => Math.max(m, gi.displayOrder || 0), 0);

      const created = await prisma.gradeItem.create({
        data: {
          sectionId: id,
          name,
          category,
          maxScore,
          displayOrder: maxOrder + 1,
        },
      });

      await recomputeSectionStanding(id);
      if (section.status === "PUBLISHED") {
        generateSectionSnapshots(id).catch((err) =>
          console.error("Failed to refresh snapshots after item create:", err)
        );
      }
      serverCache.delete(`prof_section_${id}`);
      serverCache.invalidatePrefix("prof_sections_");

      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: "GRADE_ITEM_CREATED",
        targetType: "SECTION",
        targetId: id,
        metadata: { sectionCode: section.sectionCode, itemName: name, category, maxScore },
      });

      return NextResponse.json({ success: true, item: created });
    }

    if (action === "update_item") {
      const itemId = String(body.itemId || "");
      const existing = section.gradeItems.find((gi) => gi.id === itemId);
      if (!existing) {
        return NextResponse.json({ error: "Assessment column not found." }, { status: 404 });
      }

      const name = String(body.name ?? existing.name).trim();
      const type = (String(body.type || "CP").toUpperCase() as ItemType) || "CP";
      const period = (String(body.period || "MIDTERMS").toUpperCase() as ItemPeriod) || "MIDTERMS";
      const rawMax = Number(body.maxScore ?? existing.maxScore);
      const maxScore = type === "BONUS" ? (rawMax > 0 ? rawMax : 10) : rawMax > 0 ? rawMax : existing.maxScore;

      if (!name) {
        return NextResponse.json({ error: "Column title cannot be empty." }, { status: 400 });
      }

      const dup = section.gradeItems.find(
        (gi) => gi.id !== itemId && gi.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (dup) {
        return NextResponse.json(
          { error: `Another column named "${name}" already exists.` },
          { status: 400 }
        );
      }

      if (type === "MPT" || type === "CPT" || type === "BONUS") {
        const targetBucket = type.toLowerCase();
        const existingSingle = section.gradeItems.find(
          (gi) => gi.id !== itemId && classifyGradeItem(gi) === targetBucket
        );
        if (existingSingle) {
          return NextResponse.json(
            { error: `Another ${type} column ("${existingSingle.name}") already exists.` },
            { status: 400 }
          );
        }
      }

      const category = formatCategoryString(type, period);
      const updated = await prisma.gradeItem.update({
        where: { id: itemId },
        data: { name, category, maxScore },
      });

      await recomputeSectionStanding(id);
      if (section.status === "PUBLISHED") {
        generateSectionSnapshots(id).catch((err) =>
          console.error("Failed to refresh snapshots after item update:", err)
        );
      }
      serverCache.delete(`prof_section_${id}`);
      serverCache.invalidatePrefix("prof_sections_");

      return NextResponse.json({ success: true, item: updated });
    }

    if (action === "delete_item") {
      const itemId = String(body.itemId || "");
      const existing = section.gradeItems.find((gi) => gi.id === itemId);
      if (!existing) {
        return NextResponse.json({ error: "Assessment column not found." }, { status: 404 });
      }

      await prisma.gradeItem.delete({ where: { id: itemId } });

      await recomputeSectionStanding(id);
      if (section.status === "PUBLISHED") {
        generateSectionSnapshots(id).catch((err) =>
          console.error("Failed to refresh snapshots after item delete:", err)
        );
      }
      serverCache.delete(`prof_section_${id}`);
      serverCache.invalidatePrefix("prof_sections_");

      await recordAuditLog({
        actorId: session.id,
        actorEmail: session.email,
        action: "GRADE_ITEM_DELETED",
        targetType: "SECTION",
        targetId: id,
        metadata: { sectionCode: section.sectionCode, itemName: existing.name },
      });

      return NextResponse.json({ success: true });
    }

    if (action === "save_scores") {
      const entries: Array<{ sectionStudentId: string; gradeItemId: string; score: number | null }> =
        Array.isArray(body.entries) ? body.entries : [];

      if (entries.length === 0) {
        return NextResponse.json({ error: "No score entries provided." }, { status: 400 });
      }

      const itemById = new Map(section.gradeItems.map((gi) => [gi.id, gi]));
      const touchedStudents = new Set<string>();

      for (const entry of entries) {
        const item = itemById.get(entry.gradeItemId);
        if (!item) continue;

        let scoreVal: number | null = null;
        if (entry.score !== null && entry.score !== undefined && String(entry.score).trim() !== "") {
          const n = Number(entry.score);
          if (!Number.isFinite(n) || n < 0) {
            return NextResponse.json(
              { error: `Invalid score for "${item.name}". Score must be 0 or higher.` },
              { status: 400 }
            );
          }
          const isBonus = classifyGradeItem(item) === "bonus";
          if (!isBonus && item.maxScore > 0 && n > item.maxScore) {
            return NextResponse.json(
              { error: `Score (${n}) cannot exceed HPS (${item.maxScore}) for "${item.name}".` },
              { status: 400 }
            );
          }
          scoreVal = Math.round(n * 100) / 100;
        }

        touchedStudents.add(entry.sectionStudentId);

        await prisma.gradeRecord.upsert({
          where: {
            sectionStudentId_gradeItemId: {
              sectionStudentId: entry.sectionStudentId,
              gradeItemId: entry.gradeItemId,
            },
          },
          create: {
            sectionStudentId: entry.sectionStudentId,
            gradeItemId: entry.gradeItemId,
            score: scoreVal,
            status: scoreVal !== null ? "RECORDED" : "NOT_RECORDED",
          },
          update: {
            score: scoreVal,
            status: scoreVal !== null ? "RECORDED" : "NOT_RECORDED",
          },
        });
      }

      await recomputeSectionStanding(id, Array.from(touchedStudents));
      await prisma.section.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      if (section.status === "PUBLISHED") {
        generateSectionSnapshots(id).catch((err) =>
          console.error("Failed to refresh snapshots after score save:", err)
        );
      }

      serverCache.delete(`prof_section_${id}`);
      serverCache.invalidatePrefix("prof_sections_");

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("Score grid API error:", error);
    return NextResponse.json({ error: "Failed to process score update." }, { status: 500 });
  }
}
