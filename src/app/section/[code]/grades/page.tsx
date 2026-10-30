"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  LogOut,
  Shield,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/Badge";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { getCachedData, setCachedData, invalidateCache } from "@/lib/client-cache";
import { IdleSessionTracker } from "@/components/auth/IdleSessionTracker";

interface GradeItemRecord {
  id: string;
  name: string;
  category: string | null;
  maxScore: number;
  score: number | null;
  status: string;
}

interface WeightConfig {
  midterms: {
    cp: number;
    ea: number;
    mpt: number;
  };
  finals: {
    cp: number;
    ea: number;
    mpt: number;
    cpt: number;
  };
}

const R_GRADE_MESSAGE = "Grade is unavaible to view. Kindly contact your professor for this matter. ";

const isRGrade = (gradeStr: string | null | undefined, pct?: number | null) => {
  if (gradeStr) {
    const s = gradeStr.trim().toUpperCase();
    if (
      s === "R" ||
      s.startsWith("R ") ||
      s.startsWith("R(") ||
      s.startsWith("R-") ||
      s === "REPEAT" ||
      s.includes("REPEAT") ||
      s.includes("KINDLY CONTACT YOUR PROFESSOR") ||
      s.includes("GRADES IS UNAVAILABLE") ||
      s.includes("UNAVAIBLE") ||
      s.includes("UNAVAILABLE")
    ) {
      return true;
    }
    const pctMatch = s.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
    if (pctMatch) {
      const val = parseFloat(pctMatch[1]);
      if (!isNaN(val) && val < 60.0) return true;
    }
    const num = parseFloat(s);
    if (!isNaN(num) && num > 5.0 && num < 60.0) return true;
  }
  if (pct !== undefined && pct !== null && pct < 60) {
    return true;
  }
  return false;
};

const DEFAULT_WEIGHTS: WeightConfig = {
  midterms: { cp: 30, ea: 30, mpt: 40 },
  finals: { cp: 30, ea: 30, mpt: 20, cpt: 20 },
};

// Official Grade Point Equivalence Table
// 96-100 = 4.0 | 90-95 = 3.5 | 84-89 = 3.0 | 78-83 = 2.5
// 72-77 = 2.0 | 66-71 = 1.5 | 60-65 = 1.0 | 59 and below = R
const getEquivalenceGradePoint = (pct: number): string => {
  if (pct >= 96) return "4.0";
  if (pct >= 90) return "3.5";
  if (pct >= 84) return "3.0";
  if (pct >= 78) return "2.5";
  if (pct >= 72) return "2.0";
  if (pct >= 66) return "1.5";
  if (pct >= 60) return "1.0";
  return "R";
};

const getEquivalenceDescription = (pct: number): string => {
  if (pct >= 96) return "Excellent";
  if (pct >= 90) return "Superior";
  if (pct >= 84) return "Very Good";
  if (pct >= 78) return "Good";
  if (pct >= 72) return "Satisfactory";
  if (pct >= 66) return "Fair";
  if (pct >= 60) return "Passing";
  return "Consultation Advised";
};

const getGradePointLabel = (pct: number) => {
  const gp = getEquivalenceGradePoint(pct);
  const desc = getEquivalenceDescription(pct);
  return gp === "R" ? "R" : `Grade ${gp} (${desc})`;
};

const parseGradeComponents = (
  rawGrade: string | null | undefined,
  computedPct: number | null | undefined
) => {
  if (!rawGrade && !computedPct) {
    return { mainMark: "-", pctLabel: null, standingDesc: null };
  }

  if (isRGrade(rawGrade, computedPct)) {
    return { mainMark: "R", pctLabel: null, standingDesc: "Consultation Advised" };
  }

  let mark = (rawGrade || "").trim();
  let extractedPct: number | null = computedPct && computedPct > 0 ? computedPct : null;

  // If rawGrade is like "2.0 (77.07%)" or "2.00 (85%)"
  const match = mark.match(/^([0-9]+(?:\.[0-9]+)?)\s*\(\s*([0-9]+(?:\.[0-9]+)?)\s*%\s*\)$/);
  if (match) {
    mark = match[1];
    extractedPct = parseFloat(match[2]);
  } else if (/^[0-9]+(?:\.[0-9]+)?\s*%$/.test(mark)) {
    // If rawGrade is like "77.07%"
    extractedPct = parseFloat(mark.replace("%", "").trim());
    mark = getEquivalenceGradePoint(extractedPct);
  }

  if (!mark || mark === "-") {
    if (extractedPct !== null && extractedPct > 0) {
      mark = getEquivalenceGradePoint(extractedPct);
    } else {
      mark = "-";
    }
  }

  const pct = extractedPct !== null && extractedPct > 0 ? extractedPct : null;
  const desc = pct !== null ? getEquivalenceDescription(pct) : null;
  const pctString = pct !== null ? `${pct.toFixed(1)}%` : null;

  return { mainMark: mark, pctLabel: pctString, standingDesc: desc };
};

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
    publishedPeriod?: string;
    weightConfig: string | null;
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
  breakdown: GradeItemRecord[] | null;
}

export default function StudentGradeReportPage() {
  const router = useRouter();
  const params = useParams();
  const sectionCode = (params.code as string)?.toUpperCase();
  const cacheKey = sectionCode ? `student_grades_${sectionCode}` : "student_grades";

  const [data, setData] = useState<GradeReportData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "CP" | "EA" | "PT">("ALL");

  useEffect(() => {
    const cached = getCachedData<GradeReportData>(cacheKey);
    if (cached) {
      setData(cached);
      setIsLoading(false);
    }

    async function loadGrades() {
      try {
        const res = await fetch("/api/student/grades");

        const reportData = await res.json();
        setData(reportData);
        setCachedData(cacheKey, reportData);
        setIsLoading(false);
      } catch {
        setError("Network connection issue. Please refresh the page.");
        setIsLoading(false);
      }
    }

    loadGrades();
  }, [sectionCode, router, cacheKey]);

  const handleSignOut = async () => {
    try {
      invalidateCache("student_grades");
      await fetch("/api/auth/signout", { method: "POST" });
      router.push(`/`);
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  // Active section weights (dynamically configured by professor)
  const activeWeights: WeightConfig = useMemo(() => {
    if (!data?.section?.weightConfig) return DEFAULT_WEIGHTS;
    try {
      const parsed =
        typeof data.section.weightConfig === "string"
          ? JSON.parse(data.section.weightConfig)
          : data.section.weightConfig;
      if (parsed?.midterms && parsed?.finals) {
        return {
          midterms: {
            cp: Number(parsed.midterms.cp) || 30,
            ea: Number(parsed.midterms.ea) || 30,
            mpt: Number(parsed.midterms.mpt) || 40,
          },
          finals: {
            cp: Number(parsed.finals.cp) || 30,
            ea: Number(parsed.finals.ea) || 30,
            mpt: Number(parsed.finals.mpt) || 20,
            cpt: Number(parsed.finals.cpt) || 20,
          },
        };
      }
      return DEFAULT_WEIGHTS;
    } catch {
      return DEFAULT_WEIGHTS;
    }
  }, [data?.section?.weightConfig]);

  // Categorize breakdown items into CP Mid, CP Fin, EA Mid, EA Fin, MPT, CPT, Bonus
  const categorized = useMemo(() => {
    if (!data?.breakdown) {
      return {
        cpMid: [] as GradeItemRecord[],
        cpFin: [] as GradeItemRecord[],
        eaMid: [] as GradeItemRecord[],
        eaFin: [] as GradeItemRecord[],
        mpt: null as GradeItemRecord | null,
        cpt: null as GradeItemRecord | null,
        bonus: null as GradeItemRecord | null,
      };
    }

    const cpMid: GradeItemRecord[] = [];
    const cpFin: GradeItemRecord[] = [];
    const eaMid: GradeItemRecord[] = [];
    const eaFin: GradeItemRecord[] = [];
    let mpt: GradeItemRecord | null = null;
    let cpt: GradeItemRecord | null = null;
    let bonus: GradeItemRecord | null = null;

    data.breakdown.forEach((item) => {
      const cat = (item.category || "").toLowerCase();
      const name = item.name.toLowerCase();

      if (name.includes("mpt") || cat.includes("major pt") || name.includes("midterm exam")) {
        mpt = item;
      } else if (name.includes("cpt") || cat.includes("culminating pt") || name.includes("final project")) {
        cpt = item;
      } else if (name.includes("bonus") || cat.includes("bonus")) {
        bonus = item;
      } else if (cat.includes("class participation") || name.startsWith("cp") || cat.includes("cp")) {
        if (
          cat.includes("post") ||
          cat.includes("final") ||
          name.includes("final") ||
          name.includes("post") ||
          /\b(8|9|10|11|12|13|14)\b/.test(name) ||
          ["q4", "q5", "sw4"].some((prefix) => name.includes(prefix))
        ) {
          cpFin.push(item);
        } else {
          cpMid.push(item);
        }
      } else if (cat.includes("enabling") || name.startsWith("ea") || cat.includes("ea")) {
        if (
          cat.includes("post") ||
          cat.includes("final") ||
          name.includes("final") ||
          name.includes("post") ||
          /\b(8|9|10|11|12|13|14)\b/.test(name) ||
          ["l6", "l7", "l8", "fp"].some((prefix) => name.includes(prefix))
        ) {
          eaFin.push(item);
        } else {
          eaMid.push(item);
        }
      }
    });

    return { cpMid, cpFin, eaMid, eaFin, mpt, cpt, bonus };
  }, [data?.breakdown]);

  // Compute analytics, mastery, and weighted totals locally in the browser (0ms, 0 database hit)
  const analytics = useMemo(() => {
    if (!data?.breakdown) return null;

    let cpMidScoreSum = 0;
    let cpMidHpsSum = 0;
    categorized.cpMid.forEach((it) => {
      if (it.score !== null) cpMidScoreSum += it.score;
      cpMidHpsSum += it.maxScore;
    });

    let cpFinScoreSum = 0;
    let cpFinHpsSum = 0;
    categorized.cpFin.forEach((it) => {
      if (it.score !== null) cpFinScoreSum += it.score;
      cpFinHpsSum += it.maxScore;
    });
    const cpTotalScoreSum = cpMidScoreSum + cpFinScoreSum;
    const cpTotalHpsSum = cpMidHpsSum + cpFinHpsSum;

    let eaMidScoreSum = 0;
    let eaMidHpsSum = 0;
    categorized.eaMid.forEach((it) => {
      if (it.score !== null) eaMidScoreSum += it.score;
      eaMidHpsSum += it.maxScore;
    });

    let eaFinScoreSum = 0;
    let eaFinHpsSum = 0;
    categorized.eaFin.forEach((it) => {
      if (it.score !== null) eaFinScoreSum += it.score;
      eaFinHpsSum += it.maxScore;
    });
    const eaTotalScoreSum = eaMidScoreSum + eaFinScoreSum;
    const eaTotalHpsSum = eaMidHpsSum + eaFinHpsSum;

    const mptScore = categorized.mpt?.score ?? null;
    const mptHps = categorized.mpt?.maxScore || 0;
    const mptPct = mptHps > 0 && mptScore !== null ? (mptScore / mptHps) * 100 : 0;

    const cptScore = categorized.cpt?.score ?? null;
    const cptHps = categorized.cpt?.maxScore || 0;
    const cptPct = cptHps > 0 && cptScore !== null ? (cptScore / cptHps) * 100 : 0;

    const bonusScore = categorized.bonus?.score ?? 0;

    // Mathematical weighted components using activeWeights
    const cpMidPart = cpMidHpsSum > 0 ? (cpMidScoreSum / cpMidHpsSum) * activeWeights.midterms.cp : 0;
    const eaMidPart = eaMidHpsSum > 0 ? (eaMidScoreSum / eaMidHpsSum) * activeWeights.midterms.ea : 0;
    const mptMidPart = mptHps > 0 && mptScore !== null ? (mptScore / mptHps) * activeWeights.midterms.mpt : 0;
    const computedMidPct = cpMidPart + eaMidPart + mptMidPart;

    const cpFinPart = cpTotalHpsSum > 0 ? (cpTotalScoreSum / cpTotalHpsSum) * activeWeights.finals.cp : 0;
    const eaFinPart = eaTotalHpsSum > 0 ? (eaTotalScoreSum / eaTotalHpsSum) * activeWeights.finals.ea : 0;
    const mptFinPart = mptHps > 0 && mptScore !== null ? (mptScore / mptHps) * activeWeights.finals.mpt : 0;
    const cptFinPart = cptHps > 0 && cptScore !== null ? (cptScore / cptHps) * activeWeights.finals.cpt : 0;
    const computedFinPct = cpFinPart + eaFinPart + mptFinPart + cptFinPart + bonusScore;

    // Total Assessments & Submissions
    const totalAssessments =
      categorized.cpMid.length +
      categorized.cpFin.length +
      categorized.eaMid.length +
      categorized.eaFin.length +
      (categorized.mpt ? 1 : 0) +
      (categorized.cpt ? 1 : 0);

    let recordedCount = 0;
    categorized.cpMid.forEach((it) => { if (it.score !== null) recordedCount++; });
    categorized.cpFin.forEach((it) => { if (it.score !== null) recordedCount++; });
    categorized.eaMid.forEach((it) => { if (it.score !== null) recordedCount++; });
    categorized.eaFin.forEach((it) => { if (it.score !== null) recordedCount++; });
    if (mptScore !== null) recordedCount++;
    if (cptScore !== null) recordedCount++;

    const completionPct = totalAssessments > 0 ? Math.round((recordedCount / totalAssessments) * 100) : 0;
    const cpMasteryPct = cpTotalHpsSum > 0 ? (cpTotalScoreSum / cpTotalHpsSum) * 100 : 0;
    const eaMasteryPct = eaTotalHpsSum > 0 ? (eaTotalScoreSum / eaTotalHpsSum) * 100 : 0;

    // Academic Honors & Standing Factor
    const isMidtermPeriod = data.section.publishedPeriod === "MIDTERMS";
    let effectivePct = isMidtermPeriod
      ? (computedMidPct > 0 ? computedMidPct : 0)
      : (computedFinPct > 0 ? computedFinPct : (computedMidPct > 0 ? computedMidPct : 0));

    if (!isMidtermPeriod && effectivePct === 0 && data.grade.finalGrade) {
      const num = parseFloat(data.grade.finalGrade.replace("%", "").trim());
      if (!isNaN(num)) {
        if (num <= 5.0 && num >= 1.0) {
          effectivePct = Math.max(0, Math.min(100, 100 - (num - 1.0) * 12.5));
        } else {
          effectivePct = num;
        }
      }
    }

    const isMarkedAsR = isMidtermPeriod
      ? (effectivePct > 0 && effectivePct < 60)
      : (
          isRGrade(data.grade.finalGrade, computedFinPct) ||
          isRGrade(data.grade.remarks, null) ||
          (effectivePct > 0 && effectivePct < 60)
        );

    const getStandingFactor = () => {
      if (recordedCount === 0 && effectivePct === 0) {
        return {
          status: "Pending Evaluation",
          label: "Awaiting Assessment Records",
          badge: "bg-slate-100 text-slate-700 border-slate-200",
          summary: "No assessment scores have been recorded yet. Check back once your professor uploads results.",
          icon: Clock,
          cardBg: "bg-slate-50 border-slate-200",
        };
      }
      if (isMarkedAsR) {
        return {
          status: "Consultation Advised",
          label: "Instructor Guidance Advised",
          badge: "bg-amber-50 text-amber-900 border-amber-300",
          summary: R_GRADE_MESSAGE,
          icon: AlertCircle,
          cardBg: "bg-amber-50/60 border-amber-200",
        };
      }
      if (effectivePct >= 90) {
        return {
          status: "Dean's List Standing",
          label: "High Academic Honors (Grade 3.5 - 4.0)",
          badge: "bg-emerald-50 text-emerald-800 border-emerald-300",
          summary: "Outstanding academic performance. Tracking within high honors benchmark criteria.",
          icon: Award,
          cardBg: "bg-emerald-50/50 border-emerald-200",
        };
      }
      if (effectivePct >= 80) {
        return {
          status: "Strong Academic Standing",
          label: "Very Good Standing (Grade 2.5 - 3.0)",
          badge: "bg-blue-50 text-blue-800 border-blue-300",
          summary: "Consistent above-average performance; comfortably meeting all course competencies.",
          icon: TrendingUp,
          cardBg: "bg-blue-50/50 border-blue-200",
        };
      }
      if (effectivePct >= 75) {
        return {
          status: "Good Academic Standing",
          label: "Satisfactory Standing (Grade 2.0)",
          badge: "bg-teal-50 text-teal-800 border-teal-300",
          summary: "Satisfactory coursework performance meeting institutional benchmark standards.",
          icon: CheckCircle2,
          cardBg: "bg-teal-50/40 border-teal-200",
        };
      }
      if (effectivePct >= 60) {
        return {
          status: "Passing Standing",
          label: "Passing Standing (Grade 1.0 - 1.5)",
          badge: "bg-slate-100 text-slate-800 border-slate-300",
          summary: "Your current score is within the passing range. Maintain performance in remaining coursework.",
          icon: CheckCircle2,
          cardBg: "bg-slate-50 border-slate-200",
        };
      }
      return {
        status: "Consultation Advised",
        label: "Instructor Guidance Advised",
        badge: "bg-amber-50 text-amber-900 border-amber-300",
        summary: R_GRADE_MESSAGE,
        icon: AlertCircle,
        cardBg: "bg-amber-50/60 border-amber-200",
      };
    };

    const standing = getStandingFactor();
    const cpMidPct = cpMidHpsSum > 0 ? (cpMidScoreSum / cpMidHpsSum) * 100 : 0;
    const cpFinPct = cpFinHpsSum > 0 ? (cpFinScoreSum / cpFinHpsSum) * 100 : 0;
    const eaMidPct = eaMidHpsSum > 0 ? (eaMidScoreSum / eaMidHpsSum) * 100 : 0;
    const eaFinPct = eaFinHpsSum > 0 ? (eaFinScoreSum / eaFinHpsSum) * 100 : 0;

    return {
      cpMidScoreSum,
      cpMidHpsSum,
      cpMidPct,
      cpFinScoreSum,
      cpFinHpsSum,
      cpFinPct,
      cpTotalScoreSum,
      cpTotalHpsSum,
      eaMidScoreSum,
      eaMidHpsSum,
      eaMidPct,
      eaFinScoreSum,
      eaFinHpsSum,
      eaFinPct,
      eaTotalScoreSum,
      eaTotalHpsSum,
      mptScore,
      mptHps,
      mptPct,
      cptScore,
      cptHps,
      cptPct,
      bonusScore,
      cpMidPart,
      eaMidPart,
      mptMidPart,
      computedMidPct,
      cpFinPart,
      eaFinPart,
      mptFinPart,
      cptFinPart,
      computedFinPct,
      totalAssessments,
      recordedCount,
      completionPct,
      cpMasteryPct,
      eaMasteryPct,
      standing,
    };
  }, [data, categorized, activeWeights]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-3.5 sm:space-y-4 animate-pulse">
          {/* Header Skeleton */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-200" />
              <div className="space-y-1.5">
                <div className="w-24 h-4 bg-slate-200 rounded" />
                <div className="w-20 h-3 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="w-20 sm:w-24 h-7 sm:h-8 bg-slate-100 rounded-xl" />
          </div>

          {/* Student Profile & Standing Banner Skeleton */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="w-24 h-4 bg-blue-100/70 rounded-full" />
                <div className="w-48 sm:w-64 h-7 bg-slate-200 rounded-lg" />
                <div className="w-36 h-4 bg-slate-100 rounded" />
              </div>
              <div className="w-36 h-12 bg-slate-100 rounded-xl" />
            </div>

            {/* Quick Metrics Bar Skeleton */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50 space-y-2">
                  <div className="w-16 h-3 bg-slate-200 rounded" />
                  <div className="w-20 h-5 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Assessment Table Breakdown Skeleton */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="w-40 h-5 bg-slate-200 rounded" />
              <div className="w-28 h-4 bg-slate-100 rounded" />
            </div>
            <div className="space-y-2.5 pt-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 bg-slate-50 rounded-xl flex items-center justify-between px-4 border border-slate-100">
                  <div className="w-44 h-4 bg-slate-200 rounded" />
                  <div className="w-16 h-4 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl p-7 border border-slate-200 shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Report Unavailable</h2>
          <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Button onClick={() => router.push(`/`)} className="w-full text-xs">
              Return to Student Portal Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { student, section, grade } = data;

  // Extract Midterm Standing if stored in remarks
  let midtermDisplay: string | null = null;
  if (grade.remarks && grade.remarks.includes("Midterm:")) {
    midtermDisplay = grade.remarks.replace(/^Midterm:\s*/, "").split("|")[0].trim();
  }

  const isMidtermR = isRGrade(midtermDisplay, analytics?.computedMidPct);
  if (isMidtermR) {
    midtermDisplay = "R";
  }

  const isFinalR = isRGrade(grade.finalGrade, analytics?.computedFinPct);
  const isMidtermOnly = section.publishedPeriod === "MIDTERMS";
  const isFinalsOnly = section.publishedPeriod === "FINALS";

  // Non-redundant grade formatting
  const midtermParsed = parseGradeComponents(midtermDisplay, analytics?.computedMidPct);
  const finalParsed = parseGradeComponents(grade.finalGrade, analytics?.computedFinPct);

  const StandingIcon = analytics?.standing.icon || Award;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased py-4 sm:py-8 px-3 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-3.5 sm:space-y-4">
        {/* TOP BRANDING & LOG OUT HEADER */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-5 shadow-xs flex items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <BrandLogo size={40} className="w-9 h-9 sm:w-11 sm:h-11 ring-2 sm:ring-4 ring-blue-50 shrink-0" />
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">Gradefolio</span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 shrink-0">
                Student Portal
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-semibold text-[11px] sm:text-xs text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* 1. STUDENT INFORMATION CARD */}
        <div className={`p-4 sm:p-6 rounded-2xl border ${analytics?.standing.cardBg || "bg-white border-slate-200"} shadow-xs transition-all space-y-3`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] sm:text-[11px] font-bold shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Verified Student Record</span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  <span>{section.subjectName}</span> &bull; <span className="font-mono font-semibold text-slate-700">{section.sectionCode}</span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words">
                Hello, {student.studentNumber}!
              </h1>
            </div>

            {/* Academic Standing Badge & Term */}
            {analytics?.standing && (
              <div className="flex flex-wrap sm:flex-col sm:items-end gap-1.5 sm:gap-2 shrink-0">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold border shadow-2xs ${analytics.standing.badge}`}>
                  <StandingIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{analytics.standing.status}: {analytics.standing.label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 font-mono">
                  <span>{section.term} {section.academicYear}</span>
                </div>
              </div>
            )}
          </div>

          {analytics?.standing && (
            <div className="pt-2.5 sm:pt-3 border-t border-slate-200/70 flex items-start sm:items-center gap-2 text-[11px] sm:text-xs text-slate-600">
              <Activity className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5 sm:mt-0" />
              <span className="leading-snug">{analytics.standing.summary}</span>
            </div>
          )}
        </div>

        {/* Professor Announcement (if present) */}
        {section.announcement && (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs text-amber-950 leading-relaxed">
              <strong>Professor Announcement: </strong> {section.announcement}
            </div>
          </div>
        )}

        {/* 2. EXECUTIVE GRADE SPOTLIGHT (STEVE JOBS HERO ARCHITECTURE) */}
        {grade.showFinalGrade && analytics && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
            {isMidtermOnly ? (
              /* Midterm Period Spotlight */
              <div className="space-y-1.5 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Official Midterm Course Grade
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold">
                    Midterm Record (Weeks 1–7)
                  </span>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className={`text-4xl sm:text-5xl font-black tabular-nums tracking-tight ${midtermParsed.mainMark === "R" ? "text-amber-800" : "text-[#2563EB]"}`}>
                    {midtermParsed.mainMark}
                  </span>
                  {midtermParsed.standingDesc && (
                    <span className="text-slate-800 font-bold text-lg sm:text-xl flex items-baseline gap-1.5 flex-wrap">
                      <span>{midtermParsed.standingDesc}</span>
                      {midtermParsed.pctLabel && (
                        <span className="text-slate-500 font-normal text-base font-mono">
                          ({midtermParsed.pctLabel})
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Verified Midterm Checkpoint Evaluation across Weeks 1 to 7 coursework</span>
                </div>
              </div>
            ) : (
              /* Full Semester Spotlight */
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-slate-100">
                {/* Primary Final Grade Spotlight */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Official Final Course Grade
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold">
                      Finals Record (Weeks 1–13 Overall)
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className={`text-4xl sm:text-5xl font-black tabular-nums tracking-tight ${finalParsed.mainMark === "R" ? "text-amber-800" : "text-[#2563EB]"}`}>
                      {finalParsed.mainMark}
                    </span>
                    {finalParsed.standingDesc && (
                      <span className="text-slate-800 font-bold text-lg sm:text-xl flex items-baseline gap-1.5 flex-wrap">
                        <span>{finalParsed.standingDesc}</span>
                        {finalParsed.pctLabel && (
                          <span className="text-slate-500 font-normal text-base font-mono">
                            ({finalParsed.pctLabel})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Cumulative Course Mark across all 13 Weeks of coursework</span>
                  </div>
                </div>

                {/* Midterm Checkpoint Reference Box */}
                <div className="bg-slate-50/80 rounded-xl p-3.5 sm:p-4 border border-slate-200/80 min-w-[240px] space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    <span>Midterm Checkpoint</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-800 font-bold">
                      Weeks 1–7
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold font-mono ${midtermParsed.mainMark === "R" ? "text-amber-800" : "text-slate-900"}`}>
                      {midtermParsed.mainMark}
                    </span>
                    {midtermParsed.standingDesc && (
                      <span className="text-xs font-semibold text-slate-600">
                        ({midtermParsed.standingDesc}{midtermParsed.pctLabel ? ` • ${midtermParsed.pctLabel}` : ""})
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Midterm checkpoint score across Weeks 1 to 7 coursework.
                  </p>
                </div>
              </div>
            )}

            {/* Visual Factor Ribbon: How the 100% is Built */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                  {isMidtermOnly ? "How Your 100% Midterm Grade is Built" : "How Your 100% Course Grade is Built"}
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  {isMidtermOnly
                    ? `${categorized.cpMid.filter(i => i.score !== null).length + categorized.eaMid.filter(i => i.score !== null).length + (analytics.mptScore !== null ? 1 : 0)} of ${categorized.cpMid.length + categorized.eaMid.length + 1} Midterm Assessments Recorded`
                    : `${analytics.recordedCount} of ${analytics.totalAssessments} Assessments Recorded (${analytics.completionPct}%)`
                  }
                </span>
              </div>

              {/* Multi-segment stacked progress bar */}
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex shadow-inner">
                {isMidtermOnly ? (
                  <>
                    <div
                      className="bg-teal-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(activeWeights.midterms.cp, analytics.cpMidPart)}%` }}
                      title={`Class Participation (CP): +${analytics.cpMidPart.toFixed(1)}%`}
                    />
                    <div
                      className="bg-indigo-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(activeWeights.midterms.ea, analytics.eaMidPart)}%` }}
                      title={`Enabling Activities (EA): +${analytics.eaMidPart.toFixed(1)}%`}
                    />
                    <div
                      className="bg-blue-600 h-full transition-all duration-500"
                      style={{ width: `${Math.min(activeWeights.midterms.mpt, analytics.mptMidPart)}%` }}
                      title={`Major Performance Task (MPT): +${analytics.mptMidPart.toFixed(1)}%`}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className="bg-teal-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(activeWeights.finals.cp, analytics.cpFinPart)}%` }}
                      title={`Class Participation (CP): +${analytics.cpFinPart.toFixed(1)}%`}
                    />
                    <div
                      className="bg-indigo-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(activeWeights.finals.ea, analytics.eaFinPart)}%` }}
                      title={`Enabling Activities (EA): +${analytics.eaFinPart.toFixed(1)}%`}
                    />
                    <div
                      className="bg-blue-600 h-full transition-all duration-500"
                      style={{ width: `${Math.min(activeWeights.finals.mpt, analytics.mptFinPart)}%` }}
                      title={`Major Task (MPT): +${analytics.mptFinPart.toFixed(1)}%`}
                    />
                    <div
                      className="bg-purple-600 h-full transition-all duration-500"
                      style={{ width: `${Math.min(activeWeights.finals.cpt, analytics.cptFinPart)}%` }}
                      title={`Culminating Task (CPT): +${analytics.cptFinPart.toFixed(1)}%`}
                    />
                    {analytics.bonusScore > 0 && (
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${Math.min(10, analytics.bonusScore)}%` }}
                        title={`Bonus: +${analytics.bonusScore}%`}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Sleek Ingredient Legend Pills */}
              <div className={`grid gap-2 pt-1 ${isMidtermOnly ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                <div className="p-2 sm:p-2.5 rounded-lg bg-teal-50/60 border border-teal-100 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-900 truncate">
                    <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>
                    <span>Class Participation</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-teal-950">
                    +{isMidtermOnly ? analytics.cpMidPart.toFixed(2) : analytics.cpFinPart.toFixed(2)}%{" "}
                    <span className="text-[10px] text-teal-700 font-normal">
                      / {isMidtermOnly ? activeWeights.midterms.cp : activeWeights.finals.cp}%
                    </span>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-100 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900 truncate">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                    <span>Enabling Activities</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-indigo-950">
                    +{isMidtermOnly ? analytics.eaMidPart.toFixed(2) : analytics.eaFinPart.toFixed(2)}%{" "}
                    <span className="text-[10px] text-indigo-700 font-normal">
                      / {isMidtermOnly ? activeWeights.midterms.ea : activeWeights.finals.ea}%
                    </span>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-900 truncate">
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                    <span>{isMidtermOnly ? "Major Task (MPT)" : "Major Tasks (MPT & CPT)"}</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-blue-950">
                    +{isMidtermOnly ? analytics.mptMidPart.toFixed(2) : (analytics.mptFinPart + analytics.cptFinPart).toFixed(2)}%{" "}
                    <span className="text-[10px] text-blue-700 font-normal">
                      / {isMidtermOnly ? activeWeights.midterms.mpt : (activeWeights.finals.mpt + activeWeights.finals.cpt)}%
                    </span>
                  </div>
                </div>

                {!isMidtermOnly && (
                  <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>Bonus Points</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-950">
                      +{analytics.bonusScore.toFixed(2)}% <span className="text-[10px] text-emerald-700 font-normal">direct</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section Header: Course Grade Components */}
        <div className="pt-2 pb-1">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            Course Grade Components
          </h2>
          <p className="text-xs text-slate-500">
            {isMidtermOnly
              ? "Review your Midterm Period (Weeks 1 to 7) performance and assessment records"
              : "Review your performance, points earned, and individual assessment scores in each syllabus component"
            }
          </p>
        </div>

        {/* 4. THE 3 CORE SYLLABUS PILLARS (COMPONENT LEDGER) */}
        {grade.showBreakdown && analytics && (
          <div className="space-y-4">
            {/* PILLAR 1: CLASS PARTICIPATION (CP) */}
            <div className="rounded-2xl border border-teal-200/90 overflow-hidden bg-white shadow-xs">
              <div className="bg-teal-50/70 px-4 sm:px-5 py-3.5 border-b border-teal-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0"></span>
                  <span className="font-bold text-teal-950 text-xs sm:text-sm tracking-wide uppercase">
                    Class Participation (CP)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-teal-950 text-xs sm:text-sm bg-white/90 border border-teal-200 px-2.5 py-1 rounded-lg shadow-2xs">
                    {isMidtermOnly ? analytics.cpMidPart.toFixed(2) : analytics.cpFinPart.toFixed(2)}% / {isMidtermOnly ? activeWeights.midterms.cp : activeWeights.finals.cp}%
                  </span>
                </div>
              </div>

              <div className={`grid divide-y md:divide-y-0 divide-slate-100 ${isMidtermOnly ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 md:divide-x"}`}>
                {/* W1-W7 (Midterm Period) */}
                <div className="p-3.5 sm:p-4 space-y-2.5 bg-blue-50/20">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        Weeks 1 to 7 (Midterm Period)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-blue-900">
                      {analytics.cpMidPct.toFixed(2)}% avg <span className="font-normal text-slate-500">({analytics.cpMidScoreSum}/{analytics.cpMidHpsSum} pts)</span>
                    </span>
                  </div>

                  {categorized.cpMid.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 font-mono text-xs">-</div>
                  ) : (
                    <div className="space-y-1.5">
                      {categorized.cpMid.map((item) => (
                        <div
                          key={item.id}
                          className="py-2 px-2.5 rounded-lg bg-white hover:bg-blue-50/50 transition-colors border border-blue-100/70 flex items-center justify-between gap-2 text-xs shadow-2xs"
                        >
                          <span className="text-slate-800 font-medium truncate min-w-0 flex-1" title={item.name}>
                            {item.name}
                          </span>
                          <div className="font-mono text-xs shrink-0 text-right">
                            {item.score !== null ? (
                              <span>
                                <strong className="text-slate-900 font-bold">{item.score}</strong>
                                <span className="text-slate-400 font-normal"> / {item.maxScore} pts</span>
                                <span className="text-blue-700 font-semibold text-[10px] ml-1">
                                  ({((item.score / (item.maxScore || 1)) * 100).toFixed(2)}%)
                                </span>
                              </span>
                            ) : (
                              <span>
                                <strong className="text-slate-400 font-bold">-</strong>
                                <span className="text-slate-400 font-normal"> / {item.maxScore} pts</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* W8-W13 (Finals Period) - Hidden in Midterm Only mode */}
                {!isMidtermOnly && (
                  <div className="p-3.5 sm:p-4 space-y-2.5 bg-purple-50/20">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Weeks 8 to 13 (Finals Period)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-purple-900">
                        {analytics.cpFinPct.toFixed(2)}% avg <span className="font-normal text-slate-500">({analytics.cpFinScoreSum}/{analytics.cpFinHpsSum} pts)</span>
                      </span>
                    </div>

                    {categorized.cpFin.length === 0 ? (
                      <div className="py-4 text-center text-slate-400 font-mono text-xs">-</div>
                    ) : (
                      <div className="space-y-1.5">
                        {categorized.cpFin.map((item) => (
                          <div
                            key={item.id}
                            className="py-2 px-2.5 rounded-lg bg-white hover:bg-purple-50/50 transition-colors border border-purple-100/70 flex items-center justify-between gap-2 text-xs shadow-2xs"
                          >
                            <span className="text-slate-800 font-medium truncate min-w-0 flex-1" title={item.name}>
                              {item.name}
                            </span>
                            <div className="font-mono text-xs shrink-0 text-right">
                              {item.score !== null ? (
                                <span>
                                  <strong className="text-slate-900 font-bold">{item.score}</strong>
                                  <span className="text-slate-400 font-normal"> / {item.maxScore} pts</span>
                                  <span className="text-purple-700 font-semibold text-[10px] ml-1">
                                    ({((item.score / (item.maxScore || 1)) * 100).toFixed(2)}%)
                                  </span>
                                </span>
                              ) : (
                                <span>
                                  <strong className="text-slate-400 font-bold">-</strong>
                                  <span className="text-slate-400 font-normal"> / {item.maxScore} pts</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PILLAR 2: ENABLING ACTIVITIES (EA) */}
            <div className="rounded-2xl border border-indigo-200/90 overflow-hidden bg-white shadow-xs">
              <div className="bg-indigo-50/70 px-4 sm:px-5 py-3.5 border-b border-indigo-200/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
                  <span className="font-bold text-indigo-950 text-xs sm:text-sm tracking-wide uppercase">
                    Enabling Activities (EA)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-950 text-xs sm:text-sm bg-white/90 border border-indigo-200 px-2.5 py-1 rounded-lg shadow-2xs">
                    {isMidtermOnly ? analytics.eaMidPart.toFixed(2) : analytics.eaFinPart.toFixed(2)}% / {isMidtermOnly ? activeWeights.midterms.ea : activeWeights.finals.ea}%
                  </span>
                </div>
              </div>

              <div className={`grid divide-y md:divide-y-0 divide-slate-100 ${isMidtermOnly ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 md:divide-x"}`}>
                {/* W1-W7 (Midterm Period) */}
                <div className="p-3.5 sm:p-4 space-y-2.5 bg-blue-50/20">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        Weeks 1 to 7 (Midterm Period)
                      </span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-blue-900">
                      {analytics.eaMidPct.toFixed(2)}% avg <span className="font-normal text-slate-500">({analytics.eaMidScoreSum}/{analytics.eaMidHpsSum} pts)</span>
                    </span>
                  </div>

                  {categorized.eaMid.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 font-mono text-xs">-</div>
                  ) : (
                    <div className="space-y-1.5">
                      {categorized.eaMid.map((item) => (
                        <div
                          key={item.id}
                          className="py-2 px-2.5 rounded-lg bg-white hover:bg-blue-50/50 transition-colors border border-blue-100/70 flex items-center justify-between gap-2 text-xs shadow-2xs"
                        >
                          <span className="text-slate-800 font-medium truncate min-w-0 flex-1" title={item.name}>
                            {item.name}
                          </span>
                          <div className="font-mono text-xs shrink-0 text-right">
                            {item.score !== null ? (
                              <span>
                                <strong className="text-slate-900 font-bold">{item.score}</strong>
                                <span className="text-slate-400 font-normal"> / {item.maxScore} pts</span>
                                <span className="text-blue-700 font-semibold text-[10px] ml-1">
                                  ({((item.score / (item.maxScore || 1)) * 100).toFixed(2)}%)
                                </span>
                              </span>
                            ) : (
                              <span>
                                <strong className="text-slate-400 font-bold">-</strong>
                                <span className="text-slate-400 font-normal"> / {item.maxScore} pts</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* W8-W13 (Finals Period) - Hidden in Midterm Only mode */}
                {!isMidtermOnly && (
                  <div className="p-3.5 sm:p-4 space-y-2.5 bg-purple-50/20">
                    <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Weeks 8 to 13 (Finals Period)
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-purple-900">
                        {analytics.eaFinPct.toFixed(2)}% avg <span className="font-normal text-slate-500">({analytics.eaFinScoreSum}/{analytics.eaFinHpsSum} pts)</span>
                      </span>
                    </div>

                    {categorized.eaFin.length === 0 ? (
                      <div className="py-4 text-center text-slate-400 font-mono text-xs">-</div>
                    ) : (
                      <div className="space-y-1.5">
                        {categorized.eaFin.map((item) => (
                          <div
                            key={item.id}
                            className="py-2 px-2.5 rounded-lg bg-white hover:bg-purple-50/50 transition-colors border border-purple-100/70 flex items-center justify-between gap-2 text-xs shadow-2xs"
                          >
                            <span className="text-slate-800 font-medium truncate min-w-0 flex-1" title={item.name}>
                              {item.name}
                            </span>
                            <div className="font-mono text-xs shrink-0 text-right">
                              {item.score !== null ? (
                                <span>
                                  <strong className="text-slate-900 font-bold">{item.score}</strong>
                                  <span className="text-slate-400 font-normal"> / {item.maxScore} pts</span>
                                  <span className="text-purple-700 font-semibold text-[10px] ml-1">
                                    ({((item.score / (item.maxScore || 1)) * 100).toFixed(2)}%)
                                  </span>
                                </span>
                              ) : (
                                <span>
                                  <strong className="text-slate-400 font-bold">-</strong>
                                  <span className="text-slate-400 font-normal"> / {item.maxScore} pts</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PILLAR 3: MAJOR PERFORMANCE TASKS */}
            <div className="rounded-2xl border border-blue-200/90 overflow-hidden bg-white shadow-xs">
              <div className="bg-blue-50/70 px-4 sm:px-5 py-3.5 border-b border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                  <span className="font-bold text-blue-950 text-xs sm:text-sm tracking-wide uppercase">
                    {isMidtermOnly ? "Major Performance Task (MPT)" : "Major Performance Milestones"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-blue-950 text-xs sm:text-sm bg-white/90 border border-blue-200 px-2.5 py-1 rounded-lg shadow-2xs">
                    {isMidtermOnly
                      ? `${analytics.mptMidPart.toFixed(2)}% / ${activeWeights.midterms.mpt}%`
                      : `${(analytics.mptFinPart + analytics.cptFinPart).toFixed(2)}% / ${activeWeights.finals.mpt + activeWeights.finals.cpt}%`
                    }
                  </span>
                </div>
              </div>

              <div className={`grid divide-y md:divide-y-0 divide-slate-100 p-4 sm:p-5 gap-4 ${isMidtermOnly ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 md:divide-x md:gap-0"}`}>
                {/* MPT Card */}
                <div className={`${isMidtermOnly ? "" : "md:pr-5"} space-y-3 bg-blue-50/20 p-3 sm:p-4 rounded-xl border border-blue-100`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Major Performance Task (MPT)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Midterm Milestone &bull; <strong>{isMidtermOnly ? "40% of Midterm Mark" : "20% of Final Grade (40% in Midterms)"}</strong>
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                      {isMidtermOnly
                        ? `${analytics.mptMidPart.toFixed(2)}% / ${activeWeights.midterms.mpt}%`
                        : `${analytics.mptFinPart.toFixed(2)}% / ${activeWeights.finals.mpt}%`
                      }
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-blue-100 space-y-2 shadow-2xs">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-800 font-semibold truncate" title={categorized.mpt?.name || "Major Performance Task (MPT)"}>
                        {categorized.mpt?.name || "Major Performance Task (MPT)"}
                      </span>
                      <span className="font-mono font-bold text-slate-900 ml-2 shrink-0">
                        {analytics.mptScore !== null ? analytics.mptScore : "-"} / {analytics.mptHps || 50} pts
                        <span className="text-blue-700 font-normal ml-1">({analytics.mptPct.toFixed(2)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${analytics.mptScore !== null ? Math.min(100, Math.max(4, analytics.mptPct)) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* CPT Card - Hidden in Midterm Only mode */}
                {!isMidtermOnly && (
                  <div className="md:pl-5 space-y-3 pt-4 md:pt-0 bg-purple-50/20 p-3 sm:p-4 rounded-xl border border-purple-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            Culminating Performance Task (CPT)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Final Milestone &bull; <strong>20% of Final Grade</strong>
                        </p>
                      </div>
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                        {analytics.cptFinPart.toFixed(2)}% / {activeWeights.finals.cpt}%
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-purple-100 space-y-2 shadow-2xs">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="text-slate-800 font-semibold truncate" title={categorized.cpt?.name || "Culminating Performance Task (CPT)"}>
                          {categorized.cpt?.name || "Culminating Performance Task (CPT)"}
                        </span>
                        <span className="font-mono font-bold text-slate-900 ml-2 shrink-0">
                          {analytics.cptScore !== null ? analytics.cptScore : "-"} / {analytics.cptHps || 50} pts
                          <span className="text-purple-700 font-normal ml-1">({analytics.cptPct.toFixed(2)}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${analytics.cptScore !== null ? Math.min(100, Math.max(4, analytics.cptPct)) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BONUS POINTS CARD - Strictly for Finals period only */}
            {!isMidtermOnly && (
              <div className="p-4 rounded-2xl border border-emerald-200/90 bg-emerald-50/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                      Bonus Points
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold border border-emerald-200">
                      Direct Grade Addition
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-900/80 leading-relaxed max-w-2xl">
                    Bonus points are subject to the grading criteria of this course and the discretion of the course professor based on student merit, special tasks, or outstanding participation.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xl sm:text-2xl font-black font-mono text-emerald-950">
                    {analytics.bonusScore > 0 ? (
                      <span>+{analytics.bonusScore}%</span>
                    ) : (
                      <span className="text-emerald-700/60 font-semibold text-base">0%</span>
                    )}
                  </div>
                  <span className="text-[10px] text-emerald-800 font-medium">Added Directly to Final Grade</span>
                </div>
              </div>
            )}

            {/* 5. TRANSPARENT COURSE GRADE SUMMARY */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                    Grade Composition Summary
                  </span>
                </div>
                <span className="font-mono text-[10px] sm:text-xs font-semibold text-slate-500">
                  {isMidtermOnly
                    ? `100% Midterm Total = CP (${activeWeights.midterms.cp}%) + EA (${activeWeights.midterms.ea}%) + MPT (${activeWeights.midterms.mpt}%)`
                    : "100% Course Total = CP (30%) + EA (30%) + MPT (20%) + CPT (20%) + Bonus"
                  }
                </span>
              </div>

              <div className={`grid gap-4 ${isMidtermOnly ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                {/* Midterm Checkpoint Summary */}
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="font-bold text-xs text-blue-950 uppercase tracking-wide">
                      Midterm Checkpoint (Weeks 1–7)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      100% Scale
                    </span>
                  </div>
                  <div className="space-y-2 text-xs font-mono text-slate-700">
                    <div className="flex justify-between">
                      <span>Class Participation (CP) ({activeWeights.midterms.cp}%):</span>
                      <strong className="text-slate-900">+{analytics.cpMidPart.toFixed(2)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Enabling Activities (EA) ({activeWeights.midterms.ea}%):</span>
                      <strong className="text-slate-900">+{analytics.eaMidPart.toFixed(2)}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Major Task (MPT) ({activeWeights.midterms.mpt}%):</span>
                      <strong className="text-slate-900">+{analytics.mptMidPart.toFixed(2)}%</strong>
                    </div>
                    <div className="pt-2 border-t border-blue-200 flex justify-between font-bold text-blue-900 text-xs sm:text-sm">
                      <span>Midterm Mark Total:</span>
                      <span>
                        {midtermParsed.mainMark === "R"
                          ? "R"
                          : `${midtermParsed.mainMark} (${midtermParsed.standingDesc || "Passed"}${midtermParsed.pctLabel ? ` • ${midtermParsed.pctLabel}` : ""})`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Final Grade Summary - Hidden in Midterm Only mode */}
                {!isMidtermOnly && (
                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/20 space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                      <span className="font-bold text-xs text-indigo-950 uppercase tracking-wide">
                        Final Course Grade (Full Semester)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                        100% Scale
                      </span>
                    </div>
                    <div className="space-y-2 text-xs font-mono text-slate-700">
                      <div className="flex justify-between">
                        <span>Class Participation (CP) ({activeWeights.finals.cp}%):</span>
                        <strong className="text-slate-900">+{analytics.cpFinPart.toFixed(2)}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Enabling Activities (EA) ({activeWeights.finals.ea}%):</span>
                        <strong className="text-slate-900">+{analytics.eaFinPart.toFixed(2)}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Midterm Task (MPT) ({activeWeights.finals.mpt}%):</span>
                        <strong className="text-slate-900">+{analytics.mptFinPart.toFixed(2)}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Final Task (CPT) ({activeWeights.finals.cpt}%):</span>
                        <strong className="text-slate-900">+{analytics.cptFinPart.toFixed(2)}%</strong>
                      </div>
                      {analytics.bonusScore > 0 && (
                        <div className="flex justify-between text-emerald-800 font-semibold">
                          <span>Bonus Discretionary Points:</span>
                          <strong>+{analytics.bonusScore.toFixed(2)}%</strong>
                        </div>
                      )}
                      <div className="pt-2 border-t border-indigo-200 flex justify-between font-bold text-indigo-950 text-xs sm:text-sm">
                        <span>Cumulative Course Total:</span>
                        <span>
                          {finalParsed.mainMark === "R"
                            ? "R"
                            : `${finalParsed.mainMark} (${finalParsed.standingDesc || "Passed"}${finalParsed.pctLabel ? ` • ${finalParsed.pctLabel}` : ""})`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PROVISIONAL GRADE DISCLAIMER */}
        {grade.showProvisionalNotice && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900 font-semibold">Provisional Consultation Report: </strong>
              <span>
                These grades and breakdowns are provisional assessment records published by your professor for academic review and consultation. Official final semester records are verified and finalized through official institutional registrar channels.
              </span>
            </div>
          </div>
        )}

        {/* BOTTOM INDEPENDENT TOOL SAFEGUARDS & DISCLAIMER */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-center text-xs text-slate-500 space-y-1.5 shadow-xs">
          <div className="flex items-center justify-center gap-1.5 font-semibold text-slate-700">
            <Shield className="w-4 h-4 text-slate-600" />
            <span>Private Grade Access &bull; Individual Student Isolation</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Gradefolio is an independent academic grade breakdown viewer. Access to personal academic information is strictly isolated to authenticated students.
          </p>
        </div>
      </div>

      {/* Enterprise Inactivity Auto-Logout Safeguard (15 minutes idle timeout with 60s warning) */}
      <IdleSessionTracker
        timeoutMinutes={15}
        warningSeconds={60}
        redirectUrl={`/section/${sectionCode}/login`}
        roleLabel="student"
      />
    </div>
  );
}