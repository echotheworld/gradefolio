"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

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

export default function ProfessorDashboardPage() {
  const router = useRouter();
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSections() {
      try {
        const res = await fetch("/api/professor/sections");
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/auth/login");
            return;
          }
          throw new Error("Failed to load sections");
        }
        const data = await res.json();
        setSections(data.sections || []);
        setIsLoading(false);
      } catch {
        setError("Failed to load professor sections");
        setIsLoading(false);
      }
    }

    loadSections();
  }, [router]);

  const totalSections = sections.length;
  const publishedSections = sections.filter((s) => s.status === "PUBLISHED").length;
  const draftSections = sections.filter((s) => s.status === "DRAFT").length;
  const totalStudents = sections.reduce((acc, curr) => acc + curr._count.sectionStudents, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            Faculty Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Professor Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your course sections, import Excel gradebooks, issue student credentials, and publish records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/professor/sections/new">
            <Button size="md" className="gap-2 shadow-sm font-semibold">
              <Plus className="w-4 h-4" />
              <span>Create Section</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">My Sections</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalSections}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active course groups</div>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{publishedSections}</div>
          <div className="text-[11px] text-slate-500 mt-1">Visible to students</div>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Drafts</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{draftSections}</div>
          <div className="text-[11px] text-slate-500 mt-1">Pending review</div>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Enrolled</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalStudents}</div>
          <div className="text-[11px] text-slate-500 mt-1">Student records</div>
        </Card>
      </div>

      {/* Sections Grid */}
      <div id="sections" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">My Course Sections</h2>
          <span className="text-xs text-slate-500">{sections.length} sections registered</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-slate-400 border-t-slate-900 rounded-full mb-2"></div>
            <p>Loading sections...</p>
          </div>
        ) : sections.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 border-slate-300">
            <FolderPlus className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No sections created yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Create your first course section to begin importing Excel gradebooks and issuing private student credentials.
            </p>
            <Link href="/professor/sections/new">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span>Create Section</span>
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <Card
                key={section.id}
                className="hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                        {section.sectionCode}
                      </span>
                      <StatusChip status={section.status} />
                    </div>

                    <CardTitle className="text-base font-bold text-slate-900 line-clamp-1">
                      {section.subjectName}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 font-medium">
                      Section: {section.sectionName}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="py-3 text-xs space-y-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Term / Academic Year:</span>
                      <span className="font-medium text-slate-900">
                        {section.term} &bull; {section.academicYear}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Enrolled Students:</span>
                      <span className="font-medium text-slate-900">{section._count.sectionStudents} students</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Assessment Items:</span>
                      <span className="font-medium text-slate-900">{section._count.gradeItems} columns</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-100">
                      <span>Last updated:</span>
                      <span>{formatDate(section.updatedAt)}</span>
                    </div>
                  </CardContent>
                </div>

                <CardFooter className="pt-3 pb-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Link href={`/professor/sections/${section.id}/credentials`}>
                      <button
                        title="Student Credentials"
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                    </Link>
                    <Link href={`/professor/sections/${section.id}/import`}>
                      <button
                        title="Import Spreadsheet"
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                    </Link>
                  </div>

                  <Link href={`/professor/sections/${section.id}`}>
                    <Button size="sm" variant="primary" className="gap-1.5 text-xs">
                      <span>Open Section</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
