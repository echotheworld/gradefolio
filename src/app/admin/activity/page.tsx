"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  Clock,
  User,
  Activity,
  Layers,
  FileSpreadsheet,
  Send,
  KeyRound,
  ShieldAlert,
  UserPlus,
  Eye,
  X,
  Code2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { getCachedData, setCachedData } from "@/lib/client-cache";

interface AuditLogItem {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: string | null;
  createdAt: string;
}

function getActionBadge(action: string) {
  switch (action) {
    case "GRADES_PUBLISHED":
      return {
        label: "Grades Published",
        icon: Send,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      };
    case "GRADEBOOK_IMPORTED":
      return {
        label: "Gradebook Imported",
        icon: FileSpreadsheet,
        className: "bg-blue-50 text-blue-700 border-blue-200/80",
      };
    case "CREDENTIALS_BATCH_GENERATED":
    case "CREDENTIAL_REISSUED":
      return {
        label: action === "CREDENTIAL_REISSUED" ? "Credential Reissued" : "Tokens Generated",
        icon: KeyRound,
        className: "bg-amber-50 text-amber-700 border-amber-200/80",
      };
    case "CREDENTIAL_REVOKED":
    case "PROFESSOR_SUSPENDED":
      return {
        label: action === "PROFESSOR_SUSPENDED" ? "Faculty Suspended" : "Access Revoked",
        icon: ShieldAlert,
        className: "bg-rose-50 text-rose-700 border-rose-200/80",
      };
    case "PROFESSOR_INVITED":
      return {
        label: "Faculty Provisioned",
        icon: UserPlus,
        className: "bg-purple-50 text-purple-700 border-purple-200/80",
      };
    case "SECTION_CREATED":
    case "SECTION_ARCHIVED_BY_ADMIN":
      return {
        label: action === "SECTION_CREATED" ? "Section Created" : "Section Archived",
        icon: Layers,
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
    default:
      return {
        label: action,
        icon: Activity,
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>(() => getCachedData<AuditLogItem[]>("admin_audit_logs") || []);
  const [isLoading, setIsLoading] = useState(() => !getCachedData<AuditLogItem[]>("admin_audit_logs"));
  const [searchQuery, setSearchQuery] = useState("");
  const [actionCategory, setActionCategory] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const loadLogs = useCallback(async (showSkeleton = false) => {
    if (showSkeleton && !getCachedData("admin_audit_logs")) {
      setIsLoading(true);
    }
    try {
      const res = await fetch("/api/admin/activity");
      const data = await res.json();
      const items = data.logs || [];
      setLogs(items);
      setCachedData("admin_audit_logs", items);
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();

    const handleFocus = () => loadLogs();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadLogs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        log.actorEmail.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.targetType.toLowerCase().includes(q) ||
        (log.metadata && log.metadata.toLowerCase().includes(q));

      let matchesCategory = true;
      if (actionCategory === "PUBLISH") {
        matchesCategory = log.action === "GRADES_PUBLISHED";
      } else if (actionCategory === "IMPORT") {
        matchesCategory = log.action === "GRADEBOOK_IMPORTED";
      } else if (actionCategory === "AUTH") {
        matchesCategory =
          log.action.includes("CREDENTIAL") ||
          log.action.includes("PROFESSOR");
      } else if (actionCategory === "SECTION") {
        matchesCategory = log.action.includes("SECTION");
      }

      return matchesSearch && matchesCategory;
    });
  }, [logs, searchQuery, actionCategory]);

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-xs p-6 sm:p-7">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[11px] font-bold tracking-wider uppercase border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Immutable Governance Trail</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Security & Audit Trail
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Chronologically ordered, tamper-evident log documenting grade publishes, spreadsheet imports, faculty provisioning, and credential modifications.
            </p>
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
            placeholder="Search by actor, action type, target ID, or metadata..."
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
            onClick={() => setActionCategory("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              actionCategory === "ALL"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Events ({logs.length})
          </button>
          <button
            onClick={() => setActionCategory("PUBLISH")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              actionCategory === "PUBLISH"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Publications
          </button>
          <button
            onClick={() => setActionCategory("IMPORT")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              actionCategory === "IMPORT"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Imports
          </button>
          <button
            onClick={() => setActionCategory("AUTH")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              actionCategory === "AUTH"
                ? "bg-purple-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Access & Faculty
          </button>
          <button
            onClick={() => setActionCategory("SECTION")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              actionCategory === "SECTION"
                ? "bg-slate-700 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Sections
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Action Event</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Target Entity</th>
                <th className="px-6 py-3.5">Payload Summary</th>
                <th className="px-6 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium text-slate-500">Loading security audit trail...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldCheck className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">No audit events found</p>
                      <p className="text-xs text-slate-400">No log records match your current filter query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const badge = getActionBadge(log.action);
                  const Icon = badge.icon;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Timestamp */}
                      <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatDate(log.createdAt)}</span>
                        </div>
                      </td>

                      {/* Action Event */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}>
                          <Icon className="w-3 h-3 shrink-0" />
                          {badge.label}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{log.actorEmail}</span>
                        </div>
                      </td>

                      {/* Target */}
                      <td className="px-6 py-4 text-slate-600 font-mono text-[11px]">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                          {log.targetType}:{log.targetId.slice(0, 8)}
                        </span>
                      </td>

                      {/* Payload Summary */}
                      <td className="px-6 py-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                        {log.metadata || "—"}
                      </td>

                      {/* Inspect */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                        >
                          <Eye className="w-3 h-3 text-purple-600" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Inspect Audit Event */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Audit Event Details"
          description={`Record ID: ${selectedLog.id}`}
        >
          <div className="space-y-4 text-xs pt-1">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Action Type
                </span>
                <span className="font-bold font-mono text-slate-900 text-xs mt-0.5 block">
                  {selectedLog.action}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Timestamp
                </span>
                <span className="font-medium font-mono text-slate-800 text-xs mt-0.5 block">
                  {formatDate(selectedLog.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Actor Account
                </span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                  {selectedLog.actorEmail}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Target Entity
                </span>
                <span className="font-mono text-slate-800 text-xs mt-0.5 block truncate">
                  {selectedLog.targetType} ({selectedLog.targetId})
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Code2 className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Raw Payload Metadata
                </span>
              </div>
              <pre className="p-3.5 bg-slate-900 text-purple-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800 leading-relaxed">
                {selectedLog.metadata
                  ? JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)
                  : "// No metadata attached"}
              </pre>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl font-medium"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
