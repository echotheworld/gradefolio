"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  ArrowRight,
  BookOpen,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCachedData, setCachedData } from "@/lib/client-cache";

interface SectionCredentialOverview {
  id: string;
  sectionCode: string;
  sectionName: string;
  subjectName: string;
  status: string;
  _count: {
    sectionStudents: number;
  };
}

export default function ProfessorCredentialsVaultPage() {
  const [sections, setSections] = useState<SectionCredentialOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cached = getCachedData<SectionCredentialOverview[]>("prof_sections");
    if (cached && cached.length > 0) {
      setSections(cached);
      setIsLoading(false);
    }

    async function loadSections() {
      try {
        const res = await fetch("/api/professor/sections");
        if (res.ok) {
          const data = await res.json();
          const items = data.sections || [];
          setSections(items);
          setCachedData("prof_sections", items);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSections();
  }, []);

  const totalStudents = sections.reduce((acc, curr) => acc + (curr._count?.sectionStudents || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-white border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                Security &amp; Access Vault
              </span>
              <span className="text-xs text-slate-500 font-medium">Authentication Slips</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Student Credentials Vault
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Batch-generate, inspect, and export printable student access password slips across all of your course sections.
            </p>
          </div>
        </div>
      </div>

      {/* Security Info Card */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/70 flex items-start gap-3.5 text-xs text-blue-900 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Confidential Password Delivery: </strong>
          <span>
            Student passwords are independently salted and encrypted. Use the section cards below to export printable password cut-out slips or distribute access tokens to students before publishing grades.
          </span>
        </div>
      </div>

      {/* Section Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-slate-200/90 p-6 space-y-4 animate-pulse">
              <div className="w-24 h-6 bg-slate-200 rounded" />
              <div className="w-48 h-6 bg-slate-200 rounded" />
              <div className="w-32 h-4 bg-slate-100 rounded" />
            </div>
          ))
        ) : sections.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300">
            <KeyRound className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-800">No course sections found</h3>
            <p className="text-xs text-slate-500 mt-1">Create a section and upload a class record to generate credentials.</p>
          </div>
        ) : (
          sections.map((sec) => (
            <Card
              key={sec.id}
              className="border border-slate-200/90 shadow-xs rounded-2xl bg-white p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold border border-slate-200 tracking-wider">
                    {sec.sectionCode}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    {sec._count?.sectionStudents || 0} Students
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-1">{sec.subjectName}</h3>
                  <p className="text-xs text-slate-500 font-medium">Section: {sec.sectionName}</p>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-5 flex items-center justify-between gap-2">
                <Link href={`/professor/sections/${sec.id}/credentials`} className="w-full">
                  <Button size="sm" variant="primary" className="w-full gap-2 text-xs font-semibold shadow-xs">
                    <Printer className="w-3.5 h-3.5" />
                    <span>Manage &amp; Print Slips</span>
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
