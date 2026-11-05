"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Plus,
  FileSpreadsheet,
  Users,
  Clock,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  FolderPlus,
  KeyRound,
  Download,
  Search,
  Filter,
  ShieldCheck,
  History,
  ExternalLink,
  ChevronRight,
  UploadCloud,
  X,
  Check,
  Layers,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { StatusChip } from "@/components/ui/Badge";
import { MasterWorkbookImportModal } from "@/components/professor/MasterWorkbookImportModal";
import { formatDate } from "@/lib/utils";
import { isRValue } from "@/lib/snapshot";
import { getCachedData, setCachedData } from "@/lib/client-cache";

interface SectionItem {
  id: string;
  sectionCode: string;
  sectionName: string;
  subjectName: string;
  academicYear: string;
  term: string;
  status: string;
  updatedAt: string;
  publishedAt: string | null;
  _count: {
    sectionStudents: number;
    gradeItems: number;
  };
}

interface StudentItem {
  id: string;
  finalGrade: string | null;
  finalGradeStatus: string;
  credentialStatus: string;
  lastAccessAt: string | null;
  student: {
    studentNumber: string;
    displayName: string;
  };
  section: {
    id: string;
    sectionCode: string;
    subjectName: string;
  };
}

interface ActivityItem {
  id: string;
  fileName: string;
  status: string;
  createdCount: number;
  updatedCount: number;
  createdAt: string;
  section: {
    id: string;
    sectionCode: string;
    subjectName: string;
  };
}

export default function ProfessorDashboardPage() {
  const router = useRouter();

  // Safe SSR state
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");

  // Fast Import & Master Import Modal states
  const [isFastImportOpen, setIsFastImportOpen] = useState(false);
  const [isMasterImportOpen, setIsMasterImportOpen] = useState(false);

  // Delete Section state
  const [sectionToDelete, setSectionToDelete] = useState<SectionItem | null>(null);
  const [confirmCodeInput, setConfirmCodeInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/professor/sections/${sectionToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete section");
      }
      setSectionToDelete(null);
      setConfirmCodeInput("");
      await loadDashboardData();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete section");
    } finally {
      setIsDeleting(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const [secRes, stuRes, actRes] = await Promise.all([
        fetch("/api/professor/sections"),
        fetch("/api/professor/students"),
        fetch("/api/professor/activity"),
      ]);

      if (!secRes.ok) {
        if (secRes.status === 401) {
          router.push("/admin_mis");
          return;
        }
        throw new Error("Failed to load sections");
      }

      const secData = await secRes.json();
      const freshSections: SectionItem[] = secData.sections || [];
      setSections(freshSections);
      setCachedData("prof_sections", freshSections);

      if (stuRes.ok) {
        const stuData = await stuRes.json();
        setStudents(stuData.students || []);
      }

      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.imports || []);
      }

      setIsLoading(false);
    } catch {
      setError("Failed to load dashboard data");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // SWR instant paint from client cache
    const cached = getCachedData<SectionItem[]>("prof_sections");
    if (cached && cached.length > 0) {
      setSections(cached);
      setIsLoading(false);
    }
    loadDashboardData();

    const handleFocus = () => loadDashboardData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [router]);

  // Preload section details on hover into client cache
  const prefetchSection = async (sectionId: string) => {
    try {
      if (!getCachedData(`gv_sec_${sectionId}`)) {
        const res = await fetch(`/api/professor/sections/${sectionId}`, { priority: "low" });
        if (res.ok) {
          const data = await res.json();
          if (data.section) {
            setCachedData(`gv_sec_${sectionId}`, data.section);
          }
        }
      }
    } catch {}
  };

  // Metrics computation
  const totalSections = sections.length;
  const publishedSections = sections.filter((s) => s.status === "PUBLISHED").length;
  const draftSections = sections.filter((s) => s.status === "DRAFT").length;
  const publishRate = totalSections > 0 ? Math.round((publishedSections / totalSections) * 100) : 0;

  const totalStudents = students.length;
  const viewedStudents = students.filter((s) => s.lastAccessAt !== null).length;
  const viewRate = totalStudents > 0 ? Math.round((viewedStudents / totalStudents) * 100) : 0;

  const atRiskStudents = useMemo(() => {
    return students.filter((s) => isRValue(s.finalGrade));
  }, [students]);

  // Section view map
  const sectionViewMap = useMemo(() => {
    const map = new Map<string, { total: number; viewed: number }>();
    students.forEach((s) => {
      const cur = map.get(s.section.id) || { total: 0, viewed: 0 };
      cur.total += 1;
      if (s.lastAccessAt) cur.viewed += 1;
      map.set(s.section.id, cur);
    });
    return map;
  }, [students]);

  // Filtered sections
  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      if (statusFilter === "PUBLISHED" && s.status !== "PUBLISHED") return false;
      if (statusFilter === "DRAFT" && s.status !== "DRAFT") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const code = s.sectionCode.toLowerCase();
        const name = s.sectionName.toLowerCase();
        const subj = s.subjectName.toLowerCase();
        return code.includes(q) || name.includes(q) || subj.includes(q);
      }
      return true;
    });
  }, [sections, statusFilter, searchQuery]);

  return (
    <div className="space-y-7">
      {/* 1. TOP EXECUTIVE STATUS BAR & QUICK ACTION DOCK */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Faculty Workspace
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Faculty Command Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Monitor publication progress, track student engagement, and review consultation alerts across all your course sections.
            </p>
          </div>

          {/* Quick Action Dock */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsMasterImportOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/90 transition-all shadow-2xs cursor-pointer"
              title="Upload master institutional class record with Cover Page and multiple sections"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Master Workbook</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFastImportOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
              title="Select a section and upload a class record"
            >
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>Fast Import</span>
            </button>

            <a
              href="/class_record.xlsx"
              download="master_class_record.xlsx"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs"
              title="Download official Master Class Record (Multi-Section with Cover Page, 3.6 MB)"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Master Workbook (.xlsx)</span>
            </a>

            <a
              href="/template.xlsx"
              download="class_record_template.xlsx"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs"
              title="Download official National University template"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download Template</span>
            </a>

            <Link href="/professor/credentials">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
                title="Manage student login credentials"
              >
                <KeyRound className="w-4 h-4 text-purple-600" />
                <span>Credentials Vault</span>
              </button>
            </Link>

            <Link href="/professor/sections/new">
              <Button size="md" variant="primary" className="gap-2 shadow-xs font-bold text-xs tracking-wide">
                <Plus className="w-4 h-4 text-white" />
                <span>Create Section</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. THE EXECUTIVE "AT-A-GLANCE" STATUS BAR (4 ACTIONABLE KPIS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Sections */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Sections</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          {isLoading && sections.length === 0 ? (
            <div className="w-16 h-8 bg-slate-100 rounded-lg animate-pulse mt-2" />
          ) : (
            <div suppressHydrationWarning className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">
              {totalSections}
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
            {publishedSections} Published &bull; {draftSections} Draft
          </div>
        </div>

        {/* KPI 2: Publication Progress */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Publication</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {isLoading && sections.length === 0 ? (
            <div className="w-24 h-8 bg-slate-100 rounded-lg animate-pulse mt-2" />
          ) : (
            <div suppressHydrationWarning className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tabular-nums flex items-baseline gap-2">
              <span>{publishRate}%</span>
              <span className="text-xs font-medium text-slate-400">({publishedSections}/{totalSections})</span>
            </div>
          )}
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${publishRate}%` }}
            />
          </div>
        </div>

        {/* KPI 3: Student View Rate */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Portal Checked</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          {isLoading && sections.length === 0 ? (
            <div className="w-24 h-8 bg-slate-100 rounded-lg animate-pulse mt-2" />
          ) : (
            <div suppressHydrationWarning className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tabular-nums flex items-baseline gap-2">
              <span>{viewRate}%</span>
              <span className="text-xs font-medium text-slate-400">({viewedStudents}/{totalStudents})</span>
            </div>
          )}
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${viewRate}%` }}
            />
          </div>
        </div>

        {/* KPI 4: Consultation / At-Risk */}
        <Link href="/professor/students" className="block group">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-300 hover:shadow-sm transition-all h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider group-hover:text-amber-800 transition-colors">
                At-Risk Watchlist
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            {isLoading && sections.length === 0 ? (
              <div className="w-16 h-8 bg-slate-100 rounded-lg animate-pulse mt-2" />
            ) : (
              <div suppressHydrationWarning className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-2 tabular-nums">
                {atRiskStudents.length}
              </div>
            )}
            <div className="text-[11px] text-amber-700 mt-0.5 font-medium flex items-center gap-1">
              <span>Consultation Advised (R)</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* 3. MAIN WORKSPACE (70% LEFT SECTIONS MATRIX / 30% RIGHT INTELLIGENCE SIDEBAR) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: COURSE SECTIONS (8 OF 12 COLS ≈ 67%) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Section Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search course title or section code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-800 placeholder:text-slate-400 font-medium bg-slate-50/50"
              />
            </div>

            {/* Filter Pills */}
            <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({sections.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PUBLISHED")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === "PUBLISHED"
                    ? "bg-emerald-100 text-emerald-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Published ({publishedSections})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DRAFT")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === "DRAFT"
                    ? "bg-amber-100 text-amber-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Draft ({draftSections})
              </button>
            </div>
          </div>

          {/* Sections List */}
          {isLoading && sections.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-5 space-y-4 animate-pulse shadow-xs">
                  <div className="flex justify-between items-center">
                    <div className="w-20 h-5 bg-slate-100 rounded-full" />
                    <div className="w-16 h-5 bg-slate-100 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="w-3/4 h-5 bg-slate-100 rounded-md" />
                    <div className="w-1/2 h-4 bg-slate-50 rounded-md" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="w-full h-3 bg-slate-100 rounded" />
                    <div className="w-2/3 h-3 bg-slate-50 rounded" />
                  </div>
                  <div className="w-full h-9 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
                <FolderPlus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No sections found</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1 mb-5 font-normal">
                {searchQuery ? "No course sections match your search query." : "Create your first course section to upload Excel gradebooks."}
              </p>
              <Link href="/professor/sections/new">
                <Button size="sm" variant="primary" className="gap-2 font-semibold">
                  <Plus className="w-4 h-4 text-white" />
                  <span>Create Section</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSections.map((section) => {
                const viewStats = sectionViewMap.get(section.id) || {
                  total: section._count.sectionStudents,
                  viewed: 0,
                };
                const sectionViewPct =
                  viewStats.total > 0 ? Math.round((viewStats.viewed / viewStats.total) * 100) : 0;

                return (
                  <div
                    key={section.id}
                    onMouseEnter={() => prefetchSection(section.id)}
                    className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs group"
                  >
                    <div>
                      {/* Card Header Strip */}
                      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Code:</span>
                            <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold border border-slate-200/80 tracking-wider">
                              {section.sectionCode}
                            </span>
                          </div>
                          <StatusChip status={section.status} />
                        </div>

                        <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-[#2563EB] transition-colors">
                          {section.subjectName}
                        </h3>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">
                          Section: <span className="text-slate-900 font-bold">{section.sectionName}</span>
                        </p>
                      </div>

                      {/* Card Content Stats */}
                      <div className="p-4 sm:p-5 text-xs space-y-2.5">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-medium text-slate-500">Term / AY:</span>
                          <span className="font-semibold text-slate-800">
                            {section.term} &bull; {section.academicYear}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-medium text-slate-500">Enrolled Students:</span>
                          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60 font-mono">
                            {section._count.sectionStudents} students
                          </span>
                        </div>

                        {/* Student View Rate Bar */}
                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium">Student Check-In:</span>
                            <span className="font-bold text-slate-800 font-mono">
                              {viewStats.viewed}/{viewStats.total} ({sectionViewPct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${sectionViewPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-slate-500 text-[10px] pt-1">
                          <span>Last updated:</span>
                          <span className="font-mono text-slate-600">{formatDate(section.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3.5 sm:p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/professor/sections/${section.id}/credentials`}
                          title="Student Credentials"
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 cursor-pointer inline-flex items-center justify-center"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/professor/sections/${section.id}/import`}
                          title="Import Spreadsheet"
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 cursor-pointer inline-flex items-center justify-center"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteError("");
                            setConfirmCodeInput("");
                            setSectionToDelete(section);
                          }}
                          title="Delete Section"
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer inline-flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <Link
                        href={`/professor/sections/${section.id}`}
                        prefetch={true}
                        className="inline-flex items-center justify-center font-semibold tracking-tight transition-all rounded-xl active:scale-[0.98] bg-[#2563EB] text-white hover:bg-[#1D4ED8] border border-blue-700/20 shadow-xs h-8 px-3 text-xs gap-1.5"
                      >
                        <span>Open Section</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACADEMIC INTELLIGENCE SIDEBAR (4 OF 12 COLS ≈ 33%) */}
        <div className="lg:col-span-4 space-y-5">
          {/* WIDGET A: AT-RISK / CONSULTATION WATCHLIST */}
          <Card className="border border-slate-200/90 shadow-xs rounded-2xl bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  At-Risk Watchlist
                </h2>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {atRiskStudents.length} Students
              </span>
            </div>

            <div className="p-4">
              {isLoading && students.length === 0 ? (
                <div className="space-y-3 animate-pulse py-1">
                  <div className="w-3/4 h-3 bg-slate-100 rounded" />
                  <div className="space-y-2 pt-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                        <div className="space-y-1.5 w-2/3">
                          <div className="w-3/4 h-3 bg-slate-100 rounded" />
                          <div className="w-1/2 h-2.5 bg-slate-50 rounded" />
                        </div>
                        <div className="w-6 h-5 bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : atRiskStudents.length === 0 ? (
                <div className="py-6 text-center text-xs space-y-1.5">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-bold text-slate-800">All Clear</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    All currently enrolled students are meeting the standard grade threshold (&ge; 60.0%).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Students meeting the &apos;R&apos; threshold (&lt; 60%) who require academic guidance prior to final grade closing:
                  </p>
                  <div className="divide-y divide-slate-100">
                    {atRiskStudents.slice(0, 5).map((s) => (
                      <div key={s.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate leading-snug">
                            {s.student.displayName}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {s.student.studentNumber} &bull; {s.section.sectionCode}
                          </p>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded font-bold font-mono text-[11px] bg-amber-100 text-amber-900 border border-amber-300">
                          R
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link href="/professor/students" className="block pt-2">
                    <button
                      type="button"
                      className="w-full text-center py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-[#2563EB] border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>View All In Master Directory</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </Card>

          {/* WIDGET B: RECENT AUDIT & SPREADSHEET UPLOADS */}
          <Card className="border border-slate-200/90 shadow-xs rounded-2xl bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Activity Log
                </h2>
              </div>
              <Link href="/professor/activity" className="text-[11px] font-semibold text-[#2563EB] hover:underline">
                View All
              </Link>
            </div>

            <div className="p-4">
              {isLoading && activities.length === 0 ? (
                <div className="space-y-3.5 animate-pulse py-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-slate-100 rounded-lg shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="w-3/4 h-3 bg-slate-100 rounded" />
                        <div className="w-1/2 h-2.5 bg-slate-50 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No spreadsheet uploads recorded yet.
                </div>
              ) : (
                <div className="space-y-3.5 text-xs">
                  {activities.slice(0, 4).map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-semibold text-slate-900 truncate leading-snug">
                          {act.fileName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {act.section?.subjectName} ({act.section?.sectionCode})
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {new Date(act.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 4. FAST IMPORT SELECTOR MODAL */}
      {isFastImportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Fast Gradebook Import</h3>
                  <p className="text-xs text-slate-500">Select which course section to import grades into</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFastImportOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {sections.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No sections available to import.</p>
              ) : (
                sections.map((sec) => (
                  <Link
                    key={sec.id}
                    href={`/professor/sections/${sec.id}/import`}
                    onClick={() => setIsFastImportOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all text-xs group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{sec.sectionCode}</span>
                        <StatusChip status={sec.status} />
                      </div>
                      <p className="text-slate-700 font-semibold mt-0.5">{sec.subjectName}</p>
                      <p className="text-[11px] text-slate-400">{sec._count.sectionStudents} enrolled students</p>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                      <span>Import</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFastImportOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* 5. MASTER MULTI-SECTION WORKBOOK IMPORT MODAL */}
      <MasterWorkbookImportModal
        isOpen={isMasterImportOpen}
        onClose={() => setIsMasterImportOpen(false)}
        onSuccess={() => {
          setIsMasterImportOpen(false);
          loadDashboardData();
        }}
      />

      {/* 6. DELETE SECTION CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(sectionToDelete)}
        onClose={() => {
          if (!isDeleting) setSectionToDelete(null);
        }}
        title="Delete Course Section"
        description="Permanently remove this section and all associated records"
        maxWidth="md"
      >
        {sectionToDelete && (
          <div className="p-6 space-y-4 text-xs">
            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Permanent Deletion Warning</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                You are about to delete{" "}
                <strong className="font-semibold text-rose-950 font-mono">
                  {sectionToDelete.sectionCode}
                </strong>{" "}
                ({sectionToDelete.subjectName}).
              </p>
              <p className="text-xs text-rose-700">
                This will permanently delete{" "}
                <strong>{sectionToDelete._count.sectionStudents} enrolled student records</strong>,{" "}
                gradebook items, assessment scores, and snapshots. This action cannot be undone.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-600">
              <div className="font-semibold text-slate-800">Section Summary:</div>
              <div className="flex justify-between">
                <span>Section Name:</span>
                <span className="font-bold text-slate-800 font-mono">{sectionToDelete.sectionName}</span>
              </div>
              <div className="flex justify-between">
                <span>Course:</span>
                <span className="text-slate-800 truncate max-w-[200px]">{sectionToDelete.subjectName}</span>
              </div>
              <div className="flex justify-between">
                <span>Term / AY:</span>
                <span className="text-slate-800">{sectionToDelete.term} &bull; {sectionToDelete.academicYear}</span>
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
                  {sectionToDelete.sectionCode}
                </span>{" "}
                below:
              </label>
              <input
                type="text"
                value={confirmCodeInput}
                onChange={(e) => setConfirmCodeInput(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                }}
                placeholder={`Type ${sectionToDelete.sectionCode} to confirm`}
                className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-400"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-[11px] text-slate-400 italic">
                * Copy &amp; paste is disabled. Please type the section code manually.
              </p>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSectionToDelete(null);
                  setConfirmCodeInput("");
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteSection}
                disabled={
                  isDeleting ||
                  confirmCodeInput.trim().toUpperCase() !==
                    sectionToDelete.sectionCode.trim().toUpperCase()
                }
                className="gap-1.5 font-bold bg-rose-600 hover:bg-rose-700 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <span>Deleting Section...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Section</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
