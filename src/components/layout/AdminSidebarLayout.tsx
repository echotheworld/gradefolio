"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ShieldCheck,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  Shield,
  ChevronRight,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { IdleSessionTracker } from "@/components/auth/IdleSessionTracker";

interface UserProp {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export function AdminSidebarLayout({
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

  const navLinks: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    {
      name: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      name: "Faculty Management",
      href: "/admin/professors",
      icon: Users,
    },
    {
      name: "Course Sections",
      href: "/admin/sections",
      icon: BookOpen,
    },
    {
      name: "Audit & Security",
      href: "/admin/activity",
      icon: ShieldCheck,
    },
    {
      name: "Platform Settings",
      href: "/admin/settings",
      icon: Settings,
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
        <div>
          {/* Logo Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-white flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3 group">
              <BrandLogo
                size={40}
                className="w-10 h-10 ring-4 ring-blue-50 group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-base tracking-tight">Gradefolio</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200">
                    ADMIN
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium tracking-wide">
                  Governance Command Hub
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

          {/* Admin Profile Card */}
          <div className="p-3.5 mx-3.5 my-3 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                System Administrator
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight truncate leading-snug">
                {user?.displayName || "Admin"}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5 font-mono font-medium">
                {user?.email || "admin@gradeview.edu"}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-medium">
              <span className="text-slate-500">Authority Scope</span>
              <span className="text-[#2563EB] font-mono font-bold">Institutional Global</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="px-3 space-y-1 mt-2">
            <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Platform Governance
            </div>

            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={() => { if (isMobile) setSidebarOpen(false); }}
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
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Role Switcher Link */}
            <div className="pt-3 mt-3 border-t border-slate-200/80">
              <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Cross-Role Workspace
              </div>
              <Link
                href="/professor"
                prefetch={true}
                onClick={() => { if (isMobile) setSidebarOpen(false); }}
                className="flex items-center justify-between py-2.5 px-3.5 rounded-xl text-xs text-[#2563EB] hover:text-[#1D4ED8] hover:bg-blue-50 transition-all font-semibold group"
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-[#2563EB] group-hover:scale-110 transition-transform" />
                  <span>Switch to Faculty View</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-3.5 border-t border-slate-100 bg-[#F8FAFC] space-y-3">
          {/* Quick Info Box */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5 shadow-2xs">
            <Shield className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
            <div className="leading-snug text-[10px]">
              <strong className="text-slate-900 font-semibold">Institutional Governance:</strong> Complete administrative oversight across faculty gradebooks and audit records.
            </div>
          </div>

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
              <Link href="/admin" className="text-slate-500 hover:text-slate-800 transition-colors">
                Platform Governance
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-900 font-semibold">
                {pathname.includes("/admin/professors")
                  ? "Faculty & Professor Provisioning"
                  : pathname.includes("/admin/sections")
                  ? "Course Sections Oversight"
                  : pathname.includes("/admin/activity")
                  ? "Security Audit & Append-Only Logs"
                  : pathname.includes("/admin/settings")
                  ? "Institutional Platform Settings"
                  : "Governance Command Hub"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Admin Authority</span>
            </div>

            <Link
              href="/admin/settings"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Platform Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
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
        roleLabel="administrator"
      />
    </div>
  );
}
