"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Clock,
  ArrowRight,
  Filter,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isRValue } from "@/lib/snapshot";

interface DirectoryStudent {
  id: string;
  finalGrade: string | null;
  finalGradeStatus: string;
  remarks: string | null;
  credentialStatus: string;
  lastAccessAt: string | null;
  student: {
    id: string;
    studentNumber: string;
    displayName: string;
  };
  section: {
    id: string;
    sectionCode: string;
    sectionName: string;
    subjectName: string;
    status: string;
  };
}

export default function MasterStudentDirectoryPage() {
  const [students, setStudents] = useState<DirectoryStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "R_ONLY" | "ACTIVE_PASS" | "CHECKED_PORTAL">("ALL");

  useEffect(() => {
    async function loadDirectory() {
      try {
        const res = await fetch("/api/professor/students");
        if (!res.ok) throw new Error("Failed to load student directory");
        const data = await res.json();
        setStudents(data.students || []);
      } catch (err: any) {
        setError(err.message || "Unable to load students");
      } finally {
        setIsLoading(false);
      }
    }
    loadDirectory();
  }, []);

  // Distinct sections for dropdown
  const uniqueSections = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach((s) => map.set(s.section.id, `${s.section.sectionCode} - ${s.section.subjectName}`));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [students]);

  // Metrics
  const totalCount = students.length;
  const rCount = students.filter((s) => isRValue(s.finalGrade)).length;
  const activePassCount = students.filter((s) => s.credentialStatus === "ACTIVE").length;
  const checkedInCount = students.filter((s) => s.lastAccessAt !== null).length;

  // Filtered rows
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Section filter
      if (selectedSection !== "ALL" && s.section.id !== selectedSection) return false;

      // Status filter
      if (statusFilter === "R_ONLY" && !isRValue(s.finalGrade)) return false;
      if (statusFilter === "ACTIVE_PASS" && s.credentialStatus !== "ACTIVE") return false;
      if (statusFilter === "CHECKED_PORTAL" && !s.lastAccessAt) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = s.student.studentNumber.toLowerCase();
        const name = s.student.displayName.toLowerCase();
        const code = s.section.sectionCode.toLowerCase();
        const subj = s.section.subjectName.toLowerCase();
        return num.includes(q) || name.includes(q) || code.includes(q) || subj.includes(q);
      }

      return true;
    });
  }, [students, selectedSection, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Directory Hub
              </span>
              <span className="text-xs text-slate-500 font-medium">All Enrolled Classes</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Master Student Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Search and inspect enrolled student profiles, academic standings, and portal login activity across all your course sections.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href="/professor/credentials">
              <Button size="sm" variant="outline" className="gap-2 text-xs">
                <KeyRound className="w-4 h-4 text-slate-600" />
                <span>Credentials Vault</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="w-16 h-8 bg-slate-100 rounded-lg animate-pulse mt-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums" suppressHydrationWarning>{totalCount}</div>
          )}
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Across all sections</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Portal Access</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="w-20 h-8 bg-slate-100 rounded-lg animate-pulse mt-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums" suppressHydrationWarning>
              {checkedInCount} <span className="text-sm font-normal text-slate-400">/ {totalCount}</span>
            </div>
          )}
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium" suppressHydrationWarning>
            {totalCount > 0 ? `${Math.round((checkedInCount / totalCount) * 100)}% view rate` : "0% view rate"}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Passwords</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="w-16 h-8 bg-slate-100 rounded-lg animate-pulse mt-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums" suppressHydrationWarning>{activePassCount}</div>
          )}
          <div className="text-[11px] text-purple-600 mt-0.5 font-medium">Credentials generated</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Consultation / R</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          {isLoading ? (
            <div className="w-16 h-8 bg-slate-100 rounded-lg animate-pulse mt-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-amber-600 mt-2 tabular-nums" suppressHydrationWarning>{rCount}</div>
          )}
          <div className="text-[11px] text-amber-600 mt-0.5 font-medium">Require instructor guidance</div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <Card className="border border-slate-200/90 shadow-xs overflow-hidden rounded-2xl bg-white">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by ID, student name, or course code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-800 placeholder:text-slate-400 font-medium bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              aria-label="Filter by course section"
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="ALL">All Course Sections ({uniqueSections.length})</option>
              {uniqueSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.label}
                </option>
              ))}
            </select>

            {/* Standing Filter */}
            <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("R_ONLY")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === "R_ONLY" ? "bg-amber-100 text-amber-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                R Only ({rCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("CHECKED_PORTAL")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  statusFilter === "CHECKED_PORTAL" ? "bg-emerald-100 text-emerald-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Viewed ({checkedInCount})
              </button>
            </div>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/75 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5 min-w-[140px]">Student ID</th>
                <th className="px-5 py-3.5 min-w-[200px]">Student Name</th>
                <th className="px-5 py-3.5 min-w-[180px]">Course Section</th>
                <th className="px-5 py-3.5 min-w-[120px]">Final Grade</th>
                <th className="px-5 py-3.5 min-w-[130px]">Credential</th>
                <th className="px-5 py-3.5 min-w-[140px]">Portal Access</th>
                <th className="px-5 py-3.5 text-right min-w-[110px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-3">
                        <div className="w-24 h-4 bg-slate-100 rounded" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="w-36 h-4 bg-slate-100 rounded" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="space-y-1">
                          <div className="w-32 h-3.5 bg-slate-100 rounded" />
                          <div className="w-24 h-2.5 bg-slate-50 rounded" />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="w-12 h-5 bg-slate-100 rounded-full" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="w-16 h-5 bg-slate-100 rounded-full" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="w-20 h-3 bg-slate-100 rounded" />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="w-14 h-6 bg-slate-100 rounded-lg inline-block" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No students found matching your criteria</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try adjusting your search query or filters</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const finalIsR = isRValue(s.finalGrade);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900 tracking-wide">
                        {s.student.studentNumber}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {s.student.displayName}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 line-clamp-1">{s.section.subjectName}</span>
                          <span className="font-mono text-[10px] text-slate-500">{s.section.sectionCode} &bull; {s.section.sectionName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {finalIsR ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                            R
                          </span>
                        ) : s.finalGrade ? (
                          <span className="font-bold text-slate-900 font-mono text-xs">
                            {s.finalGrade}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Pending</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {s.credentialStatus === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Issued
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Unissued
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[11px] text-slate-500">
                        {s.lastAccessAt ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(s.lastAccessAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not yet checked</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/professor/sections/${s.section.id}`}>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:text-blue-800 font-semibold cursor-pointer"
                          >
                            <span>Section</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
