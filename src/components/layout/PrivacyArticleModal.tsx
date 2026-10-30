"use client";

import React, { useEffect, useState } from "react";
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  Building,
  CheckCircle2,
  Lock,
  X,
  BookOpen,
  FileText,
} from "lucide-react";

interface PrivacyArticleModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function PrivacyArticleModal({ isOpen: controlledIsOpen, onClose: controlledOnClose }: PrivacyArticleModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  useEffect(() => {
    const handleOpenEvent = () => setInternalIsOpen(true);
    window.addEventListener("open-privacy-article", handleOpenEvent);

    if (window.location.hash === "#privacy" || window.location.hash === "#about") {
      setInternalIsOpen(true);
    }

    return () => {
      window.removeEventListener("open-privacy-article", handleOpenEvent);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Article Reader Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/80 sticky top-0 z-10 backdrop-blur">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm ring-4 ring-blue-500/20 mt-0.5">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#2563EB] border border-blue-200">
                  <BookOpen className="w-3 h-3 text-[#2563EB]" />
                  Privacy &amp; Security Overview
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
                Privacy Safeguards &amp; Architecture
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gradefolio Independent Academic Tool &bull; Student Privacy Safeguards
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
            aria-label="Close article"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Article Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {/* About Section */}
          <section className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#2563EB]" />
              About Gradefolio
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Gradefolio is an independent academic grade breakdown viewer designed to provide students with a private space to review their published grades and assessment breakdowns without requesting spreadsheets or relying on screenshots from professors.
            </p>
          </section>

          {/* Section 1 */}
          <section className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <h4>Private Grade Access</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 pl-6">
              Server-side authorization ensures students can only access records they are explicitly permitted to view. Course Section Codes serve solely as locators and do not bypass individual student authentication.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Lock className="w-4 h-4 text-[#2563EB]" />
              <h4>Individual Student View</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 pl-6">
              Students cannot browse, view, or search the grades of other enrolled students. Grade records are rendered strictly on an individual basis to prevent score leakage and unintended public exposure.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
              <h4>Encrypted Data Transmission &amp; Cryptographic Controls</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 pl-6">
              Network traffic is secured via encrypted data transmission. Student credentials are encrypted with salted cryptographic hashing algorithms (bcrypt), ensuring passwords are never stored in plaintext.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <h4>Independent Platform Disclosure</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 pl-6">
              Gradefolio is an independent platform and is not affiliated with, endorsed by, or operated by any educational institution unless expressly stated. Grade records are provided by authorized professors for individual review and may not constitute official institutional grades.
            </p>
          </section>
        </div>

        {/* Article Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Gradefolio Academic Tool &bull; Privacy Overview</span>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold transition-colors cursor-pointer shadow-sm"
          >
            Close Notice
          </button>
        </div>
      </div>
    </div>
  );
}
