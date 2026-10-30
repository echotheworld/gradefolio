"use client";

import React, { useState, useRef, useEffect } from "react";
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
  GraduationCap,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { cn } from "@/lib/utils";

interface VerifiedSection {
  sectionCode: string;
  sectionName: string;
  subjectName: string;
  professorName: string;
  academicYear: string;
  term: string;
  status: string;
  announcement?: string | null;
}

export default function HomePage() {
  const router = useRouter();

  // Modals state
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Privacy notice acknowledgement state
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const privacyScrollRef = useRef<HTMLDivElement | null>(null);

  // Step 1 or 2 for Student Authentication
  const [step, setStep] = useState<1 | 2>(1);

  // Form Fields
  const [sectionCode, setSectionCode] = useState("");
  const [verifiedSection, setVerifiedSection] = useState<VerifiedSection | null>(null);
  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check initial scroll height when privacy modal opens
  useEffect(() => {
    if (isPrivacyModalOpen) {
      setHasScrolledToBottom(false);
      setPrivacyAgreed(false);
      const timer = setTimeout(() => {
        if (privacyScrollRef.current) {
          const { scrollHeight, clientHeight } = privacyScrollRef.current;
          if (scrollHeight <= clientHeight + 35) {
            setHasScrolledToBottom(true);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPrivacyModalOpen]);

  // Handle scroll in privacy modal to unlock/enable the checkbox
  const handlePrivacyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 35) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAgreeAndProceed = () => {
    if (!hasScrolledToBottom || !privacyAgreed) return;
    setIsPrivacyModalOpen(false);
    setIsLoginModalOpen(true);
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPrivacyModalOpen) setIsPrivacyModalOpen(false);
        if (isLoginModalOpen) setIsLoginModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPrivacyModalOpen, isLoginModalOpen]);

  // Step 1: Check Course Section Code Availability
  const handleVerifySection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCode = sectionCode.trim().toUpperCase();

    if (!cleanCode) {
      setError("Please enter your Course Section Code.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/sections/lookup?code=${encodeURIComponent(cleanCode)}`);
      const data = await res.json();

      if (!res.ok || !data.exists) {
        setError(data.error || `Course Section "${cleanCode}" was not found. Please verify with your professor.`);
        setIsLoading(false);
        return;
      }

      if (data.section.status !== "PUBLISHED") {
        setError(
          `Course Section "${cleanCode}" exists, but its grades are currently in Draft status and have not been published by the professor yet.`
        );
        setIsLoading(false);
        return;
      }

      // Section is valid and published! Proceed to Step 2
      setVerifiedSection(data.section);
      setStep(2);
      setIsLoading(false);
    } catch {
      setError("Network error while verifying section code. Please check your internet connection.");
      setIsLoading(false);
    }
  };

  // Step 2: Authenticate Student ID & Password
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCode = sectionCode.trim().toUpperCase();
    const cleanStudentNumber = studentNumber.trim();
    const cleanPassword = password.trim();

    if (!cleanStudentNumber) {
      setError("Please enter your Student ID Number.");
      return;
    }

    if (!cleanPassword) {
      setError("Please enter your access password.");
      return;
    }

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
        setError(data.error || "Authentication failed. Please verify your Student ID and Password.");
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
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-between bg-white text-slate-900 selection:bg-[#2563EB] selection:text-white">
      {/* 1. LIGHT CLEAN BACKGROUND WITH ANIMATED GRID PATTERN */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-white to-white pointer-events-none" />

      {/* Magic UI Animated Grid Pattern on White Canvas */}
      <AnimatedGridPattern
        numSquares={35}
        maxOpacity={0.12}
        duration={3}
        repeatDelay={1}
        className={cn(
          "[mask-image:radial-gradient(750px_circle_at_center,white,transparent)]",
          "fill-[#2563EB]/15 stroke-slate-200/90 inset-x-0 inset-y-[-20%] h-[180%] skew-y-12"
        )}
      />

      {/* Subtle Ambient Light Accents */}
      <div className="absolute -top-32 -left-32 w-[38rem] h-[38rem] bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[42rem] h-[42rem] bg-amber-50/40 rounded-full blur-3xl pointer-events-none" />

      {/* 2. TOP HERO HEADER */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-10 pt-4 sm:pt-8 flex items-center justify-between gap-3">
        {/* Brand Crest & Name */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
          <BrandLogo size={40} className="w-9 h-9 sm:w-11 sm:h-11 ring-2 sm:ring-4 ring-blue-50 shadow-xs group-hover:scale-105 transition-transform shrink-0" priority />
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight truncate">Gradefolio</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-extrabold uppercase tracking-widest truncate">
              INDEPENDENT ACADEMIC TOOL
            </span>
          </div>
        </Link>

        {/* Right Action: Student Login Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-95 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/20 cursor-pointer group"
          >
            <User className="w-3.5 h-3.5 text-[#FBBF24] group-hover:scale-110 transition-transform" />
            <span>Student Login</span>
          </button>
        </div>
      </header>

      {/* 3. CENTER HERO BODY: FULLY CENTERED LAYOUT */}
      <main className="relative z-20 flex-1 max-w-4xl mx-auto w-full px-4 sm:px-10 py-10 sm:py-24 flex flex-col items-center justify-center text-center my-auto space-y-6 sm:space-y-8">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF3C7] border border-[#FCD34D] text-xs font-bold text-[#92400E] tracking-wide uppercase shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#92400E]" />
          <span>Secure Student Grade Viewer</span>
        </div>

        {/* Central Headline & Supporting Copy */}
        <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
          <div className="text-xs font-black uppercase tracking-widest text-[#2563EB]">
            Student Portal
          </div>
          <h1 className="text-2xl sm:text-5xl md:text-6xl lg:text-[4rem] font-black tracking-tight leading-[1.15] text-slate-900">
            <span className="block whitespace-normal sm:whitespace-nowrap">Understand your grades.</span>
            <span className="block whitespace-normal sm:whitespace-nowrap text-[#2563EB]">See every point clearly.</span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto pt-1 sm:pt-2">
            Review your published assessment scores and grade breakdowns in one place. See how each score contributes to your academic standing.
          </p>
        </div>

        {/* Feature Badges */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-slate-600 font-bold">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Private grade access</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24]" />
            <span>Transparent breakdowns</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            <span>Individual student view</span>
          </div>
        </div>
      </main>

      {/* 4. BOTTOM HERO TICKER & DISCLAIMER */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 sm:px-10 pb-6 sm:pb-8 flex flex-col items-start justify-start text-left gap-1.5 text-[11px] text-slate-500 border-t border-slate-200/80 pt-6">
        <p className="max-w-2xl leading-relaxed text-left">
          Gradefolio is an independent academic grade breakdown viewer and is not affiliated with, endorsed by, or operated by any educational institution unless expressly stated. Grade records are provided by authorized professors for individual review and may not constitute official institutional grades.
        </p>
        <div className="font-semibold text-slate-700 text-left">
          &copy; {new Date().getFullYear()} Gradefolio. All rights reserved.
        </div>
      </footer>

      {/* 5. DATA PRIVACY NOTICE & ACCESS TERMS MODAL */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Area */}
            <div className="p-4 sm:p-7 border-b border-slate-100 flex items-start justify-between gap-3 sm:gap-4">
              <div className="space-y-1 sm:space-y-1.5">
                <span className="inline-block px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-blue-50 border border-blue-200 text-[#2563EB] text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider">
                  DATA PRIVACY NOTICE &amp; ACCESS TERMS
                </span>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                  Student Access &amp; Privacy Acknowledgment
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Please read and scroll through this notice before entering your credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div
              ref={privacyScrollRef}
              onScroll={handlePrivacyScroll}
              className="overflow-y-auto p-4 sm:p-7 space-y-5 sm:space-y-6 text-xs text-slate-600 leading-relaxed max-h-[48vh] sm:max-h-[50vh] border-y border-slate-100 bg-slate-50/50"
            >
              {/* Section 1 */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  1. Nature and Purpose of Gradefolio
                </h3>
                <p>
                  Gradefolio is an independent academic assessment and grade breakdown platform developed by Jericho Feolino. It serves as an auxiliary transparency tool to help students view published scores, weighted calculations, and grading criteria.
                </p>
                <p>
                  Gradefolio is not an official portal, grading management system, or registrar database of any educational institution. Official grades and academic standings remain governed exclusively by your school&apos;s recognized systems and policies.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  2. Processing of Sensitive Personal Information
                </h3>
                <p>
                  Under Section 3(l) of Republic Act No. 10173 (The Data Privacy Act of 2012), records concerning an individual&apos;s education and academic performance constitute Sensitive Personal Information (SPI).
                </p>
                <p>To calculate and present your grade breakdown, the platform processes:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Course section identifiers</li>
                  <li>Pseudonymized student identifiers, student numbers, or private activation keys</li>
                  <li>Recorded assessment scores, weights, criteria, and calculated point contributions</li>
                </ul>
                <p>
                  This information is processed exclusively for the purpose of presenting your individual assessment breakdown to you.
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  3. Source of Academic Records and Discrepancies
                </h3>
                <p>
                  All assessment scores, grading structures, rubrics, and weight distributions displayed on this platform are encoded, verified, and published directly by your authorized course professor.
                </p>
                <p>
                  Gradefolio does not assign, alter, certify, or audit grades. In the event of an encoding error, calculation question, or score discrepancy, you must contact your course professor directly for review and rectification.
                </p>
              </div>

              {/* Section 4 */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  4. Credential Security and User Responsibilities
                </h3>
                <p>
                  Access to assessment records is restricted to the authorized individual student. By proceeding, you agree to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Keep your access credentials, section codes, and private keys strictly confidential</li>
                  <li>Refrain from attempting to view, scrape, query, or enumerate records belonging to any other student</li>
                  <li>Notify your professor or the platform administrator immediately if you suspect unauthorized access to your records</li>
                </ul>
                <p>
                  Unauthorized attempts to access records belonging to other individuals constitute a violation of applicable computer access and data privacy laws.
                </p>
              </div>

              {/* Section 5 */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  5. Data Subject Rights
                </h3>
                <p>
                  In accordance with Republic Act No. 10173, you retain the rights of a data subject, including:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>The right to be informed of the nature and extent of data processing</li>
                  <li>The right to access your recorded breakdown</li>
                  <li>The right to dispute and rectify errors through your course professor</li>
                  <li>The right to request the removal or masking of your records upon completion of the academic term</li>
                </ul>
              </div>

              {/* Section 6 */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 text-sm">
                  6. Limitation of Liability
                </h3>
                <p>
                  Gradefolio and its creator provide this platform on an auxiliary basis to facilitate grading transparency. To the maximum extent permitted by applicable law, the platform assumes no liability for grading decisions, professor submission timelines, institutional accreditation disputes, or discrepancies between this breakdown tool and official institutional records.
                </p>
              </div>

            </div>

            {/* Checkbox and Action Area */}
            <div className="p-4 sm:p-7 space-y-4 bg-white">
              {/* Checkbox (enabled only after scrolling through) */}
              <label className={cn(
                "flex items-start gap-3 select-none transition-all",
                hasScrolledToBottom ? "cursor-pointer group" : "opacity-50 cursor-not-allowed"
              )}>
                <input
                  type="checkbox"
                  disabled={!hasScrolledToBottom}
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer disabled:cursor-not-allowed"
                />
                <span className={cn(
                  "text-[11px] sm:text-xs leading-relaxed transition-colors",
                  hasScrolledToBottom ? "text-slate-700 font-medium group-hover:text-slate-900" : "text-slate-400"
                )}>
                  I have read, understood, and agreed to the Data Privacy Notice and Access Terms. I voluntarily consent to the processing of my student identifier and assessment scores for the sole purpose of viewing my personal grade breakdown on Gradefolio.
                </span>
              </label>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPrivacyModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={!hasScrolledToBottom || !privacyAgreed}
                    onClick={handleAgreeAndProceed}
                    className="w-full sm:w-auto gap-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed py-2.5"
                  >
                    <span>I Agree &amp; Continue to Access</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. LOGIN FORM POP-UP MODAL */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white text-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-7 border border-slate-200 relative overflow-hidden flex flex-col max-h-[92vh] overflow-y-auto my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Card Header */}
            <div className="flex items-center border-b border-slate-100 pb-3 sm:pb-4 mb-3 sm:mb-4 justify-between gap-3 shrink-0">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black uppercase tracking-wider text-slate-900 truncate">
                  Access Your Grades
                </span>
                <span className="text-[11px] text-slate-500 font-medium truncate">
                  {step === 1 ? "Step 1 of 2 · Identify course section" : "Step 2 of 2 · Student verification"}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Step {step} of 2
                </span>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-3.5 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-800 leading-snug font-semibold shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="break-words">{error}</span>
              </div>
            )}

            {/* STEP 1: Section Verification */}
            {step === 1 && (
              <form onSubmit={handleVerifySection} className="space-y-3.5 sm:space-y-4">
                <div>
                  <label
                    htmlFor="heroSectionCode"
                    className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Course Section Code
                  </label>
                  <div className="relative">
                    <input
                      id="heroSectionCode"
                      type="text"
                      required
                      autoFocus
                      value={sectionCode}
                      onChange={(e) => setSectionCode(e.target.value.toUpperCase())}
                      placeholder="Enter the code provided by your professor"
                      className="w-full uppercase font-mono tracking-wider pl-3.5 pr-10 py-2.5 sm:py-3 text-base sm:text-sm rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900 placeholder:text-slate-400 placeholder:normal-case font-bold shadow-xs transition-all"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    className="w-full gap-2 text-sm shadow-md py-3 sm:py-3.5 font-bold"
                    isLoading={isLoading}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </Button>
                </div>

                {/* Yellow Alert Box */}
                <div className="rounded-xl bg-[#FEF3C7] border border-[#FCD34D] p-3 flex items-start gap-2.5 text-xs text-[#92400E]">
                  <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-bold">Can’t find your section code?</span>{" "}
                    <span className="font-medium text-[#78350F]">Contact your professor.</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                    <span>Your course section will be verified before you proceed.</span>
                  </span>
                </div>
              </form>
            )}

            {/* STEP 2: Student Authentication */}
            {step === 2 && verifiedSection && (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                {/* Verified Section Banner */}
                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                      <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
                      <span className="truncate">{verifiedSection.subjectName} ({verifiedSection.sectionCode})</span>
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium flex items-center gap-2 flex-wrap">
                      <span>
                        <span className="text-slate-400 font-normal">Professor: </span>
                        <span className="font-semibold text-slate-800">{verifiedSection.professorName}</span>
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="text-slate-600 font-mono">{verifiedSection.term}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                    }}
                    className="text-[11px] font-bold text-[#2563EB] hover:text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* Student Number & Password */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label
                      htmlFor="heroStudentNumber"
                      className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Student ID Number *
                    </label>
                    <div className="relative">
                      <input
                        id="heroStudentNumber"
                        type="text"
                        required
                        autoFocus
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                        placeholder="e.g. 2024-00101"
                        className="w-full pl-3.5 pr-10 py-2.5 text-base sm:text-sm rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900 font-mono font-bold shadow-xs transition-all"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="heroPassword"
                      className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Access Password *
                    </label>
                    <div className="relative">
                      <input
                        id="heroPassword"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="e.g. GV-XXXX-XXXX"
                        className="w-full pl-3.5 pr-10 py-2.5 text-base sm:text-sm rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900 font-mono font-bold shadow-xs transition-all"
                      />
                      <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError("");
                    }}
                    className="px-3 sm:px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <Button
                    type="submit"
                    size="lg"
                    variant="primary"
                    className="flex-1 gap-2 text-xs sm:text-sm shadow-md py-3 font-bold truncate"
                    isLoading={isLoading}
                  >
                    <Lock className="w-4 h-4 text-white shrink-0" />
                    <span className="truncate">Sign In &amp; View Grades</span>
                  </Button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 truncate">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                    <span className="truncate">Individual student view &bull; Encrypted</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setSectionCode("");
                      setVerifiedSection(null);
                    }}
                    className="text-slate-400 hover:text-slate-700 hover:underline cursor-pointer shrink-0 ml-2"
                  >
                    Reset
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
