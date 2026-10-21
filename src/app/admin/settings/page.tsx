"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Settings, Save, ShieldCheck, Mail, Database, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    institutionName: "GradeView University Portal",
    supportEmail: "support@gradeview.edu",
    maxUploadSizeMb: 15,
    defaultShowFinalGrade: true,
    defaultShowBreakdown: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setForm({
            institutionName: data.settings.institutionName,
            supportEmail: data.settings.supportEmail,
            maxUploadSizeMb: data.settings.maxUploadSizeMb,
            defaultShowFinalGrade: data.settings.defaultShowFinalGrade,
            defaultShowBreakdown: data.settings.defaultShowBreakdown,
          });
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
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

      if (!res.ok) throw new Error("Failed to save settings");

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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Super Admin Overview</span>
        </Link>
      </div>

      <div className="pb-4 border-b border-slate-200">
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
          System Configuration
        </span>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Global policies, institution branding, storage quotas, and default publication behavior.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">Institution & Branding</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Customize portal labels and contact information.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6 text-xs">
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Institution Name / Portal Title
                </label>
                <input
                  type="text"
                  required
                  value={form.institutionName}
                  onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Support Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={form.supportEmail}
                  onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Spreadsheet Upload Size Limit (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={form.maxUploadSizeMb}
                  onChange={(e) => setForm({ ...form, maxUploadSizeMb: parseInt(e.target.value, 10) || 15 })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider">
                Default Section Publication Preferences
              </h4>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.defaultShowFinalGrade}
                  onChange={(e) => setForm({ ...form, defaultShowFinalGrade: e.target.checked })}
                  className="mt-0.5 rounded text-slate-900"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">
                    Default &quot;Show Final Grade&quot; Enabled
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    New sections will have overall final marks visible by default.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.defaultShowBreakdown}
                  onChange={(e) => setForm({ ...form, defaultShowBreakdown: e.target.checked })}
                  className="mt-0.5 rounded text-slate-900"
                />
                <div>
                  <span className="font-semibold text-slate-900 block">
                    Default &quot;Show Breakdown&quot; Enabled
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    New sections will display assessment breakdown tables by default.
                  </span>
                </div>
              </label>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button type="submit" size="sm" isLoading={isSaving} className="font-semibold gap-1.5">
              <Save className="w-3.5 h-3.5" />
              <span>Save Platform Settings</span>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
