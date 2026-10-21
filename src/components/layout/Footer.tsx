import React from "react";
import Link from "next/link";
import { GraduationCap, ShieldCheck, Scale, Lock } from "lucide-react";

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
              Official Academic Grade Publishing Portal. Built for educational record confidentiality with zero public disclosure, no class leaderboards, and zero peer-to-peer data leakage.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Scale className="w-3.5 h-3.5 text-teal-600" />
              <span>Complies with Philippine Data Privacy Act of 2012 (Republic Act No. 10173).</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Academic Portal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-slate-900 transition-colors">
                  Student Grade Access
                </Link>
              </li>
              <li>
                <Link href="/#privacy" className="hover:text-slate-900 transition-colors">
                  Data Privacy Compliance (RA 10173)
                </Link>
              </li>
              <li>
                <Link href="/admin_mis" className="hover:text-slate-900 transition-colors font-medium text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Faculty & Staff MIS Access</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Privacy & Support */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Institutional Notice</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed mb-3">
              Section Codes identify a course section; they never unlock private records without individual student credentials.
            </p>
            <div className="text-[11px] text-slate-500">
              Technical Inquiries:{" "}
              <a href="mailto:support@gradeview.edu" className="text-teal-700 hover:underline">
                support@gradeview.edu
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} GradeView Academic Portal. Republic Act No. 10173 Compliant.
          </div>
          <div className="flex items-center gap-3">
            <span>Legitimate Educational Processing</span>
            <span>&bull;</span>
            <Link href="/admin_mis" className="hover:text-slate-600 transition-colors">
              MIS Gateway
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
