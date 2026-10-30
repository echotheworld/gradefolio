"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  Building,
  Mail,
  HardDrive,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getCachedData, setCachedData } from "@/lib/client-cache";

const defaultSettings = {
  institutionName: "GradeView University Portal",
  supportEmail: "support@gradeview.edu",
  maxUploadSizeMb: 15,
  defaultShowFinalGrade: true,
  defaultShowBreakdown: true,
};

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState(() => getCachedData<typeof defaultSettings>("admin_settings") || defaultSettings);
  const [isLoading, setIsLoading] = useState(() => !getCachedData("admin_settings"));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const updated = {
            institutionName: data.settings.institutionName,
            supportEmail: data.settings.supportEmail,
            maxUploadSizeMb: data.settings.maxUploadSizeMb,
            defaultShowFinalGrade: data.settings.defaultShowFinalGrade,
            defaultShowBreakdown: data.settings.defaultShowBreakdown,
          };
          setForm(updated);
          setCachedData("admin_settings", updated);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save platform settings");

      setCachedData("admin_settings", form);

      toast({
        type: "success",
        title: "Platform Settings Saved",
        message: "Institutional configurations updated successfully.",
      });
    } catch (e: any) {
      toast({ type: "error", title: "Save Failed", message: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-xs p-6 sm:p-7">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[11px] font-bold tracking-wider uppercase border border-blue-200">
              <Settings className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Institutional Parameters & Policies</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Platform Settings
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Configure institutional branding, support channels, ingestion quotas, and default publication disclosure preferences across all portals.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Institution & Branding */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Institution & Identity</h2>
              <p className="text-xs text-slate-500">Official institution name and support contact details displayed across portals.</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                Institution Name / Portal Title *
              </label>
              <input
                type="text"
                required
                value={form.institutionName}
                onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Appears in browser page headers, email notifications, and student verification portals.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                Official Support Email Address *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Students and faculty who experience credential issues or discrepancies are directed to this contact address.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Storage & Ingestion Policies */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Ingestion & Spreadsheets</h2>
              <p className="text-xs text-slate-500">Storage quotas and parsing safeguards for faculty gradebook uploads.</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1.5">
                Spreadsheet Upload Size Limit (Megabytes) *
              </label>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.maxUploadSizeMb}
                  onChange={(e) => setForm({ ...form, maxUploadSizeMb: parseInt(e.target.value, 10) || 15 })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all font-mono"
                />
                <HardDrive className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Recommended ceiling is 15 MB. Files exceeding this threshold are rejected to safeguard parsing memory.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Default Publication Preferences */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Default Grade Publication Policies</h2>
              <p className="text-xs text-slate-500">Initial disclosure switches applied when faculty create or import a new section.</p>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5 text-xs divide-y divide-slate-100">
            <label className="flex items-start gap-3.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.defaultShowFinalGrade}
                onChange={(e) => setForm({ ...form, defaultShowFinalGrade: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="font-bold text-slate-900 block text-xs">
                  Default &quot;Show Final Overall Grade&quot; Enabled
                </span>
                <span className="text-slate-500 text-[11px] mt-0.5 block leading-relaxed">
                  When faculty publish a newly imported section, student overall grade figures (e.g. 1.50 or 92%) are visible by default.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3.5 cursor-pointer pt-4">
              <input
                type="checkbox"
                checked={form.defaultShowBreakdown}
                onChange={(e) => setForm({ ...form, defaultShowBreakdown: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="font-bold text-slate-900 block text-xs">
                  Default &quot;Show Assessment Component Breakdown&quot; Enabled
                </span>
                <span className="text-slate-500 text-[11px] mt-0.5 block leading-relaxed">
                  When checked, detailed component tables (Class Participation, Enabling Activities, Summative Assessments) are visible to students immediately upon publication.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="md"
            isLoading={isSaving}
            className="gap-2 font-semibold shadow-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-5 py-2.5 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Platform Configurations</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
