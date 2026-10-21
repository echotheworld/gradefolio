import React from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 text-sm">GradeView</span>
            </div>
            <p className="text-slate-500 max-w-sm leading-relaxed">
              Your grades, clearly presented. A privacy-first publishing portal designed for professors and students. No public rankings, no leaderboards, zero data leakage.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Complies with institutional privacy baselines & data protection guidelines.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/#lookup" className="hover:text-slate-900 transition-colors">
                  Enter Section Code
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-slate-900 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#privacy" className="hover:text-slate-900 transition-colors">
                  Privacy Principles
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-slate-900 transition-colors">
                  Professor / Admin Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Privacy & Support */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Support & Privacy</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
              Section Codes identify a course section; they never unlock private records without individual credentials.
            </p>
            <div className="text-[11px] text-slate-500">
              Need assistance?{" "}
              <a href="mailto:support@gradeview.edu" className="text-teal-700 hover:underline">
                support@gradeview.edu
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} GradeView Portal. Version 1.1. Built for academic integrity.
          </div>
          <div>Calm, useful design &bull; Privacy First</div>
        </div>
      </div>
    </footer>
  );
}
