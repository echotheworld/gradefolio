"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

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

interface SectionData {
  id: string;
  sectionCode: string;
  sectionName: string;
  subjectName: string;
  academicYear: string;
  term: string;
  announcement: string | null;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
  showFinalGrade: boolean;
  showBreakdown: boolean;
  showProvisionalNotice: boolean;
  gradeItems: GradeItem[];
  sectionStudents: StudentRecord[];
}

export default function SectionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sectionId = params.id as string;

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
  const [reviewStudent, setReviewStudent] = useState<StudentRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    announcement: "",
    showFinalGrade: true,
    showBreakdown: true,
    showProvisionalNotice: true,
  });

  const loadSection = async () => {
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        throw new Error("Failed to load section");
      }
      const data = await res.json();
      setSection(data.section);
      setSettingsForm({
        announcement: data.section.announcement || "",
        showFinalGrade: data.section.showFinalGrade,
        showBreakdown: data.section.showBreakdown,
        showProvisionalNotice: data.section.showProvisionalNotice,
      });
      setIsLoading(false);
    } catch {
      setError("Failed to load section data.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSection();
  }, [sectionId]);

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

  // Handle Publish
  const handlePublish = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (!res.ok) throw new Error("Publishing failed");
      toast({
        type: "success",
        title: "Grades Published Successfully",
        message: `Section ${section?.sectionCode} is now live. Enrolled students can view their reports.`,
      });
      setPublishModalOpen(false);
      await loadSection();
    } catch (e: any) {
      toast({ type: "error", title: "Publication Failed", message: e.message });
    } finally {
      setIsSubmitting(false);
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
        body: JSON.stringify(settingsForm),
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

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full mb-3"></div>
        <p>Loading section gradebook...</p>
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
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-900 text-white p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-800 text-teal-400 font-bold border border-slate-700">
                  {section.sectionCode}
                </span>
                <span className="text-xs text-slate-300">&bull; {section.sectionName}</span>
                <StatusChip status={section.status} />
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {section.subjectName}
              </h1>

              <p className="text-xs text-slate-300 mt-1">
                {section.term} &bull; Academic Year {section.academicYear} &bull; Last updated {formatDate(section.updatedAt)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/professor/sections/${section.id}/import`}>
                <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Sheet</span>
                </Button>
              </Link>

              <Link href={`/professor/sections/${section.id}/credentials`}>
                <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Credentials ({section.sectionStudents.length})</span>
                </Button>
              </Link>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSettingsModalOpen(true)}
                className="gap-1.5 text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </Button>

              {isPublished ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setUnpublishModalOpen(true)}
                  className="gap-1.5 text-xs shadow-sm font-semibold"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Unpublish</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setPublishModalOpen(true)}
                  className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-sm font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publish Grades</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {section.announcement && (
          <div className="bg-teal-50 border-b border-teal-100 px-6 py-3 text-xs text-teal-900 flex items-center justify-between">
            <span>
              <strong>Student Announcement: </strong> {section.announcement}
            </span>
            <button
              onClick={() => setSettingsModalOpen(true)}
              className="text-teal-700 underline text-[11px] font-medium"
            >
              Edit
            </button>
          </div>
        )}
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

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1">
            <a href={`/api/professor/sections/${section.id}/export?format=xlsx`} download>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export XLSX</span>
              </Button>
            </a>
            <a href={`/api/professor/sections/${section.id}/export?format=csv`} download>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>CSV</span>
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Gradebook Interactive Spreadsheet Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 backdrop-blur sticky top-0 z-20 border-b border-slate-200 uppercase font-semibold text-slate-700 tracking-wider">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-slate-100 z-30 shadow-[1px_0_0_0_#cbd5e1] min-w-[120px]">
                  Student ID
                </th>
                <th className="px-4 py-3 sticky left-[120px] bg-slate-100 z-30 shadow-[1px_0_0_0_#cbd5e1] min-w-[180px]">
                  Student Name
                </th>
                {section.gradeItems.map((item) => (
                  <th key={item.id} className="px-4 py-3 text-right min-w-[130px] border-l border-slate-200/60">
                    <div>{item.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal lowercase">max: {item.maxScore}</div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right min-w-[110px] border-l border-slate-200 bg-slate-200/50 font-bold text-slate-900">
                  Final Grade
                </th>
                <th className="px-4 py-3 min-w-[110px] border-l border-slate-200/60">Status</th>
                <th className="px-4 py-3 min-w-[160px] border-l border-slate-200/60">Remarks</th>
                <th className="px-4 py-3 text-center min-w-[70px] border-l border-slate-200/60">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={section.gradeItems.length + 5}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    No student records found matching &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((ss) => {
                  const recordsMap = new Map<string, number | null>();
                  ss.gradeRecords.forEach((r) => recordsMap.set(r.gradeItemId, r.score));

                  return (
                    <tr
                      key={ss.id}
                      onClick={() => setReviewStudent(ss)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                        {ss.student.studentNumber}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 sticky left-[120px] bg-white group-hover:bg-slate-50 z-10 shadow-[1px_0_0_0_#e2e8f0] truncate max-w-[200px]">
                        {ss.student.displayName}
                      </td>

                      {section.gradeItems.map((item) => {
                        const score = recordsMap.get(item.id);
                        return (
                          <td
                            key={item.id}
                            className="px-4 py-3 text-right font-mono border-l border-slate-100"
                          >
                            {score !== undefined && score !== null ? (
                              <span className="text-slate-800">{score}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 border-l border-slate-200 bg-slate-50/50">
                        {ss.finalGrade || "—"}
                      </td>

                      <td className="px-4 py-3 border-l border-slate-100">
                        <StatusChip status={ss.finalGradeStatus || "PROVISIONAL"} />
                      </td>

                      <td className="px-4 py-3 text-slate-500 truncate max-w-[160px] border-l border-slate-100">
                        {ss.remarks || "—"}
                      </td>

                      <td className="px-4 py-3 text-center border-l border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewStudent(ss);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100"
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

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredStudents.length} of {section.sectionStudents.length} students</span>
          <span className="font-mono text-[11px]">Desktop table with sticky identifiers</span>
        </div>
      </Card>

      {/* Screen 6: Publish Confirmation Modal */}
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

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900">Fields Visible to Students:</h4>
            <ul className="space-y-1.5 text-slate-600">
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
        title="Section Settings & Visibility"
        description="Configure announcement and student-visible elements."
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

      {/* Single Student Detail Modal */}
      {reviewStudent && (
        <Modal
          isOpen={true}
          onClose={() => setReviewStudent(null)}
          title={`Student: ${reviewStudent.student.displayName}`}
          description={`ID: ${reviewStudent.student.studentNumber} • Section: ${section.sectionCode}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 text-[11px]">Final Grade Standing:</span>
                <div className="text-lg font-bold text-slate-900 mt-0.5">
                  {reviewStudent.finalGrade || "Not Computed"}
                </div>
              </div>
              <StatusChip status={reviewStudent.finalGradeStatus || "PROVISIONAL"} />
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold text-slate-900 mb-2">Itemized Assessment Scores</h4>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {section.gradeItems.map((item) => {
                  const rec = reviewStudent.gradeRecords.find((r) => r.gradeItemId === item.id);
                  return (
                    <div key={item.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400">Max: {item.maxScore}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold text-slate-900">
                          {rec?.score !== null && rec?.score !== undefined ? rec.score : "—"}
                        </div>
                        <span className="text-[10px] text-slate-500">{rec?.status || "NOT_RECORDED"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {reviewStudent.remarks && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                <strong>Instructor Remarks: </strong> {reviewStudent.remarks}
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <Button size="sm" onClick={() => setReviewStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
