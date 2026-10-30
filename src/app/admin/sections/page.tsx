"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  Archive,
  ExternalLink,
  Layers,
  GraduationCap,
  Users,
  Calendar,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { getCachedData, setCachedData, invalidateCache } from "@/lib/client-cache";

interface SectionOverviewItem {
  id: string;
  sectionCode: string;
  sectionName: string;
  subjectName: string;
  academicYear: string;
  term: string;
  status: string;
  updatedAt: string;
  ownerProfessor: {
    id: string;
    displayName: string;
    email: string;
  };
  _count: {
    sectionStudents: number;
    gradeItems: number;
  };
}

export default function AdminSectionsPage() {
  const { toast } = useToast();
  // Safe SSR state
  const [sections, setSections] = useState<SectionOverviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [selectedSection, setSelectedSection] = useState<SectionOverviewItem | null>(null);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSections = useCallback(async (showSkeleton = false) => {
    if (showSkeleton && !getCachedData("admin_sections")) {
      setIsLoading(true);
    }
    try {
      const res = await fetch("/api/admin/sections");
      const data = await res.json();
      const items = data.sections || [];
      setSections(items);
      setCachedData("admin_sections", items);
    } catch {
      toast({ type: "error", title: "Error", message: "Failed to load sections" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const cached = getCachedData<SectionOverviewItem[]>("admin_sections");
    if (cached && cached.length > 0) {
      setSections(cached);
      setIsLoading(false);
    }
    loadSections();

    const handleFocus = () => loadSections();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadSections]);

  const handleArchiveToggle = async () => {
    if (!selectedSection) return;
    setIsSubmitting(true);
    const action = selectedSection.status === "ARCHIVED" ? "restore" : "archive";
    try {
      const res = await fetch("/api/admin/sections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: selectedSection.id, action }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast({
        type: "info",
        title: action === "archive" ? "Section Archived" : "Section Restored",
        message: `Section ${selectedSection.sectionCode} has been ${action}d.`,
      });

      invalidateCache("admin_sections");
      invalidateCache("admin_metrics");
      setArchiveModalOpen(false);
      await loadSections();
    } catch (e: any) {
      toast({ type: "error", title: "Error", message: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishedCount = useMemo(() => sections.filter((s) => s.status === "PUBLISHED").length, [sections]);
  const draftCount = useMemo(() => sections.filter((s) => s.status === "DRAFT").length, [sections]);
  const archivedCount = useMemo(() => sections.filter((s) => s.status === "ARCHIVED").length, [sections]);

  const filtered = useMemo(() => {
    return sections.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        s.subjectName.toLowerCase().includes(q) ||
        s.sectionName.toLowerCase().includes(q) ||
        s.sectionCode.toLowerCase().includes(q) ||
        s.ownerProfessor.displayName.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sections, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-xs p-6 sm:p-7">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[11px] font-bold tracking-wider uppercase border border-blue-200">
              <BookOpen className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Curriculum Oversight & Section Directory</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Course Sections Oversight
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Institutional directory of all active, draft, and archived course sections across departments. Inspect public student view or manage term archives.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Stat Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Sections</p>
            {isLoading && sections.length === 0 ? (
              <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums" suppressHydrationWarning>{sections.length}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Published Live</p>
            {isLoading && sections.length === 0 ? (
              <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5" suppressHydrationWarning>{publishedCount}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-500">In Draft</p>
            {isLoading && sections.length === 0 ? (
              <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5" suppressHydrationWarning>{draftCount}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Archived Terms</p>
            {isLoading && sections.length === 0 ? (
              <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5" suppressHydrationWarning>{archivedCount}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <Archive className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course name, section code, or professor..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({sections.length})
          </button>
          <button
            onClick={() => setStatusFilter("PUBLISHED")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              statusFilter === "PUBLISHED"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter("DRAFT")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              statusFilter === "DRAFT"
                ? "bg-amber-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Draft ({draftCount})
          </button>
          <button
            onClick={() => setStatusFilter("ARCHIVED")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              statusFilter === "ARCHIVED"
                ? "bg-slate-700 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Archived ({archivedCount})
          </button>
        </div>
      </div>

      {/* Sections Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Section Code</th>
                <th className="px-6 py-3.5">Course & Subject</th>
                <th className="px-6 py-3.5">Lead Professor</th>
                <th className="px-6 py-3.5">Term / AY</th>
                <th className="px-6 py-3.5">Roster & Grade Items</th>
                <th className="px-6 py-3.5">Live Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && sections.length === 0 ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="w-16 h-6 bg-slate-100 rounded-md" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="w-36 h-4 bg-slate-100 rounded" />
                          <div className="w-24 h-2.5 bg-slate-50 rounded" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 bg-slate-100 rounded" />
                          <div className="w-36 h-2.5 bg-slate-50 rounded" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24 h-3.5 bg-slate-100 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-20 h-5 bg-slate-100 rounded-lg" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-16 h-5 bg-slate-100 rounded-full" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="w-16 h-7 bg-slate-100 rounded-lg inline-block" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">No course sections found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search criteria or status filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Section Code */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-900 font-mono font-bold text-xs border border-slate-200/80">
                        {s.sectionCode}
                      </span>
                    </td>

                    {/* Course & Subject */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-xs">{s.subjectName}</div>
                      <div className="text-[11px] text-slate-500">Section {s.sectionName}</div>
                    </td>

                    {/* Professor */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{s.ownerProfessor.displayName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{s.ownerProfessor.email}</div>
                    </td>

                    {/* Term / AY */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{s.term}</span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-slate-500 text-[11px]">{s.academicYear}</span>
                      </div>
                    </td>

                    {/* Roster & Items */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-200/50">
                          <Users className="w-3 h-3 text-purple-500" />
                          {s._count.sectionStudents} students
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {s._count.gradeItems} items
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <StatusChip status={s.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link href={`/section/${s.sectionCode}`} target="_blank">
                        <button className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs">
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                          <span>Student View</span>
                        </button>
                      </Link>

                      <button
                        onClick={() => {
                          setSelectedSection(s);
                          setArchiveModalOpen(true);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors border shadow-2xs ${
                          s.status === "ARCHIVED"
                            ? "border-purple-200/80 bg-purple-50 text-purple-700 hover:bg-purple-100"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {s.status === "ARCHIVED" ? (
                          <>
                            <RotateCcw className="w-3 h-3 text-purple-600" />
                            <span>Restore</span>
                          </>
                        ) : (
                          <>
                            <Archive className="w-3 h-3 text-slate-400" />
                            <span>Archive</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Archive / Restore Section */}
      {selectedSection && (
        <Modal
          isOpen={archiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          title={selectedSection.status === "ARCHIVED" ? "Restore Course Section" : "Archive Course Section"}
          description={`Section: ${selectedSection.sectionCode} — ${selectedSection.subjectName}`}
        >
          <div className="space-y-4 text-xs pt-1">
            <div className="p-4 rounded-xl border leading-relaxed bg-slate-50 border-slate-200 text-slate-700">
              {selectedSection.status === "ARCHIVED" ? (
                <>
                  <strong className="block text-slate-900 mb-1">Restoration Notice:</strong>
                  Restoring this section will transition its status back to <strong>Draft</strong>. The lead professor ({selectedSection.ownerProfessor.displayName}) will be able to review, adjust, and re-publish grades to the student portal.
                </>
              ) : (
                <>
                  <strong className="block text-slate-900 mb-1">Archival Policy:</strong>
                  Archiving removes this section from public lookup searches and pauses active student grade notifications. All historical grade records and import calculations remain permanently preserved.
                </>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setArchiveModalOpen(false)}
                className="rounded-xl font-medium"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant={selectedSection.status === "ARCHIVED" ? "primary" : "destructive"}
                onClick={handleArchiveToggle}
                isLoading={isSubmitting}
                className="rounded-xl font-semibold"
              >
                Confirm {selectedSection.status === "ARCHIVED" ? "Restore" : "Archive"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
