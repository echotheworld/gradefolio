"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertTriangle,
  Archive,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

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
  const [sections, setSections] = useState<SectionOverviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedSection, setSelectedSection] = useState<SectionOverviewItem | null>(null);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSections = async () => {
    try {
      const res = await fetch("/api/admin/sections");
      const data = await res.json();
      setSections(data.sections || []);
      setIsLoading(false);
    } catch {
      toast({ type: "error", title: "Error", message: "Failed to load sections" });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

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

      setArchiveModalOpen(false);
      await loadSections();
    } catch (e: any) {
      toast({ type: "error", title: "Error", message: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = sections.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.subjectName.toLowerCase().includes(q) ||
      s.sectionName.toLowerCase().includes(q) ||
      s.sectionCode.toLowerCase().includes(q) ||
      s.ownerProfessor.displayName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Super Admin Overview</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
            Institutional Oversight
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            All Course Sections
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-platform section directory. Archive completed academic terms without altering gradebooks.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by course, section code, or professor..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong>{filtered.length}</strong> of {sections.length} total sections
        </div>
      </div>

      {/* Sections Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Course & Section</th>
                <th className="px-6 py-3.5">Professor</th>
                <th className="px-6 py-3.5">Term / AY</th>
                <th className="px-6 py-3.5">Enrolled</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading sections...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No sections found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{s.sectionCode}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{s.subjectName}</div>
                      <div className="text-[11px] text-slate-500">Section {s.sectionName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{s.ownerProfessor.displayName}</div>
                      <div className="text-[11px] text-slate-400">{s.ownerProfessor.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {s.term} &bull; {s.academicYear}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">
                      {s._count.sectionStudents} students
                    </td>
                    <td className="px-6 py-4">
                      <StatusChip status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link href={`/section/${s.sectionCode}`} target="_blank">
                        <Button size="sm" variant="outline" className="text-[11px] h-7 px-2">
                          <ExternalLink className="w-3 h-3 mr-1" /> Public View
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        variant={s.status === "ARCHIVED" ? "primary" : "ghost"}
                        onClick={() => {
                          setSelectedSection(s);
                          setArchiveModalOpen(true);
                        }}
                        className={`text-[11px] h-7 px-2 ${
                          s.status === "ARCHIVED" ? "" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Archive className="w-3 h-3 mr-1" />
                        {s.status === "ARCHIVED" ? "Restore" : "Archive"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Archive Modal */}
      {selectedSection && (
        <Modal
          isOpen={archiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          title={selectedSection.status === "ARCHIVED" ? "Restore Section" : "Archive Course Section"}
          description={`Section: ${selectedSection.sectionCode} (${selectedSection.subjectName})`}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              {selectedSection.status === "ARCHIVED"
                ? "Restoring this section will change its status to Draft, allowing the professor to review and publish it."
                : "Archiving a section moves it out of active search and pauses public student grade lookups. Grade data is preserved intact."}
            </p>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setArchiveModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={selectedSection.status === "ARCHIVED" ? "primary" : "destructive"}
                onClick={handleArchiveToggle}
                isLoading={isSubmitting}
                className="font-semibold"
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
