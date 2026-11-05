"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  Eye,
  Radio,
  ChevronRight,
  ChevronDown,
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

type CollapsibleGroupKey = "cpMid" | "cpFin" | "eaMid" | "eaFin";

const GROUP_CONFIG: Array<{
  key: CollapsibleGroupKey;
  title: string;
  shortTitle: string;
  type: ItemType;
  period: ItemPeriod;
  bannerCls: string;
  subHeaderCls: string;
  summaryCellCls: string;
}> = [
  {
    key: "cpMid",
    title: "CP • Midterms (Wk 1–7)",
    shortTitle: "CP Mid",
    type: "CP",
    period: "MIDTERMS",
    bannerCls: "bg-teal-600 text-white border-teal-700",
    subHeaderCls: "bg-teal-50/90 text-teal-950 border-slate-200",
    summaryCellCls: "bg-teal-50/30 text-teal-900",
  },
  {
    key: "cpFin",
    title: "CP • Post-Mid (Wk 8–13)",
    shortTitle: "CP Post",
    type: "CP",
    period: "POST_MIDTERMS",
    bannerCls: "bg-teal-700 text-white border-teal-800",
    subHeaderCls: "bg-teal-50/60 text-teal-950 border-slate-200",
    summaryCellCls: "bg-teal-50/20 text-teal-900",
  },
  {
    key: "eaMid",
    title: "EA • Midterms (Wk 1–7)",
    shortTitle: "EA Mid",
    type: "EA",
    period: "MIDTERMS",
    bannerCls: "bg-indigo-600 text-white border-indigo-700",
    subHeaderCls: "bg-indigo-50/90 text-indigo-950 border-slate-200",
    summaryCellCls: "bg-indigo-50/30 text-indigo-900",
  },
  {
    key: "eaFin",
    title: "EA • Post-Mid (Wk 8–13)",
    shortTitle: "EA Post",
    type: "EA",
    period: "POST_MIDTERMS",
    bannerCls: "bg-indigo-700 text-white border-indigo-800",
    subHeaderCls: "bg-indigo-50/60 text-indigo-950 border-slate-200",
    summaryCellCls: "bg-indigo-50/20 text-indigo-900",
  },
];

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
  // Which groups are expanded to show individual 1..7 columns vs consolidated into 1 subtotal column
  const [expandedGroups, setExpandedGroups] = useState<Record<CollapsibleGroupKey, boolean>>({
    cpMid: true,
    cpFin: false,
    eaMid: true,
    eaFin: false,
  });

  // Save status indicator
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string>("");

  // Local draft strings while a cell is focused
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

  const categorized = useMemo(() => categorizeGradeItems(gradeItems), [gradeItems]);

  const ptColumns = useMemo(() => {
    const list: Array<{ item: ScoreGridItem; bucket: ItemBucket; label: string }> = [];
    if (categorized.mpt) list.push({ item: categorized.mpt, bucket: "mpt", label: "MPT" });
    if (categorized.cpt) list.push({ item: categorized.cpt, bucket: "cpt", label: "CPT" });
    if (categorized.bonus) list.push({ item: categorized.bonus, bucket: "bonus", label: "Bonus" });
    return list;
  }, [categorized]);

  // Flat list of currently rendered editable columns in left-to-right order for keyboard Tab/Arrow navigation
  const flatEditableColumns = useMemo(() => {
    const list: Array<{ item: ScoreGridItem; bucket: ItemBucket }> = [];
    for (const grp of GROUP_CONFIG) {
      if (expandedGroups[grp.key]) {
        categorized[grp.key].forEach((item) => list.push({ item, bucket: grp.key }));
      }
    }
    ptColumns.forEach(({ item, bucket }) => list.push({ item, bucket }));
    return list;
  }, [categorized, expandedGroups, ptColumns]);

  const toggleGroup = (key: CollapsibleGroupKey) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandOnlyPeriod = (period: "MIDTERMS" | "POST_MIDTERMS" | "ALL" | "NONE") => {
    if (period === "MIDTERMS") {
      setExpandedGroups({ cpMid: true, eaMid: true, cpFin: false, eaFin: false });
    } else if (period === "POST_MIDTERMS") {
      setExpandedGroups({ cpMid: false, eaMid: false, cpFin: true, eaFin: true });
    } else if (period === "ALL") {
      setExpandedGroups({ cpMid: true, eaMid: true, cpFin: true, eaFin: true });
    } else {
      setExpandedGroups({ cpMid: false, eaMid: false, cpFin: false, eaFin: false });
    }
  };

  const openAddColumnForGroup = (type: ItemType = "CP", period: ItemPeriod = "MIDTERMS") => {
    setEditingItem(null);
    // Suggest next short number/code automatically so adding 1..7 is fast
    let existingCount = 0;
    if (type === "CP" && period === "MIDTERMS") existingCount = categorized.cpMid.length;
    else if (type === "CP" && period === "POST_MIDTERMS") existingCount = categorized.cpFin.length;
    else if (type === "EA" && period === "MIDTERMS") existingCount = categorized.eaMid.length;
    else if (type === "EA" && period === "POST_MIDTERMS") existingCount = categorized.eaFin.length;

    const suggestedName =
      type === "MPT"
        ? "MPT"
        : type === "CPT"
        ? "CPT"
        : type === "BONUS"
        ? "Bonus"
        : type === "CP"
        ? `Q${existingCount + 1}`
        : `L${existingCount + 1}`;

    setColTitle(suggestedName);
    setColType(type);
    setColPeriod(period);
    setColMaxScore(type === "MPT" || type === "CPT" ? "100" : type === "BONUS" ? "5" : type === "EA" ? "50" : "20");
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
      setColError("Please enter a column title (e.g. Q1, 1, L1).");
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
      // Make sure the group we just added to is expanded
      if (colType === "CP" && colPeriod === "MIDTERMS") setExpandedGroups((p) => ({ ...p, cpMid: true }));
      if (colType === "CP" && colPeriod === "POST_MIDTERMS") setExpandedGroups((p) => ({ ...p, cpFin: true }));
      if (colType === "EA" && colPeriod === "MIDTERMS") setExpandedGroups((p) => ({ ...p, eaMid: true }));
      if (colType === "EA" && colPeriod === "POST_MIDTERMS") setExpandedGroups((p) => ({ ...p, eaFin: true }));

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
      setColumnModalOpen(false);
      await onStructureChanged();
    } catch {
      setColError("Network error while deleting column.");
    } finally {
      setIsSavingCol(false);
    }
  };

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
        setSaveError(`Invalid score "${trimmed}" for ${item.name}.`);
        return;
      }
      if (bucket !== "bonus" && item.maxScore > 0 && num > item.maxScore) {
        setSaveState("error");
        setSaveError(`${item.name}: max score is ${item.maxScore}.`);
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
      return "bg-white border-slate-200/90 text-slate-700 focus:border-slate-900 focus:ring-1 focus:ring-slate-900";
    }
    if (bucket === "bonus") {
      return score > 0
        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
        : "bg-white border-slate-200 text-slate-700";
    }
    if (maxScore <= 0) return "bg-white border-slate-200 text-slate-900 font-semibold";
    const pct = (score / maxScore) * 100;
    if (pct >= 100) {
      return "bg-emerald-50/90 border-emerald-300 text-emerald-950 font-bold";
    }
    if (pct < 60) {
      return "bg-rose-50/90 border-rose-300 text-rose-900 font-bold";
    }
    return "bg-white border-slate-300 text-slate-900 font-semibold";
  };

  // Helper to compute a student's subtotal in a group when that group is collapsed
  const getGroupSubtotal = (student: ScoreGridStudent, items: ScoreGridItem[]) => {
    let scoreSum = 0;
    let hpsSum = 0;
    let hasAny = false;
    for (const it of items) {
      hpsSum += it.maxScore;
      const r = student.gradeRecords.find((gr) => gr.gradeItemId === it.id);
      if (r && r.score !== null && r.score !== undefined) {
        scoreSum += r.score;
        hasAny = true;
      }
    }
    return { scoreSum, hpsSum, hasAny };
  };

  return (
    <div className="space-y-2.5">
      {/* Live Published Notice */}
      {isPublished && (
        <div className="rounded-lg bg-blue-50/80 border border-blue-200 px-3.5 py-2 text-xs text-blue-900 flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse shrink-0" />
          <span>
            <strong>Live Published Section:</strong> Edits automatically update students&apos; published grade reports.
          </span>
        </div>
      )}

      {/* Compact Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200/90 rounded-xl px-3 py-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">View:</span>
          <button
            type="button"
            onClick={() => expandOnlyPeriod("MIDTERMS")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              expandedGroups.cpMid && expandedGroups.eaMid && !expandedGroups.cpFin && !expandedGroups.eaFin
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            Midterm Columns
          </button>
          <button
            type="button"
            onClick={() => expandOnlyPeriod("POST_MIDTERMS")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              !expandedGroups.cpMid && !expandedGroups.eaMid && expandedGroups.cpFin && expandedGroups.eaFin
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            Post-Midterm Columns
          </button>
          <button
            type="button"
            onClick={() => expandOnlyPeriod("NONE")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              !expandedGroups.cpMid && !expandedGroups.eaMid && !expandedGroups.cpFin && !expandedGroups.eaFin
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
            title="Collapse all 1-7 activity groups into single subtotal columns"
          >
            Consolidate All
          </button>
          <button
            type="button"
            onClick={() => expandOnlyPeriod("ALL")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
              expandedGroups.cpMid && expandedGroups.eaMid && expandedGroups.cpFin && expandedGroups.eaFin
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
            }`}
          >
            Expand All
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-[11px] flex items-center gap-1">
            {saveState === "saving" && (
              <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                Saving...
              </span>
            )}
            {saveState === "saved" && (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                <AlertCircle className="w-3 h-3" />
                {saveError || "Error"}
              </span>
            )}
            {saveState === "idle" && (
              <span className="text-slate-400 hidden md:inline">
                Click group banner to collapse/expand &bull; Click column header to edit
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => openAddColumnForGroup("CP", "MIDTERMS")}
            className="gap-1 text-xs font-semibold py-1 px-2.5 h-7"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Column</span>
          </Button>
        </div>
      </div>

      {/* Consolidated Two-Tier Box-Score Table */}
      <Card className="border border-slate-200/90 shadow-xs overflow-hidden rounded-xl bg-white">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20">
              {/* TIER 1: CONSOLIDATED GROUP BANNERS */}
              <tr className="border-b border-slate-200 text-[11px]">
                <th
                  rowSpan={2}
                  className="px-3 py-2 min-w-[185px] max-w-[200px] sticky left-0 z-30 bg-slate-100 border-r border-slate-200 font-bold text-slate-800 align-middle"
                >
                  Student
                </th>

                {GROUP_CONFIG.map((grp) => {
                  const items = categorized[grp.key];
                  const isExpanded = expandedGroups[grp.key];
                  const colSpan = isExpanded ? Math.max(1, items.length) : 1;

                  return (
                    <th
                      key={grp.key}
                      colSpan={colSpan}
                      className={`px-2 py-1.5 border-r border-slate-300 font-bold select-none ${grp.bannerCls}`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleGroup(grp.key)}
                          className="inline-flex items-center gap-1 hover:opacity-90 cursor-pointer text-left truncate"
                          title={
                            isExpanded
                              ? `Click to consolidate ${grp.title} into 1 column`
                              : `Click to expand ${items.length} columns`
                          }
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="truncate">{isExpanded ? grp.title : grp.shortTitle}</span>
                          <span className="text-[10px] opacity-80 font-mono">({items.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openAddColumnForGroup(grp.type, grp.period)}
                          className="w-4 h-4 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center text-white shrink-0 cursor-pointer"
                          title={`Add column to ${grp.title}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                  );
                })}

                {/* PT & Bonus Banner */}
                <th
                  colSpan={Math.max(1, ptColumns.length)}
                  className="px-2 py-1.5 bg-slate-800 text-white border-r border-slate-700 font-bold"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate">PT &amp; Bonus</span>
                    <button
                      type="button"
                      onClick={() =>
                        openAddColumnForGroup(
                          !categorized.mpt ? "MPT" : !categorized.cpt ? "CPT" : "BONUS",
                          "MIDTERMS"
                        )
                      }
                      className="w-4 h-4 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center text-white shrink-0 cursor-pointer"
                      title="Add MPT, CPT, or Bonus column"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </th>

                <th
                  rowSpan={2}
                  className="px-2.5 py-2 min-w-[96px] text-center bg-slate-100 border-l border-slate-200 font-bold text-slate-700 align-middle"
                >
                  Midterm
                </th>
                <th
                  rowSpan={2}
                  className="px-2.5 py-2 min-w-[96px] text-center bg-blue-50 border-l border-slate-200 font-bold text-blue-950 align-middle"
                >
                  Final
                </th>
                <th
                  rowSpan={2}
                  className="px-2 py-2 w-10 text-center bg-slate-100 border-l border-slate-200 font-semibold text-slate-500 align-middle"
                >
                  View
                </th>
              </tr>

              {/* TIER 2: COMPACT INDIVIDUAL COLUMNS OR CONSOLIDATED SUMMARY HEADER */}
              <tr className="border-b border-slate-200 text-[11px]">
                {GROUP_CONFIG.map((grp) => {
                  const items = categorized[grp.key];
                  const isExpanded = expandedGroups[grp.key];

                  if (!isExpanded) {
                    const totalHps = items.reduce((s, it) => s + it.maxScore, 0);
                    return (
                      <th
                        key={`${grp.key}_sum`}
                        onClick={() => toggleGroup(grp.key)}
                        className={`px-2 py-1.5 w-[74px] min-w-[74px] text-center border-r border-slate-200 cursor-pointer hover:brightness-95 ${grp.subHeaderCls}`}
                        title="Click to expand individual columns"
                      >
                        <div className="font-bold text-[10px] uppercase tracking-tight">Total</div>
                        <div className="text-[10px] font-mono text-slate-500 font-normal">
                          /{totalHps || 0}
                        </div>
                      </th>
                    );
                  }

                  if (items.length === 0) {
                    return (
                      <th
                        key={`${grp.key}_empty`}
                        onClick={() => openAddColumnForGroup(grp.type, grp.period)}
                        className={`px-2 py-1.5 w-[64px] min-w-[64px] text-center border-r border-slate-200 cursor-pointer hover:brightness-95 ${grp.subHeaderCls}`}
                        title={`Click to add first column in ${grp.shortTitle}`}
                      >
                        <div className="text-[10px] font-semibold text-slate-400">+ Add</div>
                      </th>
                    );
                  }

                  return items.map((item) => (
                    <th
                      key={item.id}
                      onClick={() => openEditColumn(item)}
                      className={`px-1 py-1.5 w-[54px] min-w-[54px] max-w-[68px] text-center border-r border-slate-200 cursor-pointer hover:brightness-95 transition-all ${grp.subHeaderCls}`}
                      title={`${item.name} (HPS: ${item.maxScore}) — Click to edit or delete`}
                    >
                      <div className="font-bold text-slate-900 truncate text-[11px] leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500 font-normal leading-tight">
                        /{item.maxScore}
                      </div>
                    </th>
                  ));
                })}

                {/* PT & Bonus subheaders */}
                {ptColumns.length === 0 ? (
                  <th
                    onClick={() => openAddColumnForGroup("MPT", "MIDTERMS")}
                    className="px-2 py-1.5 w-[64px] min-w-[64px] text-center border-r border-slate-200 bg-slate-50 text-slate-400 cursor-pointer hover:bg-slate-100"
                    title="Click to add MPT, CPT, or Bonus"
                  >
                    <div className="text-[10px] font-semibold">+ MPT/CPT</div>
                  </th>
                ) : (
                  ptColumns.map(({ item, bucket }) => (
                    <th
                      key={item.id}
                      onClick={() => openEditColumn(item)}
                      className="px-1 py-1.5 w-[58px] min-w-[58px] text-center border-r border-slate-200 bg-slate-100/90 text-slate-900 cursor-pointer hover:bg-slate-200/70"
                      title={`${item.name} — Click to edit or delete`}
                    >
                      <div className="font-bold truncate text-[11px] leading-tight">{item.name}</div>
                      <div className="text-[9px] font-mono text-slate-500 font-normal leading-tight">
                        {bucket === "bonus" ? "+pts" : `/${item.maxScore}`}
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={20} className="px-5 py-10 text-center text-slate-400">
                    No matching students in this section.
                  </td>
                </tr>
              ) : (
                students.map((ss, rowIdx) => {
                  const midtermGrade = getMidtermGrade(ss);
                  const finalGrade = getFinalGrade(ss);
                  let runningColIdx = 0;

                  const renderScoreInputCell = (item: ScoreGridItem, bucket: ItemBucket) => {
                    const colIdx = runningColIdx++;
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
                        className="p-0.5 text-center border-r border-slate-100 w-[54px] min-w-[54px]"
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
                          className={`w-12 h-7 px-1 text-center font-mono text-[11px] rounded border focus:outline-none transition-colors ${toneCls}`}
                        />
                      </td>
                    );
                  };

                  return (
                    <tr key={ss.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Sticky Student Cell */}
                      <td className="px-3 py-1.5 sticky left-0 z-10 bg-white border-r border-slate-200 max-w-[200px]">
                        <div className="font-semibold text-slate-900 truncate text-xs" title={ss.student.displayName}>
                          {ss.student.displayName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 leading-tight">
                          {ss.student.studentNumber}
                        </div>
                      </td>

                      {/* Collapsible / Expandable CP & EA Groups */}
                      {GROUP_CONFIG.map((grp) => {
                        const items = categorized[grp.key];
                        const isExpanded = expandedGroups[grp.key];

                        if (!isExpanded) {
                          const sub = getGroupSubtotal(ss, items);
                          return (
                            <td
                              key={`${grp.key}_sum`}
                              onClick={() => toggleGroup(grp.key)}
                              className={`px-1.5 py-1.5 text-center font-mono text-[11px] border-r border-slate-200 cursor-pointer ${grp.summaryCellCls}`}
                              title={`Click to expand ${grp.title}`}
                            >
                              {sub.hasAny ? (
                                <span>
                                  <strong className="font-bold">{sub.scoreSum}</strong>
                                  <span className="text-slate-400 text-[10px]">/{sub.hpsSum}</span>
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        }

                        if (items.length === 0) {
                          return (
                            <td
                              key={`${grp.key}_empty`}
                              className="px-1 py-1.5 text-center text-slate-300 border-r border-slate-100"
                            >
                              —
                            </td>
                          );
                        }

                        return items.map((item) => renderScoreInputCell(item, grp.key));
                      })}

                      {/* PT & Bonus Cells */}
                      {ptColumns.length === 0 ? (
                        <td className="px-1 py-1.5 text-center text-slate-300 border-r border-slate-100">
                          —
                        </td>
                      ) : (
                        ptColumns.map(({ item, bucket }) => renderScoreInputCell(item, bucket))
                      )}

                      {/* Midterm Grade */}
                      <td className="px-2 py-1.5 text-center font-mono border-l border-slate-200 bg-slate-50/40 whitespace-nowrap">
                        {midtermGrade !== "-" ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold text-[11px] border ${
                              midtermGrade.startsWith("R")
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : "bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                          >
                            {midtermGrade}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Final Grade */}
                      <td className="px-2 py-1.5 text-center font-mono border-l border-slate-200 bg-blue-50/20 whitespace-nowrap">
                        {finalGrade !== "-" ? (
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded font-bold text-[11px] border ${
                              finalGrade.startsWith("R")
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : "bg-blue-50 text-blue-900 border-blue-200"
                            }`}
                          >
                            {finalGrade}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* View Breakdown */}
                      <td className="px-1.5 py-1.5 text-center border-l border-slate-100">
                        <button
                          type="button"
                          onClick={() => onSelectStudentBreakdown(ss)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
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

      {/* Compact Add / Edit Column Modal */}
      <Modal
        isOpen={columnModalOpen}
        onClose={() => {
          if (!isSavingCol) setColumnModalOpen(false);
        }}
        title={editingItem ? `Edit "${editingItem.name}"` : "Add Column"}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveColumn} className="space-y-3 text-xs">
          {colError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-rose-800 font-medium">
              {colError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Title (e.g. Q1, L1, MPT) *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={colTitle}
                onChange={(e) => setColTitle(e.target.value)}
                placeholder="Q1"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {colType === "BONUS" ? "Max Pts" : "HPS *"}
              </label>
              <input
                type="number"
                min={1}
                step="any"
                required
                value={colMaxScore}
                onChange={(e) => setColMaxScore(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Component
              </label>
              <select
                value={colType}
                onChange={(e) => {
                  const nextType = e.target.value as ItemType;
                  setColType(nextType);
                  if (nextType === "MPT") setColPeriod("MIDTERMS");
                  if (nextType === "CPT") setColPeriod("POST_MIDTERMS");
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
              >
                <option value="CP">CP (Quiz / SW)</option>
                <option value="EA">EA (Lab / Activity)</option>
                <option value="MPT">MPT (Midterm Exam)</option>
                <option value="CPT">CPT (Final Project)</option>
                <option value="BONUS">Bonus Points</option>
              </select>
            </div>

            {(colType === "CP" || colType === "EA") ? (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Period
                </label>
                <select
                  value={colPeriod}
                  onChange={(e) => setColPeriod(e.target.value as ItemPeriod)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold"
                >
                  <option value="MIDTERMS">Midterms (Wk 1–7)</option>
                  <option value="POST_MIDTERMS">Post-Mid (Wk 8–13)</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Period
                </label>
                <div className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                  {colType === "MPT" ? "Mid & Final" : colType === "CPT" ? "Finals" : "Cumulative"}
                </div>
              </div>
            )}
          </div>

          {editingItem && (
            <div className="pt-2 border-t border-slate-100">
              {!confirmDeleteCol ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCol(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete column</span>
                </button>
              ) : (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
                  <span className="text-rose-900 font-medium">
                    Delete <strong>{editingItem.name}</strong>?
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDeleteCol(false)}
                      disabled={isSavingCol}
                    >
                      No
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteColumn}
                      isLoading={isSavingCol}
                    >
                      Delete
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
              {editingItem ? "Save" : "Add"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
