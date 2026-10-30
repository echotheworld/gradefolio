"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  KeyRound,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { cn } from "@/lib/utils";

export default function AdminMisLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
        setError(data.error || "Authentication failed. Invalid faculty credentials.");
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
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 sm:p-6 bg-white text-slate-900 selection:bg-[#2563EB] selection:text-white">
      {/* 1. LIGHT CLEAN BACKGROUND WITH ANIMATED GRID PATTERN (SAME AS MAIN HOME) */}
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

      {/* 2. ONLY LOGIN FORM (CENTERED, NOTHING MORE NOTHING LESS) */}
      <div className="relative z-20 w-full max-w-md">
        <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-200 relative overflow-hidden backdrop-blur-xl">
          {/* Top Card Header */}
          <div className="flex items-center border-b border-slate-100 pb-4 mb-5 justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 group min-w-0">
              <BrandLogo
                size={38}
                priority
                className="w-9 h-9 ring-2 ring-blue-50 shadow-xs group-hover:scale-105 transition-transform shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black uppercase tracking-wider text-slate-900 truncate">
                  Professor Sign In
                </span>
                <span className="text-[11px] text-slate-500 font-medium truncate">
                  Gradefolio Management Workspace
                </span>
              </div>
            </Link>

            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] shrink-0">
              FACULTY
            </span>
          </div>

          {/* Idle Timeout Notice */}
          {isIdleExpired && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-900 leading-snug font-medium">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Your session expired due to inactivity. Please sign in again to continue.</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-start gap-2.5 text-xs text-rose-800 leading-snug font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {/* Professor Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="misEmail"
                className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Professor Email *
              </label>
              <div className="relative">
                <input
                  id="misEmail"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. professor@university.edu"
                  className="w-full pl-3.5 pr-10 py-3 text-sm rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900 placeholder:text-slate-400 font-medium shadow-xs transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium leading-snug">
                Use your registered faculty or administrator account email.
              </p>
            </div>

            <div>
              <label
                htmlFor="misPassword"
                className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Access Password *
              </label>
              <div className="relative">
                <input
                  id="misPassword"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-3 text-sm rounded-xl border-2 border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-slate-900 font-mono shadow-xs transition-all"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 font-medium leading-snug">
                Forgot your password? <span className="font-semibold text-slate-700">Contact your administrator.</span>
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                variant="primary"
                className="w-full gap-2 text-sm shadow-md py-3.5 font-bold"
                isLoading={isLoading}
              >
                <Lock className="w-4 h-4 text-white" />
                <span>Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </Button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" />
                Encrypted transmission &bull; Private access
              </span>
              <Link
                href="/"
                className="text-[#2563EB] hover:underline font-bold"
              >
                Student Portal &rarr;
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
