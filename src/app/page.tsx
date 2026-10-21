"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  ArrowRight,
  FileSpreadsheet,
  Lock,
  Eye,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const router = useRouter();
  const [sectionCode, setSectionCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = sectionCode.trim().toUpperCase();
    if (!code) {
      setError("Please enter a valid Section Code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/sections/lookup?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || !data.exists) {
        setError(data.error || "Section code not found. Please check with your professor.");
        setIsLoading(false);
        return;
      }

      router.push(`/section/${code}`);
    } catch {
      setError("An error occurred while looking up the section.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/50 border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 text-white mb-6 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Privacy-First Grade Publishing Portal</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Your grades, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-teal-800 to-slate-900">
              clearly presented.
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Access the academic evaluation your professor has published in one calm, secure space.
            No public rankings, no score comparisons — only your verified academic progress.
          </p>

          {/* Section Code Card */}
          <div id="lookup" className="mt-10 max-w-md mx-auto">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 text-left">
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label htmlFor="sectionCode" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Enter Section Code
                  </label>
                  <div className="relative">
                    <input
                      id="sectionCode"
                      type="text"
                      value={sectionCode}
                      onChange={(e) => setSectionCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CS101-2026A"
                      className="w-full uppercase font-mono tracking-wider px-4 py-3 text-base rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 placeholder:normal-case placeholder:font-sans transition-all"
                    />
                    <div className="absolute right-3 top-3 text-slate-400 pointer-events-none">
                      <Search className="w-5 h-5" />
                    </div>
                  </div>
                  {error && <p className="text-xs text-rose-600 mt-2 font-medium">{error}</p>}
                </div>

                <Button type="submit" size="lg" className="w-full gap-2 font-semibold shadow-md" isLoading={isLoading}>
                  <span>View Section</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-teal-600" />
                    Protected by student access password
                  </span>
                  <Link href="/auth/login" className="text-teal-700 hover:underline font-medium">
                    Professor Sign In &rarr;
                  </Link>
                </div>
              </form>
            </div>

            {/* Quick Demo Hint */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>
                Demo section ready: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-800 font-mono">CS101-2026A</code>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Product Positioning / 3 Roles */}
      <section className="py-16 bg-white border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900">Engineered for Academic Trust</h2>
            <p className="text-sm text-slate-500 mt-2">
              Designed around the spreadsheet workflow professors rely on and the confidentiality students deserve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student */}
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center mb-4">
                <Eye className="w-5 h-5 text-teal-700" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">For Students</h3>
              <p className="text-xs font-medium text-teal-800 mt-0.5 mb-2">Check your grades privately from any device.</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                No lengthy account registration. Simply enter your course Section Code and the credential provided by your professor to view your clear assessment breakdown.
              </p>
            </div>

            {/* Professor */}
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">For Professors</h3>
              <p className="text-xs font-medium text-slate-700 mt-0.5 mb-2">Keep your spreadsheet workflow.</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Continue calculating marks in Excel or CSV. Use the guided 6-step import wizard to validate records, configure student-visible fields, and publish with complete intentionality.
              </p>
            </div>

            {/* Super Admin */}
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5 text-purple-700" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">For Super Admins</h3>
              <p className="text-xs font-medium text-purple-800 mt-0.5 mb-2">Institutional governance & auditability.</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Manage professor provisioning, monitor platform health and section lifecycles, and review immutable append-only audit logs without intruding on private grade data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 bg-slate-50/50 border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-slate-900">How GradeView Works</h2>
            <p className="text-sm text-slate-500 mt-2">
              A frictionless four-step journey from raw grade sheet to private student delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mb-3">
                1
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Import Spreadsheet</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Professor uploads `.xlsx` or `.csv` and verifies column mappings in the guided wizard.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mb-3">
                2
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Validate & Review</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                System flags duplicates, missing IDs, and abnormal score ranges before saving drafts.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center mb-3">
                3
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Generate Credentials</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Unique high-entropy student passwords are generated and exported for secure distribution.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
              <div className="w-7 h-7 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center mb-3">
                4
              </div>
              <h4 className="font-semibold text-sm text-slate-900">Private Delivery</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Students access only their own published grades with zero cross-student visibility.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy Principles */}
      <section id="privacy" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-900 text-white rounded-2xl p-8 sm:p-12 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-8 h-8 text-teal-400" />
              <h3 className="text-2xl font-bold tracking-tight">Our Core Privacy Commitment</h3>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Grade information is personal and sensitive information. GradeView is purposefully built with zero gamification, zero social elements, and zero public data leaks:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>No public rankings or leaderboards:</strong> Academic performance is private between student and professor.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Section Code is a locator, not a key:</strong> Entering a section code never reveals student grades.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Server-enforced isolation:</strong> Browsers never receive the entire gradebook payload.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span><strong>Immutable Audit Logs:</strong> All publications, unpublications, and credential actions are recorded.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
