"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ShieldCheck, AlertCircle, ArrowLeft, GraduationCap, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export default function AdminMisLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Institutional email and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Invalid faculty/admin credentials.");
        setIsLoading(false);
        return;
      }

      router.push(data.redirect || "/professor");
      router.refresh();
    } catch {
      setError("Network or server connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-12 relative bg-slate-900 overflow-hidden">
      {/* Background moving ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none animate-float-slow"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-float-reverse"></div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Student Portal</span>
          </Link>
          <span className="text-[11px] font-mono text-slate-500">MIS SECURE GATEWAY</span>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur text-white">
          <div className="text-center pb-6">
            <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 text-teal-400 mx-auto flex items-center justify-center mb-3 shadow-inner">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Management Information System
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Authorized access for Faculty Members, Department Chairs, and Super Administrators.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-rose-950/60 border border-rose-800/80 p-3.5 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="misEmail"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Institutional Email
              </label>
              <div className="relative">
                <input
                  id="misEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@gradeview.edu"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-700 bg-slate-900/80 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label
                htmlFor="misPassword"
                className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
              >
                Access Password
              </label>
              <div className="relative">
                <input
                  id="misPassword"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-700 bg-slate-900/80 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-mono"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full font-semibold shadow-md mt-2 bg-teal-600 hover:bg-teal-500 text-white border-0"
              isLoading={isLoading}
            >
              Sign In to MIS Workspace
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Session protected by encrypted server-side authorization</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              All administrative access and grade publishing actions are recorded in an append-only audit trail in compliance with institutional guidelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
