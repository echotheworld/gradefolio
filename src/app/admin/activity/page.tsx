"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  ArrowLeft,
  Search,
  Filter,
  ShieldCheck,
  Download,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

interface AuditLogItem {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: string | null;
  createdAt: string;
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const loadLogs = async () => {
    try {
      let url = "/api/admin/activity";
      const params = new URLSearchParams();
      if (actionFilter) params.set("action", actionFilter);
      if (searchQuery) params.set("q", searchQuery);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

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
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Immutable Security Trail</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Append-Only Audit Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically and chronologically ordered record of all imports, publications, credential actions, and administrative workflows.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by actor, target, or metadata..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Actions</option>
            <option value="GRADES_PUBLISHED">GRADES_PUBLISHED</option>
            <option value="GRADEBOOK_IMPORTED">GRADEBOOK_IMPORTED</option>
            <option value="CREDENTIALS_BATCH_GENERATED">CREDENTIALS_BATCH_GENERATED</option>
            <option value="CREDENTIAL_REISSUED">CREDENTIAL_REISSUED</option>
            <option value="CREDENTIAL_REVOKED">CREDENTIAL_REVOKED</option>
            <option value="PROFESSOR_INVITED">PROFESSOR_INVITED</option>
            <option value="PROFESSOR_SUSPENDED">PROFESSOR_SUSPENDED</option>
            <option value="SECTION_CREATED">SECTION_CREATED</option>
            <option value="SECTION_ARCHIVED_BY_ADMIN">SECTION_ARCHIVED_BY_ADMIN</option>
          </select>

          <Button size="sm" variant="outline" onClick={loadLogs} className="text-xs">
            Refresh
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Target</th>
                <th className="px-6 py-3.5">Metadata Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No audit records match the criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-900">{log.actorEmail}</td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">
                      {log.targetType} / {log.targetId.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px] max-w-xs truncate">
                      {log.metadata || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
