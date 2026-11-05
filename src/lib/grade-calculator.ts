import { calculateGradeEquivalent, getGradeRemarks, R_GRADE_MESSAGE } from "./class-record-parser";

export type ItemType = "CP" | "EA" | "MPT" | "CPT" | "BONUS";
export type ItemPeriod = "MIDTERMS" | "POST_MIDTERMS";
export type ItemBucket = "cpMid" | "cpFin" | "eaMid" | "eaFin" | "mpt" | "cpt" | "bonus";

export interface WeightConfig {
  midterms: { cp: number; ea: number; mpt: number };
  finals: { cp: number; ea: number; mpt: number; cpt: number };
}

export const DEFAULT_WEIGHT_CONFIG: WeightConfig = {
  midterms: { cp: 30, ea: 30, mpt: 40 },
  finals: { cp: 30, ea: 30, mpt: 20, cpt: 20 },
};

export function parseWeightConfig(raw: string | object | null | undefined): WeightConfig {
  if (!raw) return DEFAULT_WEIGHT_CONFIG;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if ((parsed as any)?.midterms && (parsed as any)?.finals) {
      const p = parsed as any;
      return {
        midterms: {
          cp: Number(p.midterms.cp) || 30,
          ea: Number(p.midterms.ea) || 30,
          mpt: Number(p.midterms.mpt) || 40,
        },
        finals: {
          cp: Number(p.finals.cp) || 30,
          ea: Number(p.finals.ea) || 30,
          mpt: Number(p.finals.mpt) || 20,
          cpt: Number(p.finals.cpt) || 20,
        },
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_WEIGHT_CONFIG;
}

export function formatCategoryString(type: ItemType, period: ItemPeriod = "MIDTERMS"): string {
  switch (type) {
    case "CP":
      return period === "POST_MIDTERMS"
        ? "Class Participation - Post Midterms (Week 8 to Week 13)"
        : "Class Participation - Midterms (Week 1 to Week 7)";
    case "EA":
      return period === "POST_MIDTERMS"
        ? "Enabling Activities - Post Midterms (Week 8 to Week 13)"
        : "Enabling Activities - Midterms (Week 1 to Week 7)";
    case "MPT":
      return "Major PT";
    case "CPT":
      return "Culminating PT";
    case "BONUS":
      return "Bonus";
  }
}

export function classifyGradeItem(item: {
  name: string;
  category?: string | null;
}): ItemBucket | null {
  const cat = (item.category || "").toLowerCase().trim();
  const name = (item.name || "").toLowerCase().trim();

  // Ignore synthetic summary items
  if (
    cat === "term grade" ||
    cat === "midterm_grade" ||
    name === "midterm grade" ||
    name === "final grade" ||
    name.includes("final grade (%)") ||
    name.includes("final percentage")
  ) {
    return null;
  }

  // 1. Check explicit category first
  if (cat.includes("major pt") || cat === "mpt") return "mpt";
  if (cat.includes("culminating pt") || cat === "cpt") return "cpt";
  if (cat.includes("bonus")) return "bonus";

  if (cat.includes("class participation") || cat.startsWith("cp")) {
    if (cat.includes("post") || cat.includes("final")) return "cpFin";
    if (cat.includes("midterm")) return "cpMid";
    if (
      name.includes("final") ||
      name.includes("post") ||
      /\b(8|9|10|11|12|13|14)\b/.test(name) ||
      ["q4", "q5", "sw4"].some((prefix) => name.includes(prefix))
    ) {
      return "cpFin";
    }
    return "cpMid";
  }

  if (cat.includes("enabling") || cat.startsWith("ea")) {
    if (cat.includes("post") || cat.includes("final")) return "eaFin";
    if (cat.includes("midterm")) return "eaMid";
    if (
      name.includes("final") ||
      name.includes("post") ||
      /\b(8|9|10|11|12|13|14)\b/.test(name) ||
      ["l6", "l7", "l8", "fp"].some((prefix) => name.includes(prefix))
    ) {
      return "eaFin";
    }
    return "eaMid";
  }

  // 2. Fallback to name heuristics when category is blank
  if (name.includes("mpt") || name.includes("midterm exam")) return "mpt";
  if (name.includes("cpt") || name.includes("final project")) return "cpt";
  if (name.includes("bonus")) return "bonus";
  if (name.startsWith("ea") || name.startsWith("l") || name.includes("lab")) {
    if (
      name.includes("final") ||
      name.includes("post") ||
      /\b(8|9|10|11|12|13|14)\b/.test(name) ||
      ["l6", "l7", "l8", "fp"].some((prefix) => name.includes(prefix))
    ) {
      return "eaFin";
    }
    return "eaMid";
  }

  // Default custom activity to CP Midterms
  return "cpMid";
}

export function parseItemTypeAndPeriod(item: {
  name: string;
  category?: string | null;
}): { type: ItemType; period: ItemPeriod } {
  const bucket = classifyGradeItem(item);
  switch (bucket) {
    case "cpFin":
      return { type: "CP", period: "POST_MIDTERMS" };
    case "eaMid":
      return { type: "EA", period: "MIDTERMS" };
    case "eaFin":
      return { type: "EA", period: "POST_MIDTERMS" };
    case "mpt":
      return { type: "MPT", period: "MIDTERMS" };
    case "cpt":
      return { type: "CPT", period: "POST_MIDTERMS" };
    case "bonus":
      return { type: "BONUS", period: "POST_MIDTERMS" };
    case "cpMid":
    default:
      return { type: "CP", period: "MIDTERMS" };
  }
}

export function categorizeGradeItems<T extends { id: string; name: string; category?: string | null; maxScore: number }>(
  items: T[]
): {
  cpMid: T[];
  cpFin: T[];
  eaMid: T[];
  eaFin: T[];
  mpt: T | null;
  cpt: T | null;
  bonus: T | null;
} {
  const cpMid: T[] = [];
  const cpFin: T[] = [];
  const eaMid: T[] = [];
  const eaFin: T[] = [];
  let mpt: T | null = null;
  let cpt: T | null = null;
  let bonus: T | null = null;

  for (const item of items) {
    const bucket = classifyGradeItem(item);
    if (bucket === "mpt") mpt = item;
    else if (bucket === "cpt") cpt = item;
    else if (bucket === "bonus") bonus = item;
    else if (bucket === "cpMid") cpMid.push(item);
    else if (bucket === "cpFin") cpFin.push(item);
    else if (bucket === "eaMid") eaMid.push(item);
    else if (bucket === "eaFin") eaFin.push(item);
  }

  return { cpMid, cpFin, eaMid, eaFin, mpt, cpt, bonus };
}

export function formatStandingGrade(pct: number | null, subjectName: string = ""): string | null {
  if (pct === null || pct === undefined || isNaN(pct)) return null;
  const rounded = Math.round(pct * 100) / 100;
  const formattedPct = rounded.toFixed(2);
  if (rounded < 60.0) {
    return `R (${formattedPct}%)`;
  }
  const equiv = calculateGradeEquivalent(rounded, subjectName) || "R";
  if (equiv === "R") return `R (${formattedPct}%)`;
  return `${equiv} (${formattedPct}%)`;
}

export function computeStudentGradesFromItems(
  items: Array<{ id: string; name: string; category?: string | null; maxScore: number }>,
  records: Array<{ gradeItemId: string; score: number | null }>,
  weights: WeightConfig,
  subjectName: string = ""
): {
  hasRecorded: boolean;
  midtermPct: number | null;
  finalPct: number | null;
  midtermGrade: string | null;
  finalGrade: string | null;
  remarks: string | null;
} {
  const cat = categorizeGradeItems(items);
  const scoreMap = new Map<string, number | null>();
  for (const r of records) {
    scoreMap.set(r.gradeItemId, r.score);
  }

  let hasRecorded = false;
  let cpMidScore = 0,
    cpMidHps = 0,
    cpFinScore = 0,
    cpFinHps = 0,
    eaMidScore = 0,
    eaMidHps = 0,
    eaFinScore = 0,
    eaFinHps = 0;

  for (const it of cat.cpMid) {
    cpMidHps += it.maxScore;
    const sc = scoreMap.get(it.id);
    if (sc !== null && sc !== undefined) {
      cpMidScore += sc;
      hasRecorded = true;
    }
  }
  for (const it of cat.cpFin) {
    cpFinHps += it.maxScore;
    const sc = scoreMap.get(it.id);
    if (sc !== null && sc !== undefined) {
      cpFinScore += sc;
      hasRecorded = true;
    }
  }
  for (const it of cat.eaMid) {
    eaMidHps += it.maxScore;
    const sc = scoreMap.get(it.id);
    if (sc !== null && sc !== undefined) {
      eaMidScore += sc;
      hasRecorded = true;
    }
  }
  for (const it of cat.eaFin) {
    eaFinHps += it.maxScore;
    const sc = scoreMap.get(it.id);
    if (sc !== null && sc !== undefined) {
      eaFinScore += sc;
      hasRecorded = true;
    }
  }

  let mptScore = 0;
  const mptHps = cat.mpt?.maxScore || 0;
  if (cat.mpt) {
    const sc = scoreMap.get(cat.mpt.id);
    if (sc !== null && sc !== undefined) {
      mptScore = sc;
      hasRecorded = true;
    }
  }

  let cptScore = 0;
  const cptHps = cat.cpt?.maxScore || 0;
  if (cat.cpt) {
    const sc = scoreMap.get(cat.cpt.id);
    if (sc !== null && sc !== undefined) {
      cptScore = sc;
      hasRecorded = true;
    }
  }

  let bonusScore = 0;
  if (cat.bonus) {
    const sc = scoreMap.get(cat.bonus.id);
    if (sc !== null && sc !== undefined) {
      bonusScore = sc;
      hasRecorded = true;
    }
  }

  if (!hasRecorded) {
    return {
      hasRecorded: false,
      midtermPct: null,
      finalPct: null,
      midtermGrade: null,
      finalGrade: null,
      remarks: null,
    };
  }

  const cpTotalScore = cpMidScore + cpFinScore;
  const cpTotalHps = cpMidHps + cpFinHps;
  const eaTotalScore = eaMidScore + eaFinScore;
  const eaTotalHps = eaMidHps + eaFinHps;

  const hasMidtermHps = cpMidHps > 0 || eaMidHps > 0 || mptHps > 0;
  const midtermPct = hasMidtermHps
    ? Math.round(
        ((cpMidHps > 0 ? (cpMidScore / cpMidHps) * weights.midterms.cp : 0) +
          (eaMidHps > 0 ? (eaMidScore / eaMidHps) * weights.midterms.ea : 0) +
          (mptHps > 0 ? (mptScore / mptHps) * weights.midterms.mpt : 0)) *
          100
      ) / 100
    : null;

  const hasFinalHps = cpTotalHps > 0 || eaTotalHps > 0 || mptHps > 0 || cptHps > 0 || bonusScore > 0;
  const finalPct = hasFinalHps
    ? Math.min(
        100,
        Math.round(
          ((cpTotalHps > 0 ? (cpTotalScore / cpTotalHps) * weights.finals.cp : 0) +
            (eaTotalHps > 0 ? (eaTotalScore / eaTotalHps) * weights.finals.ea : 0) +
            (mptHps > 0 ? (mptScore / mptHps) * weights.finals.mpt : 0) +
            (cptHps > 0 ? (cptScore / cptHps) * weights.finals.cpt : 0) +
            bonusScore) *
            100
        ) / 100
      )
    : null;

  const midtermGrade = formatStandingGrade(midtermPct, subjectName);
  const finalGrade = formatStandingGrade(finalPct, subjectName);

  const finalEquiv = finalPct !== null ? calculateGradeEquivalent(finalPct, subjectName) : null;
  let descRemark = finalEquiv ? getGradeRemarks(finalEquiv) : "";
  if (finalEquiv === "R") {
    descRemark = R_GRADE_MESSAGE;
  }

  const remarksParts: string[] = [];
  if (midtermGrade) remarksParts.push(`Midterm: ${midtermGrade}`);
  if (descRemark && descRemark !== R_GRADE_MESSAGE) remarksParts.push(descRemark);
  const remarks = remarksParts.length > 0 ? remarksParts.join(" | ") : null;

  return {
    hasRecorded: true,
    midtermPct,
    finalPct,
    midtermGrade,
    finalGrade,
    remarks,
  };
}
