"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  History,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/Card";

interface ImportRecord {
  id: string;
  fileName: string;
  status: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorSummary: string | null;
  createdAt: string;
  section: {
    id: string;
    sectionCode: string;
    sectionName: string;
    subjectName: string;
  };
}

interface AuditRecord {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: string | null;
  createdAt: string;
}

export default function ProfessorActivityHistoryPage() {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        const res = await fetch("/api/professor/activity");
        if (res.ok) {
          const data = await res.json();
          setImports(data.imports || []);
          setAuditLogs(data.auditLogs || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadActivity();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Audit Trail
              </span>
              <span className="text-xs text-slate-500 font-medium">Activity &amp; Import Log</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Import &amp; Publication History
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Verify timestamps, spreadsheet filenames, and publication logs for your course sections.
            </p>
          </div>
        </div>
      </div>

      {/* Spreadsheet Upload Log */}
      <Card className="border border-slate-200/90 shadow-xs overflow-hidden rounded-2xl bg-white">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Spreadsheet Upload History</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">{imports.length} Uploads</span>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="divide-y divide-slate-100 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100" />
                    <div className="space-y-1.5">
                      <div className="w-48 h-4 bg-slate-100 rounded" />
                      <div className="w-32 h-3 bg-slate-50 rounded" />
                    </div>
                  </div>
                  <div className="w-24 h-4 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : imports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No spreadsheet upload history found.</div>
          ) : (
            imports.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{item.fileName}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                      item.status === "SUCCESS"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-slate-500">
                    Section: <span className="font-semibold text-slate-700">{item.section?.sectionName || item.section?.sectionCode}</span> &bull; {item.section?.subjectName}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Processed: {item.createdCount} created, {item.updatedCount} updated, {item.skippedCount} skipped
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Link href={`/professor/sections/${item.section?.id}`}>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      <span>Open Section</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
