"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowLeft, KeyRound, User, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export default function StudentLoginPage() {
  const params = useParams();
  const router = useRouter();
  const sectionCode = (params.code as string)?.toUpperCase();

  const [studentNumber, setStudentNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

      router.push(data.redirect || `/section/${sectionCode}/grades`);
      router.refresh();
    } catch {
      setError("Network or server error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="mb-6">
        <Link
          href={`/section/${sectionCode}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Section Overview</span>
        </Link>
      </div>

      <Card className="shadow-xl border-slate-200">
        <CardHeader className="text-center pb-4 pt-8">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-teal-400 mx-auto flex items-center justify-center mb-3 shadow-md">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">View My Grades</CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
            Enter the Student ID and access password provided by your professor for section{" "}
            <span className="font-mono font-semibold text-slate-900">{sectionCode}</span>.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-2.5 text-xs text-rose-800 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-all"
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-all font-mono"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full font-semibold shadow-md mt-2" isLoading={isLoading}>
              Sign In & View Grades
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
