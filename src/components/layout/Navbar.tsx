"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  GraduationCap,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  BookOpen,
  FileSpreadsheet,
  Users,
  Settings,
  History,
  KeyRound,
} from "lucide-react";
import { Button } from "../ui/Button";

interface NavbarProps {
  user?: {
    displayName: string;
    email: string;
    role: "SUPER_ADMIN" | "PROFESSOR";
  } | null;
  studentSession?: {
    displayName: string;
    studentNumber: string;
    sectionCode: string;
  } | null;
}

export function Navbar({ user, studentSession }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickDemoSwitch = async (role: "admin" | "prof" | "student") => {
    setDemoMenuOpen(false);
    try {
      const res = await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.redirect) {
        router.push(data.redirect);
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isAdmin = user?.role === "SUPER_ADMIN";
  const isProfessor = user?.role === "PROFESSOR";
  const isStudent = !!studentSession;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm group-hover:bg-teal-700 transition-colors">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-base leading-none tracking-tight">
                  GradeView
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5">
                  Academic Portal
                </span>
              </div>
            </Link>

            {/* Navigation Links per role */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              {isAdmin && (
                <>
                  <Link
                    href="/admin"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname === "/admin"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Overview
                  </Link>
                  <Link
                    href="/admin/professors"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname.startsWith("/admin/professors")
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Professors
                  </Link>
                  <Link
                    href="/admin/sections"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname.startsWith("/admin/sections")
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    All Sections
                  </Link>
                  <Link
                    href="/admin/activity"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname.startsWith("/admin/activity")
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Audit Log
                  </Link>
                  <Link
                    href="/admin/settings"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname.startsWith("/admin/settings")
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Settings
                  </Link>
                </>
              )}

              {isProfessor && (
                <>
                  <Link
                    href="/professor"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname === "/professor"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/professor#sections"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname.includes("#sections")
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    My Sections
                  </Link>
                  <Link
                    href="/professor/sections/new"
                    className={`px-3 py-1.5 rounded-md transition-colors ${
                      pathname === "/professor/sections/new"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    + Create Section
                  </Link>
                </>
              )}

              {!isAdmin && !isProfessor && !isStudent && (
                <>
                  <Link
                    href="/#lookup"
                    className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    Enter Section Code
                  </Link>
                  <Link
                    href="/#how-it-works"
                    className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    How It Works
                  </Link>
                  <Link
                    href="/#privacy"
                    className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    Privacy Promise
                  </Link>
                </>
              )}

              {isStudent && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-md">
                  <span className="font-semibold text-slate-900">Section:</span>
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {studentSession.sectionCode}
                  </span>
                </div>
              )}
            </nav>
          </div>

          {/* Right actions: Demo Quick-Switch & Auth status */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Switcher for convenience during testing */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDemoMenuOpen(!demoMenuOpen)}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100 transition-colors"
                title="Quickly switch between Super Admin, Professor, or Student test accounts"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Quick Role Demo</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {demoMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg bg-white border border-slate-200 shadow-xl py-2 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                    Instant Role Switcher
                  </div>
                  <button
                    onClick={() => handleQuickDemoSwitch("admin")}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900">Super Admin</div>
                      <div className="text-[11px] text-slate-500">Dr. Eleanor Vance (Platform owner)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickDemoSwitch("prof")}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900">Professor (CS Dept)</div>
                      <div className="text-[11px] text-slate-500">Prof. Alan Reyes (CS101, CS201)</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickDemoSwitch("student")}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2.5 transition-colors"
                  >
                    <GraduationCap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900">Student Portal</div>
                      <div className="text-[11px] text-slate-500">Juan Dela Cruz (CS101-2026A)</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* User status */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pl-2.5 pr-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-semibold flex items-center justify-center">
                    {user.displayName.charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-slate-700 hidden sm:inline-block max-w-[120px] truncate">
                    {user.displayName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white border border-slate-200 shadow-xl py-2 z-50 text-xs">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="font-medium text-slate-900 truncate">{user.displayName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      <div className="mt-1">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-slate-100 text-slate-700">
                          {user.role === "SUPER_ADMIN" ? "Super Admin" : "Professor"}
                        </span>
                      </div>
                    </div>

                    {user.role === "SUPER_ADMIN" ? (
                      <Link
                        href="/admin/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <Settings className="w-3.5 h-3.5" /> Platform Settings
                      </Link>
                    ) : (
                      <Link
                        href="/professor/account"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                      >
                        <User className="w-3.5 h-3.5" /> Account Settings
                      </Link>
                    )}

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : studentSession ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900">{studentSession.displayName}</div>
                  <div className="text-[11px] font-mono text-slate-500">{studentSession.studentNumber}</div>
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5 text-xs">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button variant="outline" size="sm">
                    Professor / Admin Sign In
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
