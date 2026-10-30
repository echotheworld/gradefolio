"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, KeyRound, User, AlertCircle, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { setCachedData } from "@/lib/client-cache";

export default function StudentLoginPage() {
  const params = useParams();
  const router = useRouter();
  const sectionCode = (params.code as string)?.toUpperCase();

  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isIdleExpired, setIsIdleExpired] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("expired") === "idle") {
          setIsIdleExpired(true);
        }
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!studentNumber.trim() || !password.trim()) {
      setError("Please provide both your Student ID and access password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionCode,
          studentNumber: studentNumber.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      if (data.report && sectionCode) {
        setCachedData(`student_grades_${sectionCode}`, data.report);
      }

      router.push(data.redirect || `/section/${sectionCode}/grades`);
      router.refresh();
    } catch {
      setError("Network or server error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-12">
      <div className="mb-4 sm:mb-6">
        <Link
          href={`/section/${sectionCode}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Section Overview</span>
        </Link>
      </div>

      <Card className="rounded-2xl shadow-xs border-slate-200/80 bg-white">
        <CardHeader className="text-center pb-3 sm:pb-4 pt-6 sm:pt-8 px-4 sm:px-6">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#2563EB] text-white mx-auto flex items-center justify-center mb-3 shadow-xs ring-4 ring-blue-50">
            <Lock className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">View My Grades</CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed font-medium">
            Enter the Student ID and access password provided by your professor for section{" "}
            <span className="font-mono font-semibold text-slate-900">{sectionCode}</span>.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 pt-2">
          {isIdleExpired && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 sm:p-3.5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed font-medium">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Your session expired due to inactivity. Please sign in again to view your grades.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 sm:p-3.5 flex items-start gap-2.5 text-xs text-rose-800 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            <div>
              <label htmlFor="studentNumber" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Student ID / Number
              </label>
              <div className="relative">
                <input
                  id="studentNumber"
                  type="text"
                  required
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="e.g. 2024-00101"
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900 placeholder:text-slate-400 font-mono font-bold shadow-xs transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Access Password / Credential
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. GV-XXXX-XXXX"
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900 font-mono font-bold shadow-xs transition-all"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <Button type="submit" size="lg" variant="primary" className="w-full font-semibold shadow-md mt-2 py-3 sm:py-3.5 text-sm" isLoading={isLoading}>
              Sign In &amp; View Grades
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Need help accessing your grades?{" "}
              <span className="text-slate-700 font-medium">Please contact your professor directly.</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
