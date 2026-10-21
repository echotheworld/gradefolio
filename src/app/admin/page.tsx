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
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

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
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403 || res.status === 401) {
            router.push("/auth/login");
            return;
          }
          throw new Error("Failed to load");
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setMetrics(data.metrics);
          setRecentActivity(data.recentActivity || []);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [router]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
            Platform Ownership & Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Super Admin Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Institutional oversight: manage professor provisioning, review platform metrics, and monitor append-only audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/professors">
            <Button size="md" className="gap-2 shadow-sm font-semibold bg-slate-900 text-white">
              <UserPlus className="w-4 h-4" />
              <span>Manage Professors</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Faculty</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {metrics?.activeProfessors ?? "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Provisioned accounts</div>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sections</span>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {metrics?.totalSections ?? "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across all courses</div>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">
            {metrics?.publishedSections ?? "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Live to students</div>
        </Card>

        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Drafts</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">
            {metrics?.draftSections ?? "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Under review</div>
        </Card>

        <Card className="p-5 border-slate-200 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Student Records</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {metrics?.totalStudents ?? "—"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total student entries</div>
        </Card>
      </div>

      {/* Grid: Quick Links & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Links Column */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Governance Controls</h2>

          <div className="space-y-3">
            <Link href="/admin/professors" className="block">
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">Professor Accounts</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Invite faculty, manage permissions, suspend or reactivate access.
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/admin/sections" className="block">
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">Global Section Oversight</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Search course sections across all professors and archive inactive terms.
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/admin/activity" className="block">
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">Immutable Audit Log</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Append-only record of all imports, publications, and administrative actions.
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/admin/settings" className="block">
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">Platform Settings</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Configure institutional branding, support email, and default publication policies.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Recent Audit Events</h2>
            <Link href="/admin/activity" className="text-xs text-teal-700 hover:underline font-medium">
              View Full Log &rarr;
            </Link>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {recentActivity.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No recent audit activity recorded.
                </div>
              ) : (
                recentActivity.map((act) => (
                  <div key={act.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {act.action}
                        </span>
                        <span className="text-slate-500">&bull; by {act.actorEmail}</span>
                      </div>
                      {act.metadata && (
                        <p className="text-[11px] text-slate-600 font-mono truncate max-w-md">
                          {act.metadata}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDate(act.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
