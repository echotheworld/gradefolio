"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  KeyRound,
  Download,
  Share2,
  Search,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowLeft,
  Eye,
  Settings,
  Clock,
  Sparkles,
  Edit3,
  X,
  Upload,
  RotateCcw,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Award,
  Activity,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EditSectionDetailsModal } from "@/components/professor/EditSectionDetailsModal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { getCachedData, setCachedData, invalidateCache } from "@/lib/client-cache";
import { calculateGradeEquivalent } from "@/lib/class-record-parser";

interface GradeItem {
  id: string;
  name: string;
  category: string | null;
  maxScore: number;
}

interface StudentRecord {
  id: string;
  student: {
    id: string;
    studentNumber: string;
    displayName: string;
    course?: string | null;
    strand?: string | null;
    gender?: string | null;
    email?: string | null;
  };
  dateEnrolled?: string | null;
  enrollmentStatus?: string | null;
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

interface SectionData {
  id: string;
  sectionCode: string;
  sectionName: string;
  subjectName: string;
  academicYear: string;
  term: string;
  announcement: string | null;
  subjectCode?: string | null;
  instructor?: string | null;
  offeredTo?: string | null;
  classLimit?: number | null;
  schedules?: string | null;
  ownerProfessor?: { displayName: string; email: string };
  createdAt?: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  publishedPeriod?: string;
  showFinalGrade: boolean;
  showBreakdown: boolean;
  showProvisionalNotice: boolean;
  weightConfig: string | null;
  gradeItems: GradeItem[];
  sectionStudents: StudentRecord[];
}

export interface WeightConfig {
  midterms: {
    cp: number;
    ea: number;
    mpt: number;
  };
  finals: {
    cp: number;
    ea: number;
    mpt: number;
    cpt: number;
  };
}

const DEFAULT_WEIGHTS: WeightConfig = {
  midterms: { cp: 30, ea: 30, mpt: 40 },
  finals: { cp: 30, ea: 30, mpt: 20, cpt: 20 },
};

export default function SectionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sectionId = params.id as string;

  // Safe SSR initial state with 0ms SWR instant paint
  const [section, setSection] = useState<SectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"id" | "name" | "grade">("name");
  const [sortAsc, setSortAsc] = useState(true);

  // Modals
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [unpublishModalOpen, setUnpublishModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [reviewStudent, setReviewStudent] = useState<StudentRecord | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeletingSection, setIsDeletingSection] = useState(false);
  const [deleteSectionError, setDeleteSectionError] = useState("");

  const handleDeleteSection = async () => {
    if (!section) return;
    setIsDeletingSection(true);
    setDeleteSectionError("");
    try {
      const res = await fetch(`/api/professor/sections/${section.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete section");
      }
      setConfirmDeleteCode("");
      router.push("/professor");
    } catch (err: any) {
      setDeleteSectionError(err.message || "Failed to delete section");
      setIsDeletingSection(false);
    }
  };

  // Settings form state (including customizable weights)
  const [settingsForm, setSettingsForm] = useState({
    announcement: "",
    showFinalGrade: true,
    showBreakdown: true,
    showProvisionalNotice: true,
    publishedPeriod: "FINALS",
    weights: DEFAULT_WEIGHTS,
  });

  const loadSection = async () => {
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/admin_mis");
          return;
        }
        throw new Error("Failed to load section");
      }
      const data = await res.json();
      setSection(data.section);

      if (data.section) {
        setCachedData(`gv_sec_${sectionId}`, data.section);
      }

      let initialWeights = DEFAULT_WEIGHTS;
      if (data.section.weightConfig) {
        try {
          const parsed =
            typeof data.section.weightConfig === "string"
              ? JSON.parse(data.section.weightConfig)
              : data.section.weightConfig;
          if (parsed?.midterms && parsed?.finals) {
            initialWeights = {
              midterms: {
                cp: Number(parsed.midterms.cp) || 30,
                ea: Number(parsed.midterms.ea) || 30,
                mpt: Number(parsed.midterms.mpt) || 40,
              },
              finals: {
                cp: Number(parsed.finals.cp) || 30,
                ea: Number(parsed.finals.ea) || 30,
                mpt: Number(parsed.finals.mpt) || 20,
                cpt: Number(parsed.finals.cpt) || 20,
              },
            };
          }
        } catch (e) {
          console.error("Error parsing weightConfig:", e);
        }
      }

      setSettingsForm({
        announcement: data.section.announcement || "",
        showFinalGrade: data.section.showFinalGrade,
        showBreakdown: data.section.showBreakdown,
        showProvisionalNotice: data.section.showProvisionalNotice,
        publishedPeriod: data.section.publishedPeriod || "FINALS",
        weights: initialWeights,
      });
      setIsLoading(false);
    } catch {
      setError("Failed to load section data.");
      setIsLoading(false);
    }
  };

  // Immediate cache paint on mount + automatic real-time syncing
  useEffect(() => {
    const cached = getCachedData<SectionData>(`gv_sec_${sectionId}`);
    if (cached) {
      setSection(cached);
      setIsLoading(false);
    }
    loadSection();

    // Automatic real-time sync when switching back to tab
    const handleFocus = () => loadSection();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [sectionId]);

  // Active weights extracted from section or defaults
  const activeWeights: WeightConfig = useMemo(() => {
    if (!section?.weightConfig) return DEFAULT_WEIGHTS;
    try {
      const parsed =
        typeof section.weightConfig === "string"
          ? JSON.parse(section.weightConfig)
          : section.weightConfig;
      if (parsed?.midterms && parsed?.finals) {
        return {
          midterms: {
            cp: Number(parsed.midterms.cp) || 30,
            ea: Number(parsed.midterms.ea) || 30,
            mpt: Number(parsed.midterms.mpt) || 40,
          },
          finals: {
            cp: Number(parsed.finals.cp) || 30,
            ea: Number(parsed.finals.ea) || 30,
            mpt: Number(parsed.finals.mpt) || 20,
            cpt: Number(parsed.finals.cpt) || 20,
          },
        };
      }
      return DEFAULT_WEIGHTS;
    } catch {
      return DEFAULT_WEIGHTS;
    }
  }, [section?.weightConfig]);

  // Filtered & Sorted student list
  const filteredStudents = useMemo(() => {
    if (!section) return [];
    return section.sectionStudents
      .filter((s) => {
        const q = searchQuery.toLowerCase();
        return (
          s.student.displayName.toLowerCase().includes(q) ||
          s.student.studentNumber.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === "name") {
          cmp = a.student.displayName.localeCompare(b.student.displayName);
        } else if (sortField === "id") {
          cmp = a.student.studentNumber.localeCompare(b.student.studentNumber);
        } else if (sortField === "grade") {
          const ga = parseFloat(a.finalGrade || "0");
          const gb = parseFloat(b.finalGrade || "0");
          cmp = ga - gb;
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [section, searchQuery, sortField, sortAsc]);

  // Helper to categorize grade items for the breakdown modal & grade computation
  const categorizedItems = useMemo<{
    cpMid: GradeItem[];
    cpFin: GradeItem[];
    eaMid: GradeItem[];
    eaFin: GradeItem[];
    mpt: GradeItem | null;
    cpt: GradeItem | null;
    bonus: GradeItem | null;
  }>(() => {
    if (!section) {
      return { cpMid: [], cpFin: [], eaMid: [], eaFin: [], mpt: null, cpt: null, bonus: null };
    }

    const cpMid: GradeItem[] = [];
    const cpFin: GradeItem[] = [];
    const eaMid: GradeItem[] = [];
    const eaFin: GradeItem[] = [];
    let mpt: GradeItem | null = null;
    let cpt: GradeItem | null = null;
    let bonus: GradeItem | null = null;

    section.gradeItems.forEach((item) => {
      const cat = (item.category || "").toLowerCase();
      const name = item.name.toLowerCase();

      // Check MPT, CPT, Bonus first
      if (name.includes("mpt") || cat.includes("major pt") || name.includes("midterm exam")) {
        mpt = item;
      } else if (name.includes("cpt") || cat.includes("culminating pt") || name.includes("final project")) {
        cpt = item;
      } else if (name.includes("bonus") || cat.includes("bonus")) {
        bonus = item;
      } else if (cat.includes("class participation") || name.startsWith("cp") || cat.includes("cp")) {
        if (
          cat.includes("post") ||
          cat.includes("final") ||
          name.includes("final") ||
          name.includes("post") ||
          /\b(8|9|10|11|12|13|14)\b/.test(name) ||
          ["q4", "q5", "sw4"].some((prefix) => name.includes(prefix))
        ) {
          cpFin.push(item);
        } else {
          cpMid.push(item);
        }
      } else if (cat.includes("enabling") || name.startsWith("ea") || cat.includes("ea")) {
        if (
          cat.includes("post") ||
          cat.includes("final") ||
          name.includes("final") ||
          name.includes("post") ||
          /\b(8|9|10|11|12|13|14)\b/.test(name) ||
          ["l6", "l7", "l8", "fp"].some((prefix) => name.includes(prefix))
        ) {
          eaFin.push(item);
        } else {
          eaMid.push(item);
        }
      }
    });

    return { cpMid, cpFin, eaMid, eaFin, mpt, cpt, bonus };
  }, [section]);

  // Standardized grade formatter: formats consistently as [Equivalent] ([Percentage]%)
  // For failing marks (< 60% or R), it outputs "R (15.56%)" like the others
  const formatGradeValue = (raw: string | null | undefined, fallbackPct?: number | null): string => {
    if (!raw || raw === "-" || raw.trim() === "") {
      if (fallbackPct !== null && fallbackPct !== undefined && !isNaN(fallbackPct)) {
        const formattedPct = fallbackPct.toFixed(fallbackPct % 1 === 0 ? 1 : 2);
        if (fallbackPct < 60.0) {
          return `R (${formattedPct}%)`;
        }
        const equiv = calculateGradeEquivalent(fallbackPct, section?.subjectName || "");
        return `${equiv} (${formattedPct}%)`;
      }
      return "-";
    }

    const s = raw.trim();
    const upper = s.toUpperCase();

    // Check if raw string contains a percentage e.g. "R (15.56%)", "58.90%", "2.5 (81.37%)"
    const pctMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
    let pct: number | null = pctMatch ? parseFloat(pctMatch[1]) : (fallbackPct ?? null);

    // If string is pure number e.g. "58.90"
    if (pct === null) {
      const num = parseFloat(s);
      if (!isNaN(num) && num > 5.0) {
        pct = num;
      }
    }

    // Is it an R grade (either by percentage < 60 or explicitly marked R)?
    const isR =
      (pct !== null && pct < 60.0) ||
      upper === "R" ||
      upper === "REPEAT" ||
      upper.startsWith("R ") ||
      upper.startsWith("R(") ||
      upper.startsWith("R-") ||
      upper.includes("KINDLY CONTACT") ||
      upper.includes("UNAVAILABLE") ||
      upper.includes("UNAVAIBLE");

    if (isR) {
      if (pct !== null && !isNaN(pct)) {
        const formattedPct = pct.toFixed(2);
        return `R (${formattedPct}%)`;
      }
      return "R";
    }

    // Passing grade (>= 60)
    if (pct !== null && !isNaN(pct)) {
      if (!/^[0-9]\.[0-9]/.test(s)) {
        const equiv = calculateGradeEquivalent(pct, section?.subjectName || "");
        const formattedPct = pct.toFixed(2);
        return `${equiv} (${formattedPct}%)`;
      }
    }

    return s;
  };

  // Helper to extract Midterm Grade from StudentRecord (or dynamically compute using activeWeights)
  const getStudentMidtermGrade = (ss: StudentRecord) => {
    let raw: string | null = null;
    let pct: number | null = null;

    if (ss.remarks) {
      const match = ss.remarks.match(/Midterm:\s*([^\s|]+(?:\s*\([^)]+\))?)/i);
      if (match) {
        raw = match[1].trim();
      } else if (ss.remarks.includes("%") || /^[0-9]\.[0-9]/.test(ss.remarks)) {
        raw = ss.remarks.split("|")[0].trim();
      }
    }

    // Check if raw already has a percentage e.g. "R (15.56%)" or "58.90%"
    if (raw) {
      const match = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
      if (match) {
        pct = parseFloat(match[1]);
      }
    }

    // Try finding the midterm item from gradeRecords
    const midItem = section?.gradeItems.find((g) =>
      g.name.toLowerCase().includes("midterm grade") ||
      g.category === "Term Grade" ||
      g.category === "MIDTERM_GRADE"
    );
    if (midItem) {
      const rec = ss.gradeRecords.find((r) => r.gradeItemId === midItem.id);
      if (rec && rec.score !== null && rec.score !== undefined) {
        if (pct === null) pct = rec.score;
        if (!raw) raw = `${rec.score}%`;
      }
    }

    // Fallback: compute from active weights
    if (pct === null) {
      let cpScore = 0, cpHps = 0, eaScore = 0, eaHps = 0;
      categorizedItems.cpMid.forEach((it) => {
        const r = ss.gradeRecords.find((gr) => gr.gradeItemId === it.id);
        if (r && r.score !== null && r.score !== undefined) cpScore += r.score;
        cpHps += it.maxScore;
      });
      categorizedItems.eaMid.forEach((it) => {
        const r = ss.gradeRecords.find((gr) => gr.gradeItemId === it.id);
        if (r && r.score !== null && r.score !== undefined) eaScore += r.score;
        eaHps += it.maxScore;
      });
      let mptScore = 0, mptHps = categorizedItems.mpt?.maxScore || 0;
      if (categorizedItems.mpt) {
        const r = ss.gradeRecords.find((gr) => gr.gradeItemId === categorizedItems.mpt!.id);
        if (r && r.score !== null && r.score !== undefined) mptScore = r.score;
      }
      if (cpHps > 0 || eaHps > 0 || mptHps > 0) {
        const cpPart = cpHps > 0 ? (cpScore / cpHps) * activeWeights.midterms.cp : 0;
        const eaPart = eaHps > 0 ? (eaScore / eaHps) * activeWeights.midterms.ea : 0;
        const mptPart = mptHps > 0 ? (mptScore / mptHps) * activeWeights.midterms.mpt : 0;
        const total = cpPart + eaPart + mptPart;
        if (total > 0) {
          pct = Number(total.toFixed(2));
          if (!raw) raw = `${pct}%`;
        }
      }
    }

    return formatGradeValue(raw, pct);
  };

  // Helper to extract Final Grade (or dynamically compute using activeWeights)
  const getStudentFinalGrade = (ss: StudentRecord) => {
    let raw = ss.finalGrade && ss.finalGrade !== "-" ? ss.finalGrade : null;
    let pct: number | null = null;

    // Check if raw already has a percentage e.g. "R (15.56%)" or "3.0 (83.7%)"
    if (raw) {
      const match = raw.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
      if (match) {
        pct = parseFloat(match[1]);
      }
    }

    // Try finding final grade percentage from gradeItems
    if (pct === null) {
      const finItem = section?.gradeItems.find((g) =>
        g.name.toLowerCase().includes("final grade (%)") ||
        g.name.toLowerCase().includes("final percentage") ||
        g.name.toLowerCase() === "final grade"
      );
      if (finItem) {
        const rec = ss.gradeRecords.find((r) => r.gradeItemId === finItem.id);
        if (rec && rec.score !== null && rec.score !== undefined) {
          pct = rec.score;
        }
      }
    }

    // Fallback: compute from active weights
    if (pct === null) {
      let cpScore = 0, cpHps = 0, eaScore = 0, eaHps = 0;
      [...categorizedItems.cpMid, ...categorizedItems.cpFin].forEach((it) => {
        const r = ss.gradeRecords.find((gr) => gr.gradeItemId === it.id);
        if (r && r.score !== null && r.score !== undefined) cpScore += r.score;
        cpHps += it.maxScore;
      });
      [...categorizedItems.eaMid, ...categorizedItems.eaFin].forEach((it) => {
        const r = ss.gradeRecords.find((gr) => gr.gradeItemId === it.id);
        if (r && r.score !== null && r.score !== undefined) eaScore += r.score;
        eaHps += it.maxScore;
      });
      let mptScore = 0, mptHps = categorizedItems.mpt?.maxScore || 0;
      if (categorizedItems.mpt) {
        const r = ss.gradeRecords.find((gr) => gr.gradeItemId === categorizedItems.mpt!.id);
        if (r && r.score !== null && r.score !== undefined) mptScore = r.score;
      }
      let cptScore = 0, cptHps = categorizedItems.cpt?.maxScore || 0;
      if (categorizedItems.cpt) {
        const r = ss.gradeRecords.find((gr) => gr.gradeItemId === categorizedItems.cpt!.id);
        if (r && r.score !== null && r.score !== undefined) cptScore = r.score;
      }
      let bonus = 0;
      if (categorizedItems.bonus) {
        const r = ss.gradeRecords.find((gr) => gr.gradeItemId === categorizedItems.bonus!.id);
        if (r && r.score !== null && r.score !== undefined) bonus = r.score;
      }
      if (cpHps > 0 || eaHps > 0) {
        const cpPart = cpHps > 0 ? (cpScore / cpHps) * activeWeights.finals.cp : 0;
        const eaPart = eaHps > 0 ? (eaScore / eaHps) * activeWeights.finals.ea : 0;
        const mptPart = mptHps > 0 ? (mptScore / mptHps) * activeWeights.finals.mpt : 0;
        const cptPart = cptHps > 0 ? (cptScore / cptHps) * activeWeights.finals.cpt : 0;
        const total = cpPart + eaPart + mptPart + cptPart + bonus;
        if (total > 0) {
          pct = Number(total.toFixed(2));
          if (!raw) raw = `${pct}%`;
        }
      }
    }

    return formatGradeValue(raw, pct);
  };

  // Handle Publish
  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "PUBLISHED",
          publishedPeriod: settingsForm.publishedPeriod,
        }),
      });
      if (!res.ok) throw new Error("Publishing failed");
      toast({
        type: "success",
        title: "Grades Published Successfully",
        message: `Section ${section?.sectionCode} is now live for students (${
          settingsForm.publishedPeriod === "MIDTERMS"
            ? "Midterm Period (Weeks 1–7)"
            : "Finals Period (Weeks 1–13 Overall)"
        }).`,
      });
      invalidateCache("prof_sections");
      invalidateCache("admin_sections");
      setPublishModalOpen(false);
      await loadSection();
    } catch (e: any) {
      toast({ type: "error", title: "Publication Failed", message: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick period change on the section overview header
  const handleQuickPeriodChange = async (newPeriod: string) => {
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishedPeriod: newPeriod }),
      });
      if (!res.ok) throw new Error("Failed to update published period");
      toast({
        type: "success",
        title: "Publishing Period Updated",
        message: `Student portal view is now set to ${
          newPeriod === "MIDTERMS" ? "Midterm Period (Weeks 1–7)" : "Finals Period (Weeks 1–13 Overall)"
        }.`,
      });
      setSettingsForm((prev) => ({ ...prev, publishedPeriod: newPeriod }));
      await loadSection();
    } catch (e: any) {
      toast({ type: "error", title: "Update Failed", message: e.message });
    }
  };

  // Handle Unpublish
  const handleUnpublish = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DRAFT" }),
      });
      if (!res.ok) throw new Error("Unpublishing failed");
      toast({
        type: "info",
        title: "Section Unpublished",
        message: "Status reverted to Draft. Student access is temporarily paused.",
      });
      invalidateCache("prof_sections");
      invalidateCache("admin_sections");
      setUnpublishModalOpen(false);
      await loadSection();
    } catch (e: any) {
      toast({ type: "error", title: "Unpublish Failed", message: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcement: settingsForm.announcement,
          showFinalGrade: settingsForm.showFinalGrade,
          showBreakdown: settingsForm.showBreakdown,
          showProvisionalNotice: settingsForm.showProvisionalNotice,
          publishedPeriod: settingsForm.publishedPeriod,
          weightConfig: JSON.stringify(settingsForm.weights),
        }),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      toast({ type: "success", title: "Settings Saved", message: "Section visibility updated." });
      setSettingsModalOpen(false);
      await loadSection();
    } catch (e: any) {
      toast({ type: "error", title: "Update Failed", message: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reset Section (clears all students, grade items, and records to re-import)
  const handleResetSection = async () => {
    setIsResetting(true);
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}/reset`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset section");
      toast({
        type: "success",
        title: "Section Reset Successful",
        message: data.message || "Section data cleared. Ready for re-import.",
      });
      invalidateCache("prof_sections");
      invalidateCache("admin_sections");
      setResetModalOpen(false);
      await loadSection();
    } catch (e: any) {
      toast({ type: "error", title: "Reset Failed", message: e.message });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="w-28 h-4 bg-slate-200 rounded" />
        <div className="border border-slate-200/90 shadow-xs rounded-2xl bg-white p-6 sm:p-7 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-24 h-6 bg-slate-200 rounded-md" />
                <div className="w-28 h-4 bg-slate-100 rounded" />
                <div className="w-16 h-5 bg-slate-100 rounded-full" />
              </div>
              <div className="w-72 sm:w-96 h-8 bg-slate-200 rounded-lg" />
              <div className="w-64 h-4 bg-slate-100 rounded" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-28 h-9 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 space-y-2">
                <div className="w-16 h-3 bg-slate-200 rounded" />
                <div className="w-24 h-6 bg-slate-200 rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <div className="border border-slate-200/90 shadow-xs rounded-2xl bg-white p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="w-64 h-10 bg-slate-100 rounded-xl" />
            <div className="w-32 h-10 bg-slate-100 rounded-xl" />
          </div>
          <div className="space-y-3 pt-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-14 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between px-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-24 h-4 bg-slate-200 rounded" />
                  <div className="w-40 h-4 bg-slate-200 rounded" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-5 bg-slate-200 rounded-md" />
                  <div className="w-20 h-8 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !section) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-slate-900">Unable to load section</h2>
        <p className="text-xs text-slate-500 mt-2">{error}</p>
        <div className="mt-6">
          <Link href="/professor">
            <Button size="sm">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPublished = section.status === "PUBLISHED";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/professor"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Sections</span>
        </Link>
      </div>

      {/* Section Header Card */}
      <Card className="border border-slate-200/90 shadow-xs overflow-hidden rounded-2xl bg-white">
        <div className="p-6 sm:p-7 border-b border-slate-100 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-semibold tracking-wider border border-slate-200">
                  {section.sectionCode}
                </span>
                <span className="text-xs text-slate-600 font-medium">&bull; <strong className="text-slate-800 font-semibold">{section.sectionName}</strong></span>
                <StatusChip status={section.status} />

                {/* Published Period Toggle: Midterm vs Finals */}
                {isPublished && (
                  <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5">Posting:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickPeriodChange("MIDTERMS")}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        section.publishedPeriod === "MIDTERMS"
                          ? "bg-blue-600 text-white shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Only publish Midterm Grade (Weeks 1-7) to students"
                    >
                      Midterm Period (Weeks 1–7)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPeriodChange("FINALS")}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        section.publishedPeriod !== "MIDTERMS"
                          ? "bg-purple-600 text-white shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Publish Cumulative Final Grade (Weeks 1-13 Overall) to students"
                    >
                      Finals Period (Weeks 1–13 Overall)
                    </button>
                  </div>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {section.subjectName}
              </h1>

              <p className="text-xs text-slate-500 mt-1 font-medium">
                {section.term} &bull; Academic Year {section.academicYear} &bull; Last updated {formatDate(section.updatedAt)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/professor/sections/${section.id}/import`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Import Sheet</span>
                </Button>
              </Link>

              <a href={`/api/professor/sections/${section.id}/export?format=xlsx`} download>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Export Sheet</span>
                </Button>
              </a>

              <Link href={`/professor/sections/${section.id}/credentials`}>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold">
                  <KeyRound className="w-3.5 h-3.5 text-slate-600" />
                  <span>Credentials ({section.sectionStudents.length})</span>
                </Button>
              </Link>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditDetailsOpen(true)}
                className="gap-1.5 text-xs font-semibold"
                title="Edit details or re-upload the classlist PDF"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>Edit Details</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSettingsModalOpen(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span>Settings</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setResetModalOpen(true)}
                className="gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                title="Clear all students and grades to re-import"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                <span>Reset Section</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDeleteSectionError("");
                  setConfirmDeleteCode("");
                  setDeleteSectionModalOpen(true);
                }}
                className="gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                title="Permanently delete this entire section"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Delete Section</span>
              </Button>

              {isPublished ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setUnpublishModalOpen(true)}
                  className="gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unpublish</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setPublishModalOpen(true)}
                  className="gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publish Grades</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {section.announcement && (
          <div className="bg-amber-50/70 border-b border-amber-200/80 px-6 py-2.5 text-xs text-amber-900 flex items-center justify-between font-normal">
            <span>
              <strong className="font-semibold text-amber-950">Student Announcement: </strong> {section.announcement}
            </span>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="text-amber-800 font-semibold underline text-[11px] hover:text-amber-950 ml-4 cursor-pointer"
            >
              Edit
            </button>
          </div>
        )}

        {/* Section Information (from official classlist) */}
        {(() => {
          let scheduleRows: Array<{ day: string; time: string; roomType: string; room: string }> = [];
          try {
            scheduleRows = section.schedules ? JSON.parse(section.schedules) : [];
          } catch {
            scheduleRows = [];
          }
          const enrolled = section.sectionStudents.length;
          const info: Array<[string, React.ReactNode]> = [
            ["Subject Code", section.subjectCode || "—"],
            ["Subject Name", section.subjectName],
            ["Section", section.sectionName],
            ["Section Access Code", section.sectionCode],
            ["Academic Year", section.academicYear],
            ["Term", section.term],
            ["Instructor", section.instructor || section.ownerProfessor?.displayName || "—"],
            ["Offered To", section.offeredTo || "—"],
            [
              "Class Limit",
              section.classLimit !== null && section.classLimit !== undefined
                ? `${enrolled} / ${section.classLimit} enrolled`
                : `${enrolled} enrolled`,
            ],
          ];
          return (
            <div className="px-6 sm:px-7 py-5 bg-slate-50/50 border-t border-slate-100 space-y-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Section Details
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                {info.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</dt>
                    <dd className="text-xs font-semibold text-slate-900 mt-0.5 break-words">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Subject Schedules
                </div>
                {scheduleRows.length === 0 ? (
                  <p className="text-xs text-slate-400">No schedule recorded.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-3 py-2 w-10">#</th>
                          <th className="px-3 py-2">Day</th>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Room Type</th>
                          <th className="px-3 py-2">Room</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scheduleRows.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{r.day}</td>
                            <td className="px-3 py-2 text-slate-700">{r.time}</td>
                            <td className="px-3 py-2 text-slate-700">{r.roomType}</td>
                            <td className="px-3 py-2 text-slate-700">{r.room}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Card>

      {/* Gradebook Surface Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student by name or ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        {/* Sort & Export controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs">
            <span className="text-slate-400 px-2 font-medium">Sort:</span>
            <button
              onClick={() => {
                if (sortField === "name") setSortAsc(!sortAsc);
                else {
                  setSortField("name");
                  setSortAsc(true);
                }
              }}
              className={`px-2 py-1 rounded ${
                sortField === "name" ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600"
              }`}
            >
              Name {sortField === "name" && (sortAsc ? "↑" : "↓")}
            </button>
            <button
              onClick={() => {
                if (sortField === "id") setSortAsc(!sortAsc);
                else {
                  setSortField("id");
                  setSortAsc(true);
                }
              }}
              className={`px-2 py-1 rounded ${
                sortField === "id" ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600"
              }`}
            >
              ID {sortField === "id" && (sortAsc ? "↑" : "↓")}
            </button>
            <button
              onClick={() => {
                if (sortField === "grade") setSortAsc(!sortAsc);
                else {
                  setSortField("grade");
                  setSortAsc(false);
                }
              }}
              className={`px-2 py-1 rounded ${
                sortField === "grade" ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-600"
              }`}
            >
              Grade {sortField === "grade" && (sortAsc ? "↑" : "↓")}
            </button>
          </div>

        </div>
      </div>

      {/* Student Roster Table */}
      <Card className="border border-slate-200/90 shadow-xs overflow-hidden rounded-xl bg-white">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 sticky top-0 z-20 border-b border-slate-200 text-xs font-semibold">
              <tr>
                <th className="px-5 py-3.5 min-w-[130px] text-slate-700 font-semibold">
                  Student ID
                </th>
                <th className="px-5 py-3.5 min-w-[200px] text-slate-700 font-semibold">
                  Student Name
                </th>
                <th className="px-5 py-3.5 min-w-[140px] text-slate-700 font-semibold">
                  Midterm Grade
                </th>
                <th className="px-5 py-3.5 min-w-[140px] font-bold text-blue-900 bg-blue-50/40">
                  Final Grade
                </th>
                <th className="px-5 py-3.5 text-center min-w-[130px] text-slate-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400 font-medium"
                  >
                    No student records found matching &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((ss) => {
                  const midtermGrade = getStudentMidtermGrade(ss);
                  const finalGrade = getStudentFinalGrade(ss);

                  return (
                    <tr
                      key={ss.id}
                      onClick={() => setReviewStudent(ss)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-800">
                        {ss.student.studentNumber}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 truncate max-w-[220px]">
                        {ss.student.displayName}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-medium text-slate-700">
                        {midtermGrade !== "-" ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-xs border ${
                            midtermGrade.startsWith("R")
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : "bg-slate-100 text-slate-800 border-slate-200"
                          }`}>
                            {midtermGrade}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-blue-900 bg-blue-50/20">
                        {finalGrade !== "-" ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs border ${
                            finalGrade.startsWith("R")
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : "bg-blue-50 text-blue-900 border-blue-200"
                          }`}>
                            {finalGrade}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewStudent(ss);
                          }}
                          className="gap-1.5 text-xs text-blue-700 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100/80 border-blue-200 shadow-none font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Breakdown</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredStudents.length} of {section.sectionStudents.length} enrolled students</span>
          <span className="text-[11px] text-slate-400">Click any student row to view full assessment breakdown</span>
        </div>
      </Card>

      {/* Screen 6: Publish Confirmation Modal */}
      <EditSectionDetailsModal
        isOpen={editDetailsOpen}
        onClose={() => setEditDetailsOpen(false)}
        section={section}
        currentStudents={section.sectionStudents.map((s) => ({
          studentNumber: s.student.studentNumber,
          displayName: s.student.displayName,
        }))}
        onApplied={async (message) => {
          toast({ type: "success", title: "Section Updated", message });
          invalidateCache("prof_sections");
          invalidateCache("admin_sections");
          await loadSection();
        }}
      />

      <Modal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Publish Section Grades"
        description="Verify the publication checklist below before committing."
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg bg-teal-50 border border-teal-200 p-4 text-teal-900 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              Pre-Publication Summary
            </h4>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <div>
                <span className="text-teal-700 font-medium">Course:</span> {section.subjectName}
              </div>
              <div>
                <span className="text-teal-700 font-medium">Section:</span> {section.sectionName}
              </div>
              <div>
                <span className="text-teal-700 font-medium">Lookup Code:</span> {section.sectionCode}
              </div>
              <div>
                <span className="text-teal-700 font-medium">Enrolled Students:</span>{" "}
                {section.sectionStudents.length}
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="font-semibold text-slate-900">Choose Academic Period to Publish:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, publishedPeriod: "MIDTERMS" })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settingsForm.publishedPeriod === "MIDTERMS"
                    ? "bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 text-blue-950"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Midterm Period</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Weeks 1–7 coursework only</p>
              </button>

              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, publishedPeriod: "FINALS" })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settingsForm.publishedPeriod !== "MIDTERMS"
                    ? "bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 text-purple-950"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Finals Period</span>
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Weeks 1–13 overall coursework</p>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Fields Visible to Students:</h4>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                Publishing Mode: <strong>{
                  settingsForm.publishedPeriod === "MIDTERMS" ? "Midterm Period (Weeks 1–7)" : "Finals Period (Weeks 1–13 Overall)"
                }</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                Final Grade / Average: <strong>{section.showFinalGrade ? "Visible" : "Hidden"}</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                Itemized Breakdown: <strong>{section.showBreakdown ? "Visible" : "Hidden"}</strong>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                Provisional Status Notice:{" "}
                <strong>{section.showProvisionalNotice ? "Enabled" : "Disabled"}</strong>
              </li>
            </ul>
          </div>

          <p className="text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
            Publishing makes individual grade records accessible immediately to students who authenticate with their unique password. An immutable audit log entry will be recorded.
          </p>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePublish}
              isLoading={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              Confirm & Publish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Unpublish Confirmation Modal */}
      <Modal
        isOpen={unpublishModalOpen}
        onClose={() => setUnpublishModalOpen(false)}
        title="Unpublish Section Grades"
        description="Temporarily revoke student access to this section's grade reports."
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900 leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-amber-600 mb-1" />
            <strong>Caution:</strong> Reverting this section to <strong>Draft</strong> prevents students from viewing their grade reports until you publish again. This action will be recorded in the system audit log.
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setUnpublishModalOpen(false)}>
              Keep Published
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleUnpublish}
              isLoading={isSubmitting}
              className="font-semibold"
            >
              Confirm Unpublish
            </Button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Section Settings & Percentage Allocation"
        description="Configure student announcement, visibility, and component percentage weights."
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Student Announcement
            </label>
            <textarea
              rows={3}
              value={settingsForm.announcement}
              onChange={(e) => setSettingsForm({ ...settingsForm, announcement: e.target.value })}
              placeholder="e.g. Grades updated October 21. Contact me for consultation."
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Percentage Allocation Matrix (matches class record Excel template) */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Percentage Allocation
                </span>
                <span className="text-slate-500 text-[11px]">
                  Configure weighted percentages for Midterms and Finals (target: 100%)
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-center text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-3 py-2 text-left">Components</th>
                    <th className="px-3 py-2">CP (%)</th>
                    <th className="px-3 py-2">EA (%)</th>
                    <th className="px-3 py-2">MPT (%)</th>
                    <th className="px-3 py-2">CPT (%)</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Midterm Grade Row */}
                  <tr>
                    <td className="px-3 py-2 text-left font-semibold text-slate-800">
                      Midterm Grade
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settingsForm.weights.midterms.cp}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            weights: {
                              ...settingsForm.weights,
                              midterms: {
                                ...settingsForm.weights.midterms,
                                cp: Number(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-300 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settingsForm.weights.midterms.ea}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            weights: {
                              ...settingsForm.weights,
                              midterms: {
                                ...settingsForm.weights.midterms,
                                ea: Number(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-300 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settingsForm.weights.midterms.mpt}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            weights: {
                              ...settingsForm.weights,
                              midterms: {
                                ...settingsForm.weights.midterms,
                                mpt: Number(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-300 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-slate-300 font-mono">-</td>
                    <td className="px-3 py-2 font-mono font-bold">
                      {(() => {
                        const midTotal =
                          settingsForm.weights.midterms.cp +
                          settingsForm.weights.midterms.ea +
                          settingsForm.weights.midterms.mpt;
                        return (
                          <span
                            className={
                              midTotal === 100
                                ? "text-emerald-700 font-bold"
                                : "text-amber-600 font-bold"
                            }
                          >
                            {midTotal}%
                          </span>
                        );
                      })()}
                    </td>
                  </tr>

                  {/* Final Grade Row */}
                  <tr>
                    <td className="px-3 py-2 text-left font-semibold text-slate-800">
                      Final Grade
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settingsForm.weights.finals.cp}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            weights: {
                              ...settingsForm.weights,
                              finals: {
                                ...settingsForm.weights.finals,
                                cp: Number(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-300 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settingsForm.weights.finals.ea}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            weights: {
                              ...settingsForm.weights,
                              finals: {
                                ...settingsForm.weights.finals,
                                ea: Number(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-300 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settingsForm.weights.finals.mpt}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            weights: {
                              ...settingsForm.weights,
                              finals: {
                                ...settingsForm.weights.finals,
                                mpt: Number(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-300 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={settingsForm.weights.finals.cpt}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            weights: {
                              ...settingsForm.weights,
                              finals: {
                                ...settingsForm.weights.finals,
                                cpt: Number(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-bold text-xs rounded border border-slate-300 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 font-mono font-bold">
                      {(() => {
                        const finTotal =
                          settingsForm.weights.finals.cp +
                          settingsForm.weights.finals.ea +
                          settingsForm.weights.finals.mpt +
                          settingsForm.weights.finals.cpt;
                        return (
                          <span
                            className={
                              finTotal === 100
                                ? "text-emerald-700 font-bold"
                                : "text-amber-600 font-bold"
                            }
                          >
                            {finTotal}%
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800">
              Publishing Period Visibility
            </label>
            <p className="text-[11px] text-slate-500">
              Control what period is displayed to students when they access their report.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, publishedPeriod: "MIDTERMS" })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settingsForm.publishedPeriod === "MIDTERMS"
                    ? "bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 text-blue-950 font-medium"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Midterm Period</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Weeks 1–7 coursework only</p>
              </button>

              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, publishedPeriod: "FINALS" })}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  settingsForm.publishedPeriod !== "MIDTERMS"
                    ? "bg-purple-50 border-purple-400 ring-2 ring-purple-500/20 text-purple-950 font-medium"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>Finals Period</span>
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Weeks 1–13 overall coursework</p>
              </button>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm.showFinalGrade}
                onChange={(e) => setSettingsForm({ ...settingsForm, showFinalGrade: e.target.checked })}
                className="mt-0.5 rounded text-slate-900"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Show Final Grade</span>
                <span className="text-slate-500 text-[11px]">Display overall final course mark</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm.showBreakdown}
                onChange={(e) => setSettingsForm({ ...settingsForm, showBreakdown: e.target.checked })}
                className="mt-0.5 rounded text-slate-900"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Show Assessment Breakdown</span>
                <span className="text-slate-500 text-[11px]">Display scores for each quiz/exam</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm.showProvisionalNotice}
                onChange={(e) =>
                  setSettingsForm({ ...settingsForm, showProvisionalNotice: e.target.checked })
                }
                className="mt-0.5 rounded text-slate-900"
              />
              <div>
                <span className="font-semibold text-slate-900 block">Show Provisional Warning</span>
                <span className="text-slate-500 text-[11px]">Display provisional disclaimer</span>
              </div>
            </label>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setSettingsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Save Settings
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Section Confirmation Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Section Data"
        description={`Clear all records in ${section.sectionCode} - ${section.sectionName}`}
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-900 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-sm text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Permanent Action Warning
            </h4>
            <p className="text-xs leading-relaxed text-rose-700">
              Resetting this section will <strong>permanently delete</strong> all{" "}
              <strong>{section.sectionStudents.length} student records</strong>, all{" "}
              <strong>{section.gradeItems.length} grade items</strong>, scores, and import logs.
            </p>
            <p className="text-xs text-rose-700">
              The section status will revert to <strong>DRAFT</strong> so you can cleanly re-import your official{" "}
              <code className="font-mono font-bold">Class Record Template</code> workbook.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 space-y-1 text-xs">
            <div className="font-semibold text-slate-800">What will happen:</div>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
              <li>Section code, course details, and professor assignment remain intact</li>
              <li>Existing students and gradebook items will be cleared</li>
              <li>Section reverts to Draft state ready for a clean re-import</li>
            </ul>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetModalOpen(false)}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleResetSection}
              isLoading={isResetting}
              className="gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Confirm &amp; Reset Section</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Section Confirmation Modal */}
      <Modal
        isOpen={deleteSectionModalOpen}
        onClose={() => {
          if (!isDeletingSection) setDeleteSectionModalOpen(false);
        }}
        title="Delete Course Section"
        description={`Permanently delete ${section.sectionCode} - ${section.sectionName}`}
        maxWidth="md"
      >
        <div className="p-6 space-y-4 text-xs">
          {deleteSectionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold">
              {deleteSectionError}
            </div>
          )}

          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-900 space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-sm text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Permanent Deletion Warning</span>
            </h4>
            <p className="text-xs leading-relaxed text-rose-700">
              Are you sure you want to permanently delete section{" "}
              <strong className="font-mono text-rose-950">{section.sectionCode}</strong> (
              {section.subjectName})?
            </p>
            <p className="text-xs text-rose-700">
              This will permanently delete{" "}
              <strong>{section.sectionStudents.length} student records</strong>, all{" "}
              <strong>{section.gradeItems.length} grade items</strong>, scores, and snapshot history.
              This action cannot be undone.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600">
            <div className="font-semibold text-slate-800">Section Summary:</div>
            <div className="flex justify-between">
              <span>Section Name:</span>
              <span className="font-bold text-slate-800 font-mono">{section.sectionName}</span>
            </div>
            <div className="flex justify-between">
              <span>Course:</span>
              <span className="text-slate-800 truncate max-w-[200px]">{section.subjectName}</span>
            </div>
            <div className="flex justify-between">
              <span>Enrolled:</span>
              <span className="text-slate-800 font-semibold">{section.sectionStudents.length} students</span>
            </div>
          </div>

          {/* Confirmation input with copy/paste disabled */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-slate-700">
              To confirm deletion, please type{" "}
              <span
                className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded select-none border border-rose-200 cursor-not-allowed"
                onCopy={(e) => e.preventDefault()}
                title="Copying is disabled for security verification"
              >
                {section.sectionCode}
              </span>{" "}
              below:
            </label>
            <input
              type="text"
              value={confirmDeleteCode}
              onChange={(e) => setConfirmDeleteCode(e.target.value)}
              onPaste={(e) => {
                e.preventDefault();
              }}
              placeholder={`Type ${section.sectionCode} to confirm`}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-400"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-slate-400 italic">
              * Copy &amp; paste is disabled. Please type the section code manually.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteSectionModalOpen(false);
                setConfirmDeleteCode("");
              }}
              disabled={isDeletingSection}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteSection}
              disabled={
                isDeletingSection ||
                confirmDeleteCode.trim().toUpperCase() !== section.sectionCode.trim().toUpperCase()
              }
              className="gap-1.5 font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeletingSection ? (
                <span>Deleting Section...</span>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Delete Section</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Student Assessment Breakdown Pop-up Modal */}
      {reviewStudent && section && (
        <Modal
          isOpen={true}
          onClose={() => setReviewStudent(null)}
          title="Grade Breakdown"
          maxWidth="5xl"
        >
          {(() => {
            const recordsMap = new Map<string, number | null>();
            reviewStudent.gradeRecords.forEach((r) => recordsMap.set(r.gradeItemId, r.score));

            const renderScore = (item: GradeItem | null) => {
              if (!item) return <span className="text-slate-400 font-mono">-</span>;
              const score = recordsMap.get(item.id);
              if (score !== undefined && score !== null) {
                return (
                  <span>
                    <strong className="text-slate-900 font-mono font-bold">{score}</strong>
                    <span className="text-slate-400 font-normal font-mono"> / {item.maxScore}</span>
                  </span>
                );
              }
              return (
                <span>
                  <strong className="text-slate-400 font-mono font-bold">-</strong>
                  <span className="text-slate-400 font-normal font-mono"> / {item.maxScore}</span>
                </span>
              );
            };

            const midtermVal = getStudentMidtermGrade(reviewStudent);
            const finalVal = getStudentFinalGrade(reviewStudent);

            // Compute math components for formulas
            let cpMidScoreSum = 0;
            let cpMidHpsSum = 0;
            categorizedItems.cpMid.forEach((it) => {
              const sc = recordsMap.get(it.id);
              if (sc !== undefined && sc !== null) cpMidScoreSum += sc;
              cpMidHpsSum += it.maxScore;
            });

            let cpFinScoreSum = 0;
            let cpFinHpsSum = 0;
            categorizedItems.cpFin.forEach((it) => {
              const sc = recordsMap.get(it.id);
              if (sc !== undefined && sc !== null) cpFinScoreSum += sc;
              cpFinHpsSum += it.maxScore;
            });
            const cpTotalScoreSum = cpMidScoreSum + cpFinScoreSum;
            const cpTotalHpsSum = cpMidHpsSum + cpFinHpsSum;

            let eaMidScoreSum = 0;
            let eaMidHpsSum = 0;
            categorizedItems.eaMid.forEach((it) => {
              const sc = recordsMap.get(it.id);
              if (sc !== undefined && sc !== null) eaMidScoreSum += sc;
              eaMidHpsSum += it.maxScore;
            });

            let eaFinScoreSum = 0;
            let eaFinHpsSum = 0;
            categorizedItems.eaFin.forEach((it) => {
              const sc = recordsMap.get(it.id);
              if (sc !== undefined && sc !== null) eaFinScoreSum += sc;
              eaFinHpsSum += it.maxScore;
            });
            const eaTotalScoreSum = eaMidScoreSum + eaFinScoreSum;
            const eaTotalHpsSum = eaMidHpsSum + eaFinHpsSum;

            const mptScore = categorizedItems.mpt ? recordsMap.get(categorizedItems.mpt.id) ?? null : null;
            const mptHps = categorizedItems.mpt?.maxScore || 0;

            const cptScore = categorizedItems.cpt ? recordsMap.get(categorizedItems.cpt.id) ?? null : null;
            const cptHps = categorizedItems.cpt?.maxScore || 0;

            const bonusScore = (categorizedItems.bonus ? recordsMap.get(categorizedItems.bonus.id) : null) ?? 0;

            // Mathematical components using activeWeights
            const cpMidPart = cpMidHpsSum > 0 ? (cpMidScoreSum / cpMidHpsSum) * activeWeights.midterms.cp : 0;
            const eaMidPart = eaMidHpsSum > 0 ? (eaMidScoreSum / eaMidHpsSum) * activeWeights.midterms.ea : 0;
            const mptMidPart = mptHps > 0 && mptScore !== null ? (mptScore / mptHps) * activeWeights.midterms.mpt : 0;
            const computedMidPct = cpMidPart + eaMidPart + mptMidPart;

            const cpFinPart = cpTotalHpsSum > 0 ? (cpTotalScoreSum / cpTotalHpsSum) * activeWeights.finals.cp : 0;
            const eaFinPart = eaTotalHpsSum > 0 ? (eaTotalScoreSum / eaTotalHpsSum) * activeWeights.finals.ea : 0;
            const mptFinPart = mptHps > 0 && mptScore !== null ? (mptScore / mptHps) * activeWeights.finals.mpt : 0;
            const cptFinPart = cptHps > 0 && cptScore !== null ? (cptScore / cptHps) * activeWeights.finals.cpt : 0;
            const computedFinPct = cpFinPart + eaFinPart + mptFinPart + cptFinPart + bonusScore;

            // Evaluation Completion Analytics
            const totalAssessments =
              categorizedItems.cpMid.length +
              categorizedItems.cpFin.length +
              categorizedItems.eaMid.length +
              categorizedItems.eaFin.length +
              (categorizedItems.mpt ? 1 : 0) +
              (categorizedItems.cpt ? 1 : 0);

            let recordedCount = 0;
            categorizedItems.cpMid.forEach((it) => { if (recordsMap.get(it.id) != null) recordedCount++; });
            categorizedItems.cpFin.forEach((it) => { if (recordsMap.get(it.id) != null) recordedCount++; });
            categorizedItems.eaMid.forEach((it) => { if (recordsMap.get(it.id) != null) recordedCount++; });
            categorizedItems.eaFin.forEach((it) => { if (recordsMap.get(it.id) != null) recordedCount++; });
            if (mptScore !== null) recordedCount++;
            if (cptScore !== null) recordedCount++;

            const completionPct = totalAssessments > 0 ? Math.round((recordedCount / totalAssessments) * 100) : 0;
            const cpMasteryPct = cpTotalHpsSum > 0 ? Math.round((cpTotalScoreSum / cpTotalHpsSum) * 100) : 0;
            const eaMasteryPct = eaTotalHpsSum > 0 ? Math.round((eaTotalScoreSum / eaTotalHpsSum) * 100) : 0;
            const mptPct = mptHps > 0 && mptScore !== null ? Math.round((mptScore / mptHps) * 100) : 0;
            const cptPct = cptHps > 0 && cptScore !== null ? Math.round((cptScore / cptHps) * 100) : 0;

            // Academic Standing Indicator Factor (reactively calculated using activeWeights)
            let effectivePct = computedFinPct > 0 ? computedFinPct : (computedMidPct > 0 ? computedMidPct : 0);
            if (effectivePct === 0 && finalVal && finalVal !== "-") {
              const num = parseFloat(finalVal.replace("%", "").trim());
              if (!isNaN(num)) {
                if (num <= 5.0 && num >= 1.0) {
                  effectivePct = Math.max(0, Math.min(100, 100 - (num - 1.0) * 12.5));
                } else {
                  effectivePct = num;
                }
              }
            }

            const getStandingFactor = () => {
              if (recordedCount === 0 && effectivePct === 0) {
                return {
                  status: "Pending Evaluation",
                  label: "Awaiting Assessment Submissions",
                  badge: "bg-slate-100 text-slate-700 border-slate-200",
                  dot: "bg-slate-400",
                  summary: "No assessment scores have been recorded yet. Import or enter scores to generate standing analytics.",
                  icon: Clock,
                  cardBg: "bg-slate-50 border-slate-200",
                };
              }
              if (effectivePct >= 90) {
                return {
                  status: "Dean's List Standing",
                  label: "High Academic Honors (Grade 3.5 - 4.0)",
                  badge: "bg-emerald-50 text-emerald-800 border-emerald-300",
                  dot: "bg-emerald-500",
                  summary: "Exceptional mastery observed across Class Participation, Enabling Activities, and Performance Milestones.",
                  icon: Award,
                  cardBg: "bg-emerald-50/50 border-emerald-200",
                };
              }
              if (effectivePct >= 80) {
                return {
                  status: "Strong Academic Standing",
                  label: "Very Good Standing (Grade 2.5 - 3.0)",
                  badge: "bg-blue-50 text-blue-800 border-blue-300",
                  dot: "bg-blue-500",
                  summary: "Consistent above-average performance; comfortably meeting all course competencies.",
                  icon: TrendingUp,
                  cardBg: "bg-blue-50/50 border-blue-200",
                };
              }
              if (effectivePct >= 75) {
                return {
                  status: "Good Academic Standing",
                  label: "Satisfactory Standing (Grade 2.0)",
                  badge: "bg-sky-50 text-sky-800 border-sky-300",
                  dot: "bg-sky-500",
                  summary: "Satisfactory coursework performance meeting institutional benchmark standards.",
                  icon: CheckCircle2,
                  cardBg: "bg-sky-50/40 border-sky-200",
                };
              }
              if (effectivePct >= 60) {
                return {
                  status: "Passing Standing",
                  label: "Passing Standing (Grade 1.0 - 1.5)",
                  badge: "bg-amber-50 text-amber-800 border-amber-300",
                  dot: "bg-amber-500",
                  summary: "Student is currently near the passing line. Consider academic consultation prior to final tasks.",
                  icon: AlertTriangle,
                  cardBg: "bg-amber-50/50 border-amber-200",
                };
              }
              return {
                status: "Consultation Advised",
                label: "Academic Intervention Recommended",
                badge: "bg-rose-50 text-rose-800 border-rose-300",
                dot: "bg-rose-500",
                summary: "Cumulative score falls below passing criteria. Targeted follow-up and remedial guidance advised.",
                icon: AlertTriangle,
                cardBg: "bg-rose-50/60 border-rose-200",
              };
            };

            const standing = getStandingFactor();
            const StandingIcon = standing.icon;

            // Render Item Row (clean title + score fraction, no graph as requested)
            const renderItemRow = (item: GradeItem) => {
              const score = recordsMap.get(item.id);
              const isRecorded = score !== undefined && score !== null;

              return (
                <div
                  key={item.id}
                  className="py-2 px-3 rounded-lg hover:bg-slate-50/90 transition-colors border border-slate-100 flex items-center justify-between gap-3 text-xs"
                >
                  <span className="text-slate-800 font-medium truncate" title={item.name}>
                    {item.name}
                  </span>
                  <div className="font-mono text-xs shrink-0 text-right">
                    {isRecorded ? (
                      <span>
                        <strong className="text-slate-900 font-bold">{score}</strong>
                        <span className="text-slate-400 font-normal"> / {item.maxScore}</span>
                      </span>
                    ) : (
                      <span>
                        <strong className="text-slate-400 font-bold">-</strong>
                        <span className="text-slate-400 font-normal"> / {item.maxScore}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-4 text-xs max-h-[78vh] overflow-y-auto pr-1.5">
                {/* 1. Student Identity & Academic Standing Factor Indicator */}
                <div className={`p-4 rounded-xl border ${standing.cardBg} transition-all`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-mono font-medium text-slate-600 text-xs block">
                        {reviewStudent.student.studentNumber}
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                        {reviewStudent.student.displayName}
                      </h3>
                    </div>

                    {/* Standing Pill Factor */}
                    <div className="flex sm:flex-col sm:items-end gap-2 shrink-0">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${standing.badge}`}>
                        <StandingIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{standing.status}</span>
                      </div>
                      <StatusChip status={reviewStudent.finalGradeStatus || "PROVISIONAL"} />
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center gap-2 text-xs text-slate-600">
                    <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="leading-snug">
                      {standing.summary}{" "}
                      <span className="font-mono font-semibold text-slate-700">
                        ({recordedCount}/{totalAssessments} assessments recorded)
                      </span>
                    </span>
                  </div>
                </div>

                {/* 3. Executive Grade Visualizer with Multi-Segment Progress Bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Midterm Grade Card */}
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Midterm Benchmark
                        </span>
                        <div className="text-2xl font-black font-mono text-slate-900">
                          {midtermVal}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                          Computed Factor
                        </span>
                        <span className="text-sm font-black font-mono text-slate-800">
                          {computedMidPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Multi-Segment Contribution Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                        <div
                          className="bg-teal-500 h-full transition-all duration-500"
                          style={{ width: `${Math.min(activeWeights.midterms.cp, cpMidPart)}%` }}
                          title={`CP: ${cpMidPart.toFixed(1)}%`}
                        />
                        <div
                          className="bg-indigo-500 h-full transition-all duration-500"
                          style={{ width: `${Math.min(activeWeights.midterms.ea, eaMidPart)}%` }}
                          title={`EA: ${eaMidPart.toFixed(1)}%`}
                        />
                        <div
                          className="bg-blue-600 h-full transition-all duration-500"
                          style={{ width: `${Math.min(activeWeights.midterms.mpt, mptMidPart)}%` }}
                          title={`MPT: ${mptMidPart.toFixed(1)}%`}
                        />
                      </div>

                      {/* Legend Chips */}
                      <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5 flex-wrap gap-1">
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          CP: <strong>+{cpMidPart.toFixed(1)}%</strong> ({activeWeights.midterms.cp}%)
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          EA: <strong>+{eaMidPart.toFixed(1)}%</strong> ({activeWeights.midterms.ea}%)
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          MPT: <strong>+{mptMidPart.toFixed(1)}%</strong> ({activeWeights.midterms.mpt}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Final Grade Card */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                          Overall Course Mark
                        </span>
                        <div className="text-2xl font-black font-mono text-blue-950">
                          {finalVal}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-blue-800/70 block uppercase">
                          Computed Factor
                        </span>
                        <span className="text-sm font-black font-mono text-blue-950">
                          {computedFinPct.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Multi-Segment Contribution Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                        <div
                          className="bg-teal-500 h-full transition-all duration-500"
                          style={{ width: `${Math.min(activeWeights.finals.cp, cpFinPart)}%` }}
                          title={`CP: ${cpFinPart.toFixed(1)}%`}
                        />
                        <div
                          className="bg-indigo-500 h-full transition-all duration-500"
                          style={{ width: `${Math.min(activeWeights.finals.ea, eaFinPart)}%` }}
                          title={`EA: ${eaFinPart.toFixed(1)}%`}
                        />
                        <div
                          className="bg-blue-600 h-full transition-all duration-500"
                          style={{ width: `${Math.min(activeWeights.finals.mpt, mptFinPart)}%` }}
                          title={`MPT: ${mptFinPart.toFixed(1)}%`}
                        />
                        <div
                          className="bg-purple-600 h-full transition-all duration-500"
                          style={{ width: `${Math.min(activeWeights.finals.cpt, cptFinPart)}%` }}
                          title={`CPT: ${cptFinPart.toFixed(1)}%`}
                        />
                        {bonusScore > 0 && (
                          <div
                            className="bg-emerald-500 h-full transition-all duration-500"
                            style={{ width: `${Math.min(10, bonusScore)}%` }}
                            title={`Bonus: +${bonusScore} pts`}
                          />
                        )}
                      </div>

                      {/* Legend Chips */}
                      <div className="flex items-center justify-between text-[10px] text-slate-600 pt-0.5 flex-wrap gap-1">
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          CP: <strong>+{cpFinPart.toFixed(1)}%</strong>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          EA: <strong>+{eaFinPart.toFixed(1)}%</strong>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          MPT: <strong>+{mptFinPart.toFixed(1)}%</strong>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                          CPT: <strong>+{cptFinPart.toFixed(1)}%</strong>
                        </span>
                        {bonusScore > 0 && (
                          <span className="flex items-center gap-1 font-mono text-emerald-700 font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            +{bonusScore} Bonus
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Detailed Assessment Breakdown Grids */}
                {/* 4A. Class Participation (CP) Grid */}
                <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs tracking-wide uppercase">
                      Class Participation (CP)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        Total: {cpTotalScoreSum} / {cpTotalHpsSum} HPS
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    {/* Midterms (Week 1 to Week 7) */}
                    <div className="p-3.5 space-y-2">
                      <div className="text-[11px] font-bold text-teal-900 pb-1.5 border-b border-slate-100 uppercase tracking-wider flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>Midterms (Week 1 to Week 7)</span>
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono font-semibold">
                          Subtotal: {cpMidScoreSum}/{cpMidHpsSum}
                        </span>
                      </div>

                      {categorizedItems.cpMid.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 font-mono text-xs">-</div>
                      ) : (
                        <div className="space-y-1.5">
                          {categorizedItems.cpMid.map((item) => renderItemRow(item))}
                        </div>
                      )}
                    </div>

                    {/* Post Midterms (Week 8 to Week 13) */}
                    <div className="p-3.5 space-y-2">
                      <div className="text-[11px] font-bold text-teal-900 pb-1.5 border-b border-slate-100 uppercase tracking-wider flex items-center justify-between">
                        <span>Post Midterms (Week 8 to Week 13)</span>
                        <span className="text-[10px] text-slate-600 font-mono font-semibold">
                          Subtotal: {cpFinScoreSum}/{cpFinHpsSum}
                        </span>
                      </div>

                      {categorizedItems.cpFin.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 font-mono text-xs">-</div>
                      ) : (
                        <div className="space-y-1.5">
                          {categorizedItems.cpFin.map((item) => renderItemRow(item))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4B. Enabling Activities (EA) Grid */}
                <div className="rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs tracking-wide uppercase">
                      Enabling Activities (EA)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        Total: {eaTotalScoreSum} / {eaTotalHpsSum} HPS
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                    {/* Midterms (Week 1 to Week 7) */}
                    <div className="p-3.5 space-y-2">
                      <div className="text-[11px] font-bold text-indigo-900 pb-1.5 border-b border-slate-100 uppercase tracking-wider flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>Midterms (Week 1 to Week 7)</span>
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono font-semibold">
                          Subtotal: {eaMidScoreSum}/{eaMidHpsSum}
                        </span>
                      </div>

                      {categorizedItems.eaMid.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 font-mono text-xs">-</div>
                      ) : (
                        <div className="space-y-1.5">
                          {categorizedItems.eaMid.map((item) => renderItemRow(item))}
                        </div>
                      )}
                    </div>

                    {/* Post Midterms (Week 8 to Week 13) */}
                    <div className="p-3.5 space-y-2">
                      <div className="text-[11px] font-bold text-indigo-900 pb-1.5 border-b border-slate-100 uppercase tracking-wider flex items-center justify-between">
                        <span>Post Midterms (Week 8 to Week 13)</span>
                        <span className="text-[10px] text-slate-600 font-mono font-semibold">
                          Subtotal: {eaFinScoreSum}/{eaFinHpsSum}
                        </span>
                      </div>

                      {categorizedItems.eaFin.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 font-mono text-xs">-</div>
                      ) : (
                        <div className="space-y-1.5">
                          {categorizedItems.eaFin.map((item) => renderItemRow(item))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4C. Performance Tasks & Bonus Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* MPT */}
                  <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Major PT (MPT)
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate" title={categorizedItems.mpt?.name || "MPT"}>
                      {categorizedItems.mpt?.name || "Major Performance Task"}
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                      <div className="text-sm font-bold font-mono text-slate-900">
                        {renderScore(categorizedItems.mpt)}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        {mptPct}%
                      </span>
                    </div>
                  </div>

                  {/* CPT */}
                  <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Culminating PT (CPT)
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate" title={categorizedItems.cpt?.name || "CPT"}>
                      {categorizedItems.cpt?.name || "Culminating Performance Task"}
                    </div>
                    <div className="flex items-baseline justify-between pt-0.5">
                      <div className="text-sm font-bold font-mono text-slate-900">
                        {renderScore(categorizedItems.cpt)}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">
                        {cptPct}%
                      </span>
                    </div>
                  </div>

                  {/* BONUS */}
                  <div className="p-3.5 rounded-xl border border-slate-200/90 bg-white space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Bonus Points
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate" title={categorizedItems.bonus?.name || "BONUS"}>
                      {categorizedItems.bonus?.name || "Bonus Points"}
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="text-sm font-bold font-mono text-slate-900">
                        {(() => {
                          if (!categorizedItems.bonus) return <span className="text-slate-400 font-mono">-</span>;
                          const sc = recordsMap.get(categorizedItems.bonus.id);
                          if (sc !== undefined && sc !== null && sc > 0) {
                            return <span className="text-emerald-700 font-bold">+{sc} pts</span>;
                          }
                          return <span className="text-slate-400 font-mono">-</span>;
                        })()}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Cumulative
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Configured Weight Matrix & Math Breakdown (Formula Transparency) */}
                <div className="space-y-2.5 pt-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Configured Percentage Arithmetic Breakdown</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-500">
                      Based on Section Percentage Allocation Settings
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Midterms Computation Card */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                        <span className="font-bold text-slate-900 text-xs">Midterm Grade Math</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-200/80 font-bold text-slate-700">
                          {activeWeights.midterms.cp}% + {activeWeights.midterms.ea}% + {activeWeights.midterms.mpt}%
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Class Participation ({activeWeights.midterms.cp}%):</span>
                          <span className="font-mono text-slate-800">
                            {cpMidHpsSum > 0 ? (
                              <span>
                                ({cpMidScoreSum}/{cpMidHpsSum}) &times; {activeWeights.midterms.cp}% = <strong className="text-slate-900">{cpMidPart.toFixed(2)}%</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Enabling Activities ({activeWeights.midterms.ea}%):</span>
                          <span className="font-mono text-slate-800">
                            {eaMidHpsSum > 0 ? (
                              <span>
                                ({eaMidScoreSum}/{eaMidHpsSum}) &times; {activeWeights.midterms.ea}% = <strong className="text-slate-900">{eaMidPart.toFixed(2)}%</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Major Performance Task ({activeWeights.midterms.mpt}%):</span>
                          <span className="font-mono text-slate-800">
                            {mptHps > 0 && mptScore !== null ? (
                              <span>
                                ({mptScore}/{mptHps}) &times; {activeWeights.midterms.mpt}% = <strong className="text-slate-900">{mptMidPart.toFixed(2)}%</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400">(- / {mptHps || 50}) &times; {activeWeights.midterms.mpt}% = 0.00%</span>
                            )}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                          <span className="text-slate-900 font-bold text-xs">Total Midterm Sum:</span>
                          <span className="font-mono text-blue-900 font-black text-sm">
                            {cpMidHpsSum > 0 || eaMidHpsSum > 0 ? `${computedMidPct.toFixed(2)}%` : "-"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Finals Computation Card */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-blue-200/70">
                        <span className="font-bold text-blue-950 text-xs">Final Grade Math</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-100 font-bold text-blue-900">
                          {activeWeights.finals.cp}% + {activeWeights.finals.ea}% + {activeWeights.finals.mpt}% + {activeWeights.finals.cpt}% + Bonus
                        </span>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Class Participation Total ({activeWeights.finals.cp}%):</span>
                          <span className="font-mono text-slate-800">
                            {cpTotalHpsSum > 0 ? (
                              <span>
                                ({cpTotalScoreSum}/{cpTotalHpsSum}) &times; {activeWeights.finals.cp}% = <strong className="text-slate-900">{cpFinPart.toFixed(2)}%</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Enabling Activities Total ({activeWeights.finals.ea}%):</span>
                          <span className="font-mono text-slate-800">
                            {eaTotalHpsSum > 0 ? (
                              <span>
                                ({eaTotalScoreSum}/{eaTotalHpsSum}) &times; {activeWeights.finals.ea}% = <strong className="text-slate-900">{eaFinPart.toFixed(2)}%</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Major PT - Midterm Exam ({activeWeights.finals.mpt}%):</span>
                          <span className="font-mono text-slate-800">
                            {mptHps > 0 && mptScore !== null ? (
                              <span>
                                ({mptScore}/{mptHps}) &times; {activeWeights.finals.mpt}% = <strong className="text-slate-900">{mptFinPart.toFixed(2)}%</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400">(- / {mptHps || 50}) &times; {activeWeights.finals.mpt}% = 0.00%</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Culminating PT - Final Project ({activeWeights.finals.cpt}%):</span>
                          <span className="font-mono text-slate-800">
                            {cptHps > 0 && cptScore !== null ? (
                              <span>
                                ({cptScore}/{cptHps}) &times; {activeWeights.finals.cpt}% = <strong className="text-slate-900">{cptFinPart.toFixed(2)}%</strong>
                              </span>
                            ) : (
                              <span className="text-slate-400">(- / {cptHps || 50}) &times; {activeWeights.finals.cpt}% = 0.00%</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Bonus Points:</span>
                          <span className="font-mono text-slate-800">
                            {bonusScore > 0 ? (
                              <strong className="text-emerald-700">+{bonusScore.toFixed(2)} pts</strong>
                            ) : (
                              <span className="text-slate-400">+0.00 pts</span>
                            )}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
                          <span className="text-blue-950 font-bold text-xs">Total Final Cumulative:</span>
                          <span className="font-mono text-blue-950 font-black text-sm">
                            {cpTotalHpsSum > 0 || eaTotalHpsSum > 0 ? `${computedFinPct.toFixed(2)}%` : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remarks if present and genuine (suppress student consultation advisory notice on professor side) */}
                {(() => {
                  if (!reviewStudent.remarks) return null;
                  const filteredRemarks = reviewStudent.remarks
                    .split("|")
                    .map((part) => part.trim())
                    .filter((part) => {
                      const u = part.toUpperCase();
                      return (
                        !u.includes("KINDLY CONTACT") &&
                        !u.includes("UNAVAILABLE") &&
                        !u.includes("UNAVAIBLE") &&
                        !u.includes("GRADE IS") &&
                        !u.includes("GRADES IS") &&
                        !u.startsWith("MIDTERM:")
                      );
                    })
                    .join(" | ");

                  if (!filteredRemarks) return null;

                  return (
                    <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-xs leading-relaxed">
                      <strong className="font-semibold">Professor Remarks: </strong>
                      <span>{filteredRemarks}</span>
                    </div>
                  );
                })()}

                <div className="pt-2 flex justify-end">
                  <Button size="sm" onClick={() => setReviewStudent(null)}>
                    Close Breakdown
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
