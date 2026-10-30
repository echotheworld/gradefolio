"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  History,
  UserPlus,
  Settings,
  ArrowRight,
  Layers,
  Activity,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

import { getCachedData, setCachedData } from "@/lib/client-cache";

interface AdminMetrics {
  activeProfessors: number;
  totalSections: number;
  publishedSections: number;
  draftSections: number;
  totalStudents: number;
}

interface ActivityItem {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: string | null;
  createdAt: string;
}

export default function AdminOverviewPage() {
  const router = useRouter();

  // Safe SSR state
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOverview = async () => {
    try {
      const res = await fetch("/api/admin/overview", {
        headers: { "Cache-Control": "max-age=0" },
      });
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          router.push("/");
          return;
        }
        throw new Error("Failed to load");
      }
      const data = await res.json();
      if (data) {
        setMetrics(data.metrics);
        setRecentActivity(data.recentActivity || []);
        setCachedData("admin_metrics", data.metrics);
        setCachedData("admin_recent_activity", data.recentActivity || []);
      }
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cachedMetrics = getCachedData<AdminMetrics>("admin_metrics");
    const cachedActivity = getCachedData<ActivityItem[]>("admin_recent_activity");
    if (cachedMetrics) {
      setMetrics(cachedMetrics);
      if (cachedActivity) setRecentActivity(cachedActivity);
      setIsLoading(false);
    }
    loadOverview();

    // Automatic real-time synchronization on window focus
    const handleFocus = () => loadOverview();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [router]);

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                Institutional Command
              </span>
              <span className="text-xs text-slate-500 font-medium">AY 2026–2027 &bull; 1st Term</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Platform Governance &amp; Institutional Oversight
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Institutional authority dashboard: provision faculty accounts, review global course sections, configure institutional grade disclosure policies, and monitor immutable audit records.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/admin/professors">
              <Button size="md" variant="primary" className="gap-2 shadow-xs font-semibold text-xs tracking-wide">
                <UserPlus className="w-4 h-4 text-white" />
                <span>Add Faculty</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Active Faculty */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Faculty</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          {isLoading && !metrics ? (
            <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums" suppressHydrationWarning>
              {metrics?.activeProfessors ?? 0}
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Provisioned professors</div>
        </div>

        {/* Metric 2: Total Sections */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sections</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          {isLoading && !metrics ? (
            <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums" suppressHydrationWarning>
              {metrics?.totalSections ?? 0}
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Across all faculty</div>
        </div>

        {/* Metric 3: Published Sections */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Published</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {isLoading && !metrics ? (
            <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-2 tabular-nums" suppressHydrationWarning>
              {metrics?.publishedSections ?? 0}
            </div>
          )}
          <div className="text-[11px] text-emerald-600 mt-0.5 font-medium">Live to students</div>
        </div>

        {/* Metric 4: Draft Sections */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Drafts</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          {isLoading && !metrics ? (
            <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-amber-700 mt-2 tabular-nums" suppressHydrationWarning>
              {metrics?.draftSections ?? 0}
            </div>
          )}
          <div className="text-[11px] text-amber-600 mt-0.5 font-medium">In preparation</div>
        </div>

        {/* Metric 5: Total Students */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled Students</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          {isLoading && !metrics ? (
            <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-2" />
          ) : (
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 tabular-nums" suppressHydrationWarning>
              {metrics?.totalStudents ?? 0}
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Active roster entries</div>
        </div>
      </div>

      {/* Grid: Quick Links & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              <span>Recent Governance &amp; Security Events</span>
            </h2>
            <Link
              href="/admin/activity"
              className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>View Full Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {isLoading ? (
              <div className="divide-y divide-slate-100 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="w-28 h-4 bg-slate-200 rounded" />
                      <div className="w-48 h-3 bg-slate-100 rounded" />
                    </div>
                    <div className="w-20 h-3 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <History className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-medium">No recent audit activity recorded.</p>
                <p className="text-slate-400">Administrative actions and spreadsheet imports will appear here in chronological order.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivity.map((act) => {
                  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
                  if (act.action.includes("IMPORT")) badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                  else if (act.action.includes("PUBLISH")) badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  else if (act.action.includes("CREATE")) badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                  else if (act.action.includes("DELETE") || act.action.includes("SUSPEND"))
                    badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";

                  return (
                    <div
                      key={act.id}
                      className="p-4 sm:p-4.5 flex items-start justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`font-semibold font-mono text-[10px] px-2 py-0.5 rounded-md border tracking-wider uppercase ${badgeStyle}`}
                          >
                            {act.action}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            &bull; by <strong className="text-slate-700 font-mono text-[11px]">{act.actorEmail}</strong>
                          </span>
                        </div>
                        {act.metadata && (
                          <p className="text-xs text-slate-600 font-mono truncate max-w-lg bg-slate-50 px-2 py-1 rounded border border-slate-100">
                            {act.metadata}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                        {formatDate(act.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links Column (Right 1 col) */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Governance Controls</span>
          </h2>

          <div className="space-y-3">
            <Link href="/admin/professors" prefetch={true} className="block group">
              <div className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-purple-300 hover:shadow-xs transition-all flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                    Faculty Accounts
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Provision new professors, manage credentials, and toggle account statuses.
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/admin/sections" prefetch={true} className="block group">
              <div className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                    Course Sections Oversight
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Search and inspect gradebooks across all professors and archive inactive terms.
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/admin/activity" prefetch={true} className="block group">
              <div className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <History className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-slate-900 transition-colors">
                    Immutable Audit Log
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Review append-only cryptographic event logs for spreadsheet imports and grade changes.
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/admin/settings" prefetch={true} className="block group">
              <div className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-slate-900 transition-colors">
                    Platform Settings
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Configure institutional identity, maximum upload sizes, and default grade display policies.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
