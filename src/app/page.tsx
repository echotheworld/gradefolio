"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  ArrowRight,
  Lock,
  User,
  KeyRound,
  AlertCircle,
  FileText,
  Building,
  Scale,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const router = useRouter();

  // Unified Student Access Form
  const [sectionCode, setSectionCode] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStudentAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCode = sectionCode.trim().toUpperCase();
    const cleanStudentNumber = studentNumber.trim();
    const cleanPassword = password.trim();

    if (!cleanCode) {
      setError("Please enter your Course Section Code.");
      return;
    }

    // If only Section Code is provided, take student to Section Overview first
    if (!cleanStudentNumber || !cleanPassword) {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/sections/lookup?code=${encodeURIComponent(cleanCode)}`);
        const data = await res.json();
        if (!res.ok || !data.exists) {
          setError(data.error || "Section Code not found. Please verify with your professor.");
          setIsLoading(false);
          return;
        }
        router.push(`/section/${cleanCode}`);
      } catch {
        setError("Network error while verifying section code.");
        setIsLoading(false);
      }
      return;
    }

    // Full Direct Login
    setIsLoading(true);
    try {
      const res = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionCode: cleanCode,
          studentNumber: cleanStudentNumber,
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Please verify your Section Code, Student ID, and Password.");
        setIsLoading(false);
        return;
      }

      router.push(data.redirect || `/section/${cleanCode}/grades`);
      router.refresh();
    } catch {
      setError("An unexpected network error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] relative overflow-hidden bg-slate-50">
      {/* Dynamic Animated Ambient Background */}
      <div className="absolute inset-0 bg-moving-grid pointer-events-none opacity-60"></div>
      
      {/* Floating subtle ambient orbs for smooth natural motion */}
      <div className="absolute top-10 -left-24 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none animate-float-slow"></div>
      <div className="absolute top-1/3 -right-24 w-[30rem] h-[30rem] bg-indigo-200/25 rounded-full blur-3xl pointer-events-none animate-float-reverse"></div>
      <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-slate-200/40 rounded-full blur-2xl pointer-events-none animate-float-slow"></div>

      {/* Hero & Student Access Section */}
      <section className="relative z-10 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          {/* Institutional Compliance Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-slate-900 text-white mb-6 shadow-sm border border-slate-700">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Official University Grade Publishing System</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Student Academic Grade Portal
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Secure, individualized grade evaluation portal. Authenticate using your section code and student credentials to view your published academic records.
          </p>

          {/* Actual Student Sign In Card */}
          <div className="mt-8 max-w-lg mx-auto text-left">
            <div className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/5">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-teal-600" />
                    <span>Student Grade Sign In</span>
                  </h2>
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    CONFIDENTIAL
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your Section Code, Student ID, and issued access password.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-800 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleStudentAccess} className="space-y-4">
                {/* 1. Section Code */}
                <div>
                  <label
                    htmlFor="sectionCode"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    1. Course Section Code *
                  </label>
                  <div className="relative">
                    <input
                      id="sectionCode"
                      type="text"
                      required
                      value={sectionCode}
                      onChange={(e) => setSectionCode(e.target.value.toUpperCase())}
                      placeholder="e.g. CS101-2026A"
                      className="w-full uppercase font-mono tracking-wider px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 placeholder:normal-case transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* 2. Student ID & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label
                      htmlFor="studentNumber"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      2. Student ID / No.
                    </label>
                    <div className="relative">
                      <input
                        id="studentNumber"
                        type="text"
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                        placeholder="e.g. 2024-00101"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-all font-mono"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      3. Access Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="e.g. GV-XXXX-XXXX"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-all font-mono"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full gap-2 font-semibold shadow-md bg-slate-900 hover:bg-slate-800 text-white"
                    isLoading={isLoading}
                  >
                    <span>Access Official Grade Report</span>
                    <ArrowRight className="w-4 h-4 text-teal-400" />
                  </Button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Authorized student access only</span>
                  <Link href="/admin_mis" className="text-slate-600 hover:text-slate-900 hover:underline">
                    Faculty & Admin MIS &rarr;
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Philippine Data Privacy Act of 2012 (RA 10173) Compliance Notice */}
      <section id="privacy" className="relative z-10 py-16 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center shrink-0 shadow-md">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-block text-[11px] font-bold text-teal-700 uppercase tracking-wider mb-1">
                Statutory Compliance & Educational Framework
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Philippine Data Privacy Act of 2012 (RA 10173) Notice
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                National Privacy Commission (NPC) Compliance for Higher Education Institutions (HEIs).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Sensitive Personal Information (SPI)</span>
              </div>
              <p>
                Under <strong>Section 3(l)(2) of Republic Act No. 10173</strong>, academic evaluations, scores, and grade records are classified as <strong>Sensitive Personal Information (SPI)</strong> commanding the highest standard of statutory protection and institutional accountability.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Strict Prohibition of Public Grade Posting</span>
              </div>
              <p>
                In compliance with National Privacy Commission directives, public posting of student marks on campus bulletin boards, group chats, social media, or open spreadsheets is strictly prohibited. Grades may only be transmitted through secure, authenticated individual channels.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Building className="w-4 h-4 text-slate-700" />
                <span>Legitimate Educational Processing</span>
              </div>
              <p>
                Processing of student marks is conducted by Higher Education Institutions (HEIs) acting as Personal Information Controllers (PICs) strictly for legitimate academic assessment, course evaluation, and official graduation progress requirements.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Technical & Cryptographic Controls</span>
              </div>
              <p>
                Section Codes serve strictly as course locators and do not bypass individual authentication. Student passwords are stored using salted cryptographic hashes (bcrypt) with server-side authorization ensuring zero cross-student data leakage.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-teal-400 shrink-0" />
              <span>
                For questions regarding academic records processing, consult your institutional Data Protection Officer (DPO).
              </span>
            </div>
            <Link href="/admin_mis" className="text-teal-400 hover:text-teal-300 font-medium whitespace-nowrap">
              MIS Administration &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
