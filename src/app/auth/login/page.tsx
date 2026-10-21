"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
        setIsLoading(false);
        return;
      }

      router.push(data.redirect || "/professor");
      router.refresh();
    } catch {
      setError("An unexpected network error occurred.");
      setIsLoading(false);
    }
  };

  const handlePreFill = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError("");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Public Portal</span>
        </Link>
      </div>

      <Card className="shadow-xl border-slate-200">
        <CardHeader className="text-center pb-4 pt-8">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-teal-400 mx-auto flex items-center justify-center mb-3 shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">Faculty & Admin Access</CardTitle>
          <CardDescription className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
            Sign in to manage sections, import gradebooks, issue student credentials, and publish academic records.
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
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Institutional Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="professor@gradeview.edu"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-slate-900 placeholder:text-slate-400 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full font-semibold shadow-md mt-2" isLoading={isLoading}>
              Sign In to Workspace
            </Button>
          </form>

          {/* Quick Demo Pre-fill helper */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Test Accounts
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => handlePreFill("prof.reyes@gradeview.edu", "ProfessorPass123!")}
                className="text-left text-xs p-2 rounded-md hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-between"
              >
                <span>
                  <strong>Prof. Alan Reyes</strong> (CS Department)
                </span>
                <span className="text-[10px] text-teal-700 font-mono">Fill &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handlePreFill("admin@gradeview.edu", "AdminPass123!")}
                className="text-left text-xs p-2 rounded-md hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-between"
              >
                <span>
                  <strong>Dr. Eleanor Vance</strong> (Super Admin)
                </span>
                <span className="text-[10px] text-purple-700 font-mono">Fill &rarr;</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
