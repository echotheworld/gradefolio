"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Users,
  KeyRound,
  FileSpreadsheet,
  History,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { IdleSessionTracker } from "@/components/auth/IdleSessionTracker";

interface UserProp {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export function ProfessorSidebarLayout({
  user,
  children,
}: {
  user: UserProp | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        try {
          const saved = localStorage.getItem("gradefolio_sidebar_open");
          if (saved !== null) {
            setSidebarOpen(saved === "true");
          } else {
            setSidebarOpen(true);
          }
        } catch {}
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (!isMobile) {
        try {
          localStorage.setItem("gradefolio_sidebar_open", String(next));
        } catch {}
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const navGroups = [
    {
      title: "Core Workspace",
      items: [
        {
          name: "My Sections",
          href: "/professor",
          icon: LayoutDashboard,
        },
        {
          name: "Create Section",
          href: "/professor/sections/new",
          icon: PlusCircle,
        },
      ],
    },
    {
      title: "Student Management",
      items: [
        {
          name: "Student Directory",
          href: "/professor/students",
          icon: Users,
        },
        {
          name: "Credentials Vault",
          href: "/professor/credentials",
          icon: KeyRound,
        },
      ],
    },
    {
      title: "Resources & Audit",
      items: [
        {
          name: "Download Template",
          href: "/template.xlsx",
          icon: FileSpreadsheet,
          isDownload: true,
        },
        {
          name: "Activity History",
          href: "/professor/activity",
          icon: History,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 antialiased selection:bg-[#2563EB] selection:text-white">
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Section */}
        <div className="overflow-y-auto flex-1">
          {/* Logo Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex items-center justify-between">
            <Link href="/professor" className="flex items-center gap-3 group">
              <BrandLogo
                size={40}
                className="w-10 h-10 ring-4 ring-blue-50 group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-base tracking-tight">Gradefolio</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                    FACULTY
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium tracking-wide">
                  Professor Workspace
                </div>
              </div>
            </Link>

            <button
              onClick={toggleSidebar}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Collapse sidebar navigation"
              aria-label="Collapse sidebar navigation"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Professor Profile Card */}
          <div className="p-3.5 mx-3.5 my-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                Faculty Member
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight truncate leading-snug">
                {user?.displayName || "Professor"}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5 font-mono font-medium">
                {user?.email || "Faculty Account"}
              </div>
            </div>
          </div>

          {/* Categorized Navigation Groups */}
          <div className="px-3 space-y-4 my-3">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.title}
                </div>

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/professor"
                      ? pathname === "/professor"
                      : !item.isDownload && pathname.startsWith(item.href);

                  if (item.isDownload) {
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        download="class_record_template.xlsx"
                        className="flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs text-slate-600 hover:text-blue-600 hover:bg-blue-50/60 font-medium transition-all group"
                        title="Download Official National University Class Record Template"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                          <span>{item.name}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          XLSX
                        </span>
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={true}
                      onClick={() => {
                        if (isMobile) setSidebarOpen(false);
                      }}
                      className={`flex items-center justify-between py-2.5 text-xs transition-all ${
                        isActive
                          ? "bg-blue-50 text-[#2563EB] font-bold border-l-4 border-[#2563EB] pl-3 pr-3.5 rounded-r-xl shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 px-3.5 rounded-xl font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? "text-[#2563EB]" : "text-slate-400"}`} />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-3.5 border-t border-slate-100 bg-[#F8FAFC] space-y-2 shrink-0">
          <Link
            href="/professor/account"
            className={`w-full flex items-center gap-2 py-2 px-3 rounded-xl font-medium text-xs transition-all ${
              pathname === "/professor/account"
                ? "bg-blue-50 text-[#2563EB] font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Account Settings</span>
          </Link>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Workspace</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "lg:pl-72" : "lg:pl-0"
        }`}
      >
        {/* Top Status Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-xl bg-blue-50 text-[#2563EB] hover:bg-blue-100 ring-2 ring-blue-500/20 transition-all cursor-pointer flex items-center justify-center animate-in fade-in duration-150"
                title="Open sidebar navigation"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/professor" className="text-slate-500 hover:text-slate-800 transition-colors">
                Faculty Portal
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-900 font-semibold">
                {pathname === "/professor/students"
                  ? "Master Student Directory"
                  : pathname === "/professor/credentials"
                  ? "Credentials Vault"
                  : pathname === "/professor/activity"
                  ? "Import & Audit History"
                  : pathname.includes("/sections/new")
                  ? "Create Course Section"
                  : pathname.includes("/import")
                  ? "Spreadsheet Import Wizard"
                  : pathname.includes("/credentials")
                  ? "Student Credentials Vault"
                  : pathname.includes("/sections/")
                  ? "Section Gradebook Matrix"
                  : pathname === "/professor/account"
                  ? "Account Settings"
                  : "Overview Dashboard"}
              </span>
            </div>
          </div>

        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>

      {/* Enterprise Inactivity Auto-Logout Safeguard (20 minutes idle timeout with 60s warning) */}
      <IdleSessionTracker
        timeoutMinutes={20}
        warningSeconds={60}
        redirectUrl="/admin_mis"
        roleLabel="faculty"
      />
    </div>
  );
}
