"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  Eye,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  categorizeGradeItems,
  ItemBucket,
  ItemPeriod,
  ItemType,
  parseItemTypeAndPeriod,
  WeightConfig,
} from "@/lib/grade-calculator";

export interface ScoreGridItem {
  id: string;
  name: string;
  category: string | null;
  maxScore: number;
}

export interface ScoreGridStudent {
  id: string;
  student: {
    id: string;
    studentNumber: string;
    displayName: string;
  };
  finalGrade: string | null;
  finalGradeStatus: string | null;
  remarks: string | null;
  credentialStatus: string;
  gradeRecords: Array<{
    gradeItemId: string;
    score: number | null;
    status: string;
  }>;
}

interface ScoreGridProps {
  sectionId: string;
  sectionCode: string;
  subjectName: string;
  isPublished: boolean;
  weights: WeightConfig;
  gradeItems: ScoreGridItem[];
  students: ScoreGridStudent[];
  getMidtermGrade: (student: ScoreGridStudent) => string;
  getFinalGrade: (student: ScoreGridStudent) => string;
  onScoreOptimisticChange: (
    sectionStudentId: string,
    gradeItemId: string,
    score: number | null
  ) => void;
  onStructureChanged: () => Promise<void>;
  onSelectStudentBreakdown: (student: ScoreGridStudent) => void;
}

type GroupFilter = "ALL" | "CP_MID" | "CP_FIN" | "EA_MID" | "EA_FIN" | "PT";

const QUICK_PRESETS: Array<{
  label: string;
  name: string;
  type: ItemType;
  period: ItemPeriod;
  maxScore: number;
}> = [
  { label: "Q1", name: "Q1", type: "CP", period: "MIDTERMS", maxScore: 20 },
  { label: "Q2", name: "Q2", type: "CP", period: "MIDTERMS", maxScore: 20 },
  { label: "SW1", name: "SW1", type: "CP", period: "MIDTERMS", maxScore: 20 },
  { label: "L1", name: "L1", type: "EA", period: "MIDTERMS", maxScore: 50 },
  { label: "L2", name: "L2", type: "EA", period: "MIDTERMS", maxScore: 50 },
  { label: "Q3 (Fin)", name: "Q3", type: "CP", period: "POST_MIDTERMS", maxScore: 20 },
  { label: "L3 (Fin)", name: "L3", type: "EA", period: "POST_MIDTERMS", maxScore: 50 },
  { label: "MPT", name: "MPT", type: "MPT", period: "MIDTERMS", maxScore: 100 },
  { label: "CPT", name: "CPT", type: "CPT", period: "POST_MIDTERMS", maxScore: 100 },
  { label: "Bonus", name: "Bonus", type: "BONUS", period: "POST_MIDTERMS", maxScore: 5 },
];

const BUCKET_META: Record<
  ItemBucket,
  { shortLabel: string; groupTitle: string; headerBg: string; badgeCls: string }
> = {
  cpMid: {
    shortLabel: "CP • Mid",
    groupTitle: "CP • Midterms (Wk 1–7)",
    headerBg: "bg-teal-50/90 text-teal-950 border-teal-200",
    badgeCls: "bg-teal-100 text-teal-900 border-teal-200",
  },
  cpFin: {
    shortLabel: "CP • Post",
    groupTitle: "CP • Post-Midterms (Wk 8–13)",
    headerBg: "bg-teal-50/60 text-teal-900 border-teal-200",
    badgeCls: "bg-teal-50 text-teal-800 border-teal-200",
  },
  eaMid: {
    shortLabel: "EA • Mid",
    groupTitle: "EA • Midterms (Wk 1–7)",
    headerBg: "bg-indigo-50/90 text-indigo-950 border-indigo-200",
    badgeCls: "bg-indigo-100 text-indigo-900 border-indigo-200",
  },
  eaFin: {
    shortLabel: "EA • Post",
    groupTitle: "EA • Post-Midterms (Wk 8–13)",
    headerBg: "bg-indigo-50/60 text-indigo-900 border-indigo-200",
    badgeCls: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
  mpt: {
    shortLabel: "MPT",
    groupTitle: "Major PT",
    headerBg: "bg-blue-50/90 text-blue-950 border-blue-200",
    badgeCls: "bg-blue-100 text-blue-900 border-blue-200",
  },
  cpt: {
    shortLabel: "CPT",
    groupTitle: "Culminating PT",
    headerBg: "bg-purple-50/90 text-purple-950 border-purple-200",
    badgeCls: "bg-purple-100 text-purple-900 border-purple-200",
  },
  bonus: {
    shortLabel: "Bonus",
    groupTitle: "Bonus",
    headerBg: "bg-emerald-50/90 text-emerald-950 border-emerald-200",
    badgeCls: "bg-emerald-100 text-emerald-900 border-emerald-200",
  },
};

export function ScoreGrid({
  sectionId,
  isPublished,
  gradeItems,
  students,
  getMidtermGrade,
  getFinalGrade,
  onScoreOptimisticChange,
  onStructureChanged,
  onSelectStudentBreakdown,
}: ScoreGridProps) {
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("ALL");
  const [focusedItemId, setFocusedItemId] = useState<string>("ALL");

  // Save status indicator
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string>("");

  // Local draft strings while a cell is focused so typing "1", "1.", "1.5" or "" feels natural
  const [draftCells, setDraftCells] = useState<Record<string, string>>({});
  const lastSavedRef = useRef<Record<string, string>>({});

  // Add / Edit Column Modal State
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScoreGridItem | null>(null);
  const [colTitle, setColTitle] = useState("");
  const [colType, setColType] = useState<ItemType>("CP");
  const [colPeriod, setColPeriod] = useState<ItemPeriod>("MIDTERMS");
  const [colMaxScore, setColMaxScore] = useState("20");
  const [colError, setColError] = useState("");
  const [isSavingCol, setIsSavingCol] = useState(false);
  const [confirmDeleteCol, setConfirmDeleteCol] = useState(false);

  // Organize columns in logical order: CP Mid -> CP Fin -> EA Mid -> EA Fin -> MPT -> CPT -> Bonus
  const orderedColumns = useMemo(() => {
    const cat = categorizeGradeItems(gradeItems);
    const list: Array<{ item: ScoreGridItem; bucket: ItemBucket }> = [];
    cat.cpMid.forEach((item) => list.push({ item, bucket: "cpMid" }));
    cat.cpFin.forEach((item) => list.push({ item, bucket: "cpFin" }));
    cat.eaMid.forEach((item) => list.push({ item, bucket: "eaMid" }));
    cat.eaFin.forEach((item) => list.push({ item, bucket: "eaFin" }));
    if (cat.mpt) list.push({ item: cat.mpt, bucket: "mpt" });
    if (cat.cpt) list.push({ item: cat.cpt, bucket: "cpt" });
    if (cat.bonus) list.push({ item: cat.bonus, bucket: "bonus" });
    return list;
  }, [gradeItems]);

  const visibleColumns = useMemo(() => {
    let cols = orderedColumns;
    if (focusedItemId !== "ALL") {
      return cols.filter((c) => c.item.id === focusedItemId);
    }
    if (groupFilter === "CP_MID") cols = cols.filter((c) => c.bucket === "cpMid");
    else if (groupFilter === "CP_FIN") cols = cols.filter((c) => c.bucket === "cpFin");
    else if (groupFilter === "EA_MID") cols = cols.filter((c) => c.bucket === "eaMid");
    else if (groupFilter === "EA_FIN") cols = cols.filter((c) => c.bucket === "eaFin");
    else if (groupFilter === "PT")
      cols = cols.filter((c) => c.bucket === "mpt" || c.bucket === "cpt" || c.bucket === "bonus");
    return cols;
  }, [orderedColumns, groupFilter, focusedItemId]);

  const openAddColumn = () => {
    setEditingItem(null);
    setColTitle("");
    setColType("CP");
    setColPeriod("MIDTERMS");
    setColMaxScore("20");
    setColError("");
    setConfirmDeleteCol(false);
    setColumnModalOpen(true);
  };

  const openEditColumn = (item: ScoreGridItem) => {
    const parsed = parseItemTypeAndPeriod(item);
    setEditingItem(item);
    setColTitle(item.name);
    setColType(parsed.type);
    setColPeriod(parsed.period);
    setColMaxScore(String(item.maxScore || 20));
    setColError("");
    setConfirmDeleteCol(false);
    setColumnModalOpen(true);
  };

  const handleSaveColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    setColError("");
    const trimmed = colTitle.trim();
    if (!trimmed) {
      setColError("Please enter a column title (e.g. Q1, Quiz 1, L1).");
      return;
    }
    const maxNum = Number(colMaxScore);
    if (colType !== "BONUS" && (!Number.isFinite(maxNum) || maxNum <= 0)) {
      setColError("Highest Possible Score (HPS) must be greater than 0.");
      return;
    }

    setIsSavingCol(true);
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingItem
            ? {
                action: "update_item",
                itemId: editingItem.id,
                name: trimmed,
                type: colType,
                period: colPeriod,
                maxScore: maxNum,
              }
            : {
                action: "create_item",
                name: trimmed,
                type: colType,
                period: colPeriod,
                maxScore: maxNum,
              }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setColError(data.error || "Failed to save column.");
        setIsSavingCol(false);
        return;
      }
      setColumnModalOpen(false);
      await onStructureChanged();
    } catch {
      setColError("Network error while saving column.");
    } finally {
      setIsSavingCol(false);
    }
  };

  const handleDeleteColumn = async () => {
    if (!editingItem) return;
    setIsSavingCol(true);
    setColError("");
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_item",
          itemId: editingItem.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setColError(data.error || "Failed to delete column.");
        setIsSavingCol(false);
        return;
      }
      if (focusedItemId === editingItem.id) setFocusedItemId("ALL");
      setColumnModalOpen(false);
      await onStructureChanged();
    } catch {
      setColError("Network error while deleting column.");
    } finally {
      setIsSavingCol(false);
    }
  };

  // Persist a single cell score
  const commitCellScore = async (
    student: ScoreGridStudent,
    item: ScoreGridItem,
    bucket: ItemBucket,
    rawInput: string
  ) => {
    const key = `${student.id}_${item.id}`;
    const trimmed = rawInput.trim();

    const existingRec = student.gradeRecords.find((r) => r.gradeItemId === item.id);
    const currentScore =
      existingRec && existingRec.score !== null && existingRec.score !== undefined
        ? String(existingRec.score)
        : "";

    // Clear draft override once committed
    setDraftCells((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (trimmed === currentScore && lastSavedRef.current[key] === trimmed) {
      return;
    }

    let parsedScore: number | null = null;
    if (trimmed !== "") {
      const num = Number(trimmed);
      if (!Number.isFinite(num) || num < 0) {
        setSaveState("error");
        setSaveError(`Invalid score "${trimmed}" for ${item.name}. Must be 0 or higher.`);
        return;
      }
      if (bucket !== "bonus" && item.maxScore > 0 && num > item.maxScore) {
        setSaveState("error");
        setSaveError(`${item.name}: score (${num}) cannot exceed HPS (${item.maxScore}).`);
        return;
      }
      parsedScore = Math.round(num * 100) / 100;
    }

    lastSavedRef.current[key] = parsedScore !== null ? String(parsedScore) : "";
    onScoreOptimisticChange(student.id, item.id, parsedScore);

    setSaveState("saving");
    setSaveError("");
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_scores",
          entries: [
            {
              sectionStudentId: student.id,
              gradeItemId: item.id,
              score: parsedScore,
            },
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveState("error");
        setSaveError(data.error || "Failed to save score.");
        return;
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
      setSaveError("Network error while saving score.");
    }
  };

  // Keyboard navigation across the grid (Enter/ArrowDown/ArrowUp/Tab)
  const focusCell = (rowIdx: number, colIdx: number) => {
    const el = document.querySelector<HTMLInputElement>(
      `input[data-grid-row="${rowIdx}"][data-grid-col="${colIdx}"]`
    );
    if (el) {
      el.focus();
      el.select();
    }
  };

  const getCellTone = (score: number | null | undefined, maxScore: number, bucket: ItemBucket) => {
    if (score === null || score === undefined) {
      return "bg-white border-slate-200 text-slate-700 focus:border-slate-900 focus:ring-slate-900";
    }
    if (bucket === "bonus") {
      return score > 0
        ? "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-bold"
        : "bg-white border-slate-200 text-slate-700";
    }
    if (maxScore <= 0) return "bg-white border-slate-200 text-slate-900 font-semibold";
    const pct = (score / maxScore) * 100;
    if (pct >= 100) {
      return "bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold";
    }
    if (pct < 60) {
      return "bg-rose-50/80 border-rose-300 text-rose-900 font-bold";
    }
    return "bg-white border-slate-300 text-slate-900 font-semibold";
  };

  return (
    <div className="space-y-3">
      {/* Live Published Banner */}
      {isPublished && (
        <div className="rounded-xl bg-blue-50/80 border border-blue-200 px-4 py-2.5 text-xs text-blue-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
            <span>
              <strong>Live Published Section:</strong> Scores entered here automatically update students&apos; published grade reports.
            </span>
          </div>
        </div>
      )}

      {/* Score Grid Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["ALL", `All (${orderedColumns.length})`],
              ["CP_MID", "CP • Mid"],
              ["CP_FIN", "CP • Post-Mid"],
              ["EA_MID", "EA • Mid"],
              ["EA_FIN", "EA • Post-Mid"],
              ["PT", "PT & Bonus"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFocusedItemId("ALL");
                setGroupFilter(key);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                focusedItemId === "ALL" && groupFilter === key
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}

          {orderedColumns.length > 0 && (
            <select
              value={focusedItemId}
              onChange={(e) => setFocusedItemId(e.target.value)}
              className="ml-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
              title="Focus on a single column for rapid vertical entry"
            >
              <option value="ALL">Focus column: All visible</option>
              {orderedColumns.map(({ item, bucket }) => (
                <option key={item.id} value={item.id}>
                  Focus: {item.name} ({BUCKET_META[bucket].shortLabel}, /{item.maxScore})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          {/* Save status indicator */}
          <div className="text-xs flex items-center gap-1.5">
            {saveState === "saving" && (
              <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                Saving...
              </span>
            )}
            {saveState === "saved" && (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                {saveError || "Save failed"}
              </span>
            )}
            {saveState === "idle" && (
              <span className="text-[11px] text-slate-400">
                Enter moves down &bull; Tab moves right &bull; Auto-saves
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={openAddColumn}
            className="gap-1.5 text-xs font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Column</span>
          </Button>
        </div>
      </div>

      {/* Empty Columns State */}
      {orderedColumns.length === 0 ? (
        <Card className="border border-dashed border-slate-300 rounded-xl bg-white p-10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No Assessment Columns Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add your first column (such as <strong>Q1</strong>, <strong>Quiz 1</strong>, <strong>L1</strong>, or <strong>MPT</strong>) to start entering scores directly in the grid, or import an existing grading sheet.
            </p>
          </div>
          <div>
            <Button size="sm" variant="primary" onClick={openAddColumn} className="gap-1.5 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Column (e.g. Q1)</span>
            </Button>
          </div>
        </Card>
      ) : (
        /* Main Spreadsheet Grid */
        <Card className="border border-slate-200/90 shadow-xs overflow-hidden rounded-xl bg-white">
          <div className="overflow-x-auto relative">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 sticky top-0 z-20 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 min-w-[220px] sticky left-0 z-30 bg-slate-50 border-r border-slate-200 font-semibold text-slate-700">
                    Student
                  </th>

                  {visibleColumns.map(({ item, bucket }) => {
                    const meta = BUCKET_META[bucket];
                    return (
                      <th
                        key={item.id}
                        className={`px-2.5 py-2.5 min-w-[96px] text-center border-r border-slate-200 ${meta.headerBg}`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${meta.badgeCls}`}
                          >
                            {meta.shortLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditColumn(item)}
                            className="p-0.5 rounded hover:bg-black/5 text-slate-500 hover:text-slate-900 cursor-pointer"
                            title={`Edit or delete "${item.name}"`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="font-bold text-slate-900 truncate max-w-[110px] mx-auto" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 font-normal">
                          {bucket === "bonus" ? `Bonus (+pts)` : `/ ${item.maxScore}`}
                        </div>
                      </th>
                    );
                  })}

                  <th className="px-3.5 py-3 min-w-[125px] text-center bg-slate-100/90 border-l border-slate-200 font-semibold text-slate-700">
                    Midterm
                  </th>
                  <th className="px-3.5 py-3 min-w-[125px] text-center bg-blue-50/70 border-l border-slate-200 font-semibold text-blue-950">
                    Final Grade
                  </th>
                  <th className="px-3 py-3 w-12 text-center bg-slate-50 border-l border-slate-200 font-semibold text-slate-500">
                    View
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length + 4}
                      className="px-5 py-10 text-center text-slate-400"
                    >
                      No matching students in this section.
                    </td>
                  </tr>
                ) : (
                  students.map((ss, rowIdx) => {
                    const midtermGrade = getMidtermGrade(ss);
                    const finalGrade = getFinalGrade(ss);

                    return (
                      <tr key={ss.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Sticky Student Cell */}
                        <td className="px-4 py-2 sticky left-0 z-10 bg-white border-r border-slate-200">
                          <div className="font-semibold text-slate-900 truncate max-w-[210px]">
                            {ss.student.displayName}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {ss.student.studentNumber}
                          </div>
                        </td>

                        {/* Editable Assessment Cells */}
                        {visibleColumns.map(({ item, bucket }, colIdx) => {
                          const cellKey = `${ss.id}_${item.id}`;
                          const rec = ss.gradeRecords.find((r) => r.gradeItemId === item.id);
                          const numScore = rec?.score ?? null;
                          const displayValue =
                            draftCells[cellKey] !== undefined
                              ? draftCells[cellKey]
                              : numScore !== null && numScore !== undefined
                              ? String(numScore)
                              : "";

                          const toneCls = getCellTone(numScore, item.maxScore, bucket);

                          return (
                            <td
                              key={item.id}
                              className="px-1.5 py-1.5 text-center border-r border-slate-100"
                            >
                              <input
                                type="text"
                                inputMode="decimal"
                                data-grid-row={rowIdx}
                                data-grid-col={colIdx}
                                value={displayValue}
                                placeholder="—"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDraftCells((prev) => ({ ...prev, [cellKey]: val }));
                                  // Live optimistic update as user types valid numbers
                                  const trimmed = val.trim();
                                  if (trimmed === "") {
                                    onScoreOptimisticChange(ss.id, item.id, null);
                                  } else {
                                    const parsed = Number(trimmed);
                                    if (
                                      Number.isFinite(parsed) &&
                                      parsed >= 0 &&
                                      (bucket === "bonus" || parsed <= item.maxScore)
                                    ) {
                                      onScoreOptimisticChange(ss.id, item.id, parsed);
                                    }
                                  }
                                }}
                                onBlur={(e) => commitCellScore(ss, item, bucket, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === "ArrowDown") {
                                    e.preventDefault();
                                    commitCellScore(ss, item, bucket, e.currentTarget.value);
                                    focusCell(rowIdx + 1, colIdx);
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    commitCellScore(ss, item, bucket, e.currentTarget.value);
                                    focusCell(Math.max(0, rowIdx - 1), colIdx);
                                  }
                                }}
                                className={`w-16 sm:w-20 px-2 py-1 text-center font-mono text-xs rounded-md border focus:outline-none focus:ring-2 transition-colors ${toneCls}`}
                              />
                            </td>
                          );
                        })}

                        {/* Live Midterm Standing */}
                        <td className="px-3 py-2 text-center font-mono border-l border-slate-200 bg-slate-50/40">
                          {midtermGrade !== "-" ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] border ${
                                midtermGrade.startsWith("R")
                                  ? "bg-amber-50 text-amber-900 border-amber-200"
                                  : "bg-slate-100 text-slate-800 border-slate-200"
                              }`}
                            >
                              {midtermGrade}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Live Final Grade Standing */}
                        <td className="px-3 py-2 text-center font-mono border-l border-slate-200 bg-blue-50/20">
                          {finalGrade !== "-" ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                                finalGrade.startsWith("R")
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : "bg-blue-50 text-blue-900 border-blue-200"
                              }`}
                            >
                              {finalGrade}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Open Breakdown */}
                        <td className="px-2 py-2 text-center border-l border-slate-100">
                          <button
                            type="button"
                            onClick={() => onSelectStudentBreakdown(ss)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                            title="View student breakdown"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Assessment Column Modal */}
      <Modal
        isOpen={columnModalOpen}
        onClose={() => {
          if (!isSavingCol) setColumnModalOpen(false);
        }}
        title={editingItem ? `Edit Column "${editingItem.name}"` : "Add Assessment Column"}
        description="Set the column title (e.g. Q1, Quiz 1, L1), component type, grading period, and highest possible score (HPS)."
      >
        <form onSubmit={handleSaveColumn} className="space-y-4 text-xs">
          {colError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-800 font-medium">
              {colError}
            </div>
          )}

          {/* Quick 1-click presets when adding a new column */}
          {!editingItem && (
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setColTitle(preset.name);
                      setColType(preset.type);
                      setColPeriod(preset.period);
                      setColMaxScore(String(preset.maxScore));
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Column Title *
              </label>
              <input
                type="text"
                required
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                placeholder="e.g. Q1, Quiz 1, SW1, L1, MPT"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Component Type *
              </label>
              <select
                value={colType}
                onChange={(e) => {
                  const nextType = e.target.value as ItemType;
                  setColType(nextType);
                  if (nextType === "MPT") setColPeriod("MIDTERMS");
                  if (nextType === "CPT") setColPeriod("POST_MIDTERMS");
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
              >
                <option value="CP">CP — Class Participation (Quiz / SW)</option>
                <option value="EA">EA — Enabling Activity (Lab / Task)</option>
                <option value="MPT">MPT — Major Performance Task</option>
                <option value="CPT">CPT — Culminating Performance Task</option>
                <option value="BONUS">Bonus Points</option>
              </select>
            </div>

            {(colType === "CP" || colType === "EA") ? (
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Grading Period *
                </label>
                <select
                  value={colPeriod}
                  onChange={(e) => setColPeriod(e.target.value as ItemPeriod)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                >
                  <option value="MIDTERMS">Midterms (Weeks 1–7)</option>
                  <option value="POST_MIDTERMS">Post-Midterms (Weeks 8–13)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Grading Period
                </label>
                <div className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600 font-medium">
                  {colType === "MPT"
                    ? "Midterm & Cumulative Final"
                    : colType === "CPT"
                    ? "Finals (Cumulative)"
                    : "Direct Bonus Add"}
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {colType === "BONUS" ? "Max Bonus Points" : "Highest Possible Score (HPS) *"}
              </label>
              <input
                type="number"
                min={1}
                step="any"
                required
                value={colMaxScore}
                onChange={(e) => setColMaxScore(e.target.value)}
                placeholder="e.g. 20, 50, 100"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono font-semibold"
              />
            </div>
          </div>

          {editingItem && (
            <div className="pt-2 border-t border-slate-100">
              {!confirmDeleteCol ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCol(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete this column and its recorded scores...</span>
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
                  <span className="text-rose-900 font-medium">
                    Delete <strong>{editingItem.name}</strong> and all scores in this column?
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDeleteCol(false)}
                      disabled={isSavingCol}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteColumn}
                      isLoading={isSavingCol}
                    >
                      Confirm Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setColumnModalOpen(false)}
              disabled={isSavingCol}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="primary" isLoading={isSavingCol}>
              {editingItem ? "Save Changes" : "Add Column"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
