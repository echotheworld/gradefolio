"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  HelpCircle,
  FileText,
  AlertTriangle,
  Award,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusChip, Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

interface GradeReportData {
  student: {
    displayName: string;
    studentNumber: string;
  };
  section: {
    id: string;
    sectionCode: string;
    sectionName: string;
    subjectName: string;
    academicYear: string;
    term: string;
    announcement: string | null;
    publishedAt: string | null;
    updatedAt: string;
    professorName: string;
    professorEmail?: string;
  };
  grade: {
    finalGrade: string | null;
    finalGradeStatus: string | null;
    remarks: string | null;
    showFinalGrade: boolean;
    showBreakdown: boolean;
    showProvisionalNotice: boolean;
  };
  breakdown: Array<{
    id: string;
    name: string;
    category: string | null;
    maxScore: number;
    score: number | null;
    status: string;
  }> | null;
}

export default function StudentGradeReportPage() {
  const router = useRouter();
  const params = useParams();
  const sectionCode = (params.code as string)?.toUpperCase();

  const [data, setData] = useState<GradeReportData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    async function loadGrades() {
      try {
        const res = await fetch("/api/student/grades");
        if (!res.ok) {
          if (res.status === 401) {
            router.push(`/section/${sectionCode}/login`);
            return;
          }
          const errData = await res.json();
          setError(errData.error || "Failed to load grade report.");
          setIsLoading(false);
          return;
        }

        const reportData = await res.json();
        setData(reportData);
        setIsLoading(false);
      } catch {
        setError("Network error. Please try again.");
        setIsLoading(false);
      }
    }

    loadGrades();
  }, [sectionCode, router]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push(`/section/${sectionCode}`);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="inline-block animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-900 rounded-full mb-4"></div>
        <p className="text-sm text-slate-500 font-medium">Securing and fetching your grade report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Unable to Display Report</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">{error}</p>
        <div className="mt-6">
          <Link href={`/section/${sectionCode}/login`}>
            <Button size="sm">Return to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { student, section, grade, breakdown } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      {/* Top Banner & Sign Out */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            Verified Grade Report
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Grade Report
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSupportModal(true)}
            className="text-xs gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Grade Consultation</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
            className="text-xs gap-1.5 text-rose-700 hover:bg-rose-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Header Information Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-800 text-teal-400 font-bold border border-slate-700">
                  {section.sectionCode}
                </span>
                <span className="text-xs text-slate-300">&bull; {section.sectionName}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                {section.subjectName}
              </h2>
              <p className="text-xs text-slate-300">
                Instructor: <span className="text-white font-medium">{section.professorName}</span>
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/80 min-w-[240px]">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">
                Student Profile
              </div>
              <div className="text-base font-bold text-white mt-0.5">{student.displayName}</div>
              <div className="text-xs font-mono text-teal-400 mt-0.5">ID: {student.studentNumber}</div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Updated: {formatDate(section.publishedAt || section.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Professor Announcement if present */}
        {section.announcement && (
          <div className="bg-teal-50/70 border-b border-teal-100 px-6 py-3.5 flex items-start gap-2.5">
            <span className="text-xs text-teal-900 leading-relaxed">
              <strong className="text-teal-950">Instructor Note: </strong>
              {section.announcement}
            </span>
          </div>
        )}
      </Card>

      {/* Summary Score Card */}
      {grade.showFinalGrade && grade.finalGrade && (
        <Card className="border-teal-200/80 bg-gradient-to-br from-teal-50/50 via-white to-slate-50 shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-teal-700" />
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                    Published Standing
                  </h3>
                  {grade.finalGradeStatus && <StatusChip status={grade.finalGradeStatus} />}
                </div>
                <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
                  Official computed grade issued by the instructor for {section.term}, {section.academicYear}.
                </p>
                {grade.remarks && (
                  <p className="text-xs text-slate-700 bg-white/80 border border-slate-200 px-3 py-1.5 rounded-md mt-2 inline-block">
                    <strong>Remarks:</strong> {grade.remarks}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-sm min-w-[160px]">
                <div className="text-xs text-slate-500 font-medium">Final Grade / Mark</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {grade.finalGrade}
                </div>
              </div>
            </div>

            {grade.showProvisionalNotice && grade.finalGradeStatus === "PROVISIONAL" && (
              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Provisional Status:</strong> This mark is tentative and subject to final submission validation.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assessment Breakdown */}
      {grade.showBreakdown && breakdown && breakdown.length > 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Assessment Breakdown
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed scores across coursework, quizzes, and examinations.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Total items: <span className="font-semibold text-slate-900">{breakdown.length}</span>
            </div>
          </CardHeader>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Assessment Item
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Score
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Max Score
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdown.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{item.category || "General"}</td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-slate-900">
                      {item.score !== null ? item.score : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-500">{item.maxScore}</td>
                    <td className="px-6 py-4 text-right">
                      <StatusChip status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="sm:hidden divide-y divide-slate-100">
            {breakdown.map((item) => (
              <div key={item.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-900 text-sm">{item.name}</div>
                  <StatusChip status={item.status} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Category: {item.category || "General"}</span>
                  <div className="font-mono">
                    <span className="font-bold text-slate-900 text-sm">
                      {item.score !== null ? item.score : "—"}
                    </span>
                    <span className="text-slate-400"> / {item.maxScore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : grade.showBreakdown ? (
        <Card className="border-slate-200 p-8 text-center text-xs text-slate-500">
          No assessment items recorded for this section.
        </Card>
      ) : null}

      {/* Discretionary Support / Consultation Note */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-600 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-slate-900 block mb-0.5">Need clarification on a recorded grade?</span>
          Please consult your professor ({section.professorName}) during official consultation hours or via their institutional email ({section.professorEmail || "institutional email"}). GradeView displays official records entered by your instructor and does not modify grades.
        </div>
      </div>

      {/* Consultation Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSupportModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 text-left border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Grade Consultation Support</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                If you believe an assessment score was entered incorrectly or is missing:
              </p>
              <ul className="text-xs text-slate-600 mt-3 space-y-2 list-disc list-inside">
                <li>Prepare the specific assessment name (e.g. Quiz 1, Midterm Exam).</li>
                <li>Have your original graded paper or defense feedback ready.</li>
                <li>Contact <strong>{section.professorName}</strong> during department consultation hours.</li>
              </ul>
              <div className="mt-6 flex justify-end">
                <Button size="sm" onClick={() => setShowSupportModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
