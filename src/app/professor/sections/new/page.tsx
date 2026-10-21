"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Sparkles, ShieldCheck, CheckSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { generateRandomCode } from "@/lib/utils";

export default function CreateSectionPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    subjectName: "",
    sectionName: "",
    academicYear: "2026-2027",
    term: "1st Semester",
    sectionCode: "",
    announcement: "",
    showFinalGrade: true,
    showBreakdown: true,
    showProvisionalNotice: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerateCode = () => {
    setFormData((prev) => ({ ...prev, sectionCode: generateRandomCode("GV") }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.subjectName.trim() || !formData.sectionName.trim()) {
      setError("Please fill in both the Course Title and Section Name.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/professor/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create section.");
        setIsLoading(false);
        return;
      }

      router.push(`/professor/sections/${data.section.id}`);
      router.refresh();
    } catch {
      setError("An unexpected network error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <Link
          href="/professor"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl font-bold text-slate-900">Create New Course Section</CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Configure section metadata and publishing parameters. The section will be created in Draft status.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 font-medium">
                {error}
              </div>
            )}

            {/* Course & Section Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Course Title / Subject Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.subjectName}
                  onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                  placeholder="e.g. CS 101 — Data Structures and Algorithms"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Section Identifier / Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sectionName}
                  onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                  placeholder="e.g. BSCS 2-A"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Section Code (Lookup Code)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.sectionCode}
                    onChange={(e) => setFormData({ ...formData, sectionCode: e.target.value.toUpperCase() })}
                    placeholder="Auto-generated if blank"
                    className="w-full uppercase font-mono px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCode}
                    className="shrink-0 text-xs gap-1"
                    title="Generate high-entropy code"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>Generate</span>
                  </Button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Students use this code to locate the course page.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Term / Semester
                </label>
                <select
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Midyear / Summer">Midyear / Summer</option>
                  <option value="Trimester 1">Trimester 1</option>
                  <option value="Trimester 2">Trimester 2</option>
                  <option value="Trimester 3">Trimester 3</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  placeholder="2026-2027"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Optional Announcement to Students
                </label>
                <textarea
                  rows={2}
                  value={formData.announcement}
                  onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
                  placeholder="e.g. Grades published October 21. Consultation scheduled for Friday 2 PM."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
            </div>

            {/* Visibility Settings */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Student-Visible Report Fields
              </h4>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showFinalGrade}
                    onChange={(e) => setFormData({ ...formData, showFinalGrade: e.target.checked })}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Display Final Grade / Standing</span>
                    <span className="text-[11px] text-slate-500">
                      When enabled, the authenticated student sees their overall final course mark.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showBreakdown}
                    onChange={(e) => setFormData({ ...formData, showBreakdown: e.target.checked })}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Display Assessment Breakdown</span>
                    <span className="text-[11px] text-slate-500">
                      Shows itemized scores for quizzes, assignments, and exam components.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showProvisionalNotice}
                    onChange={(e) => setFormData({ ...formData, showProvisionalNotice: e.target.checked })}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">Show Provisional Warning</span>
                    <span className="text-[11px] text-slate-500">
                      Displays a clear note on provisional records indicating scores remain subject to validation.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50/80 px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between">
            <Link href="/professor">
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </Link>
            <Button type="submit" size="md" className="gap-2 font-semibold" isLoading={isLoading}>
              <Plus className="w-4 h-4" />
              <span>Create Section (Draft)</span>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
