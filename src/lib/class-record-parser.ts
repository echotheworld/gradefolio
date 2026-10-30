import * as XLSX from "xlsx";

export interface ClassRecordMetadata {
  facultyName: string;
  department: string;
  termAcademicYear: string;
  subjectTitle: string;
  subjectCode: string;
  units: number;
  sectionCode: string;
  day: string;
  time: string;
  room: string;
}

export interface ComponentWeights {
  midterms: {
    cp: number; // 0.30
    ea: number; // 0.30
    mpt: number; // 0.40
  };
  finals: {
    cp: number; // 0.30
    ea: number; // 0.30
    mpt: number; // 0.20
    cpt: number; // 0.20
  };
}

export interface AssessmentItemDef {
  code: string;
  name: string;
  category: "Class Participation" | "Enabling Assessment" | "Major PT" | "Culminating PT" | "Bonus" | "Term Grade";
  period: "Midterms" | "Finals" | "Cumulative";
  col: string;
  hps: number;
}

export interface ParsedStudentRow {
  index: number;
  studentNumber: string;
  displayName: string;
  program: string;
  scores: Record<string, number | null>;
  midtermPercentage: number | null;
  midtermEquivalent: string | null;
  finalPercentage: number | null;
  finalEquivalent: string | null;
  remarks: string | null;
}

export interface ClassRecordParseResult {
  isClassRecord: boolean;
  metadata: ClassRecordMetadata;
  weights: ComponentWeights;
  assessmentItems: AssessmentItemDef[];
  students: ParsedStudentRow[];
  hpsSums: {
    cpMid: number;
    cpTotal: number;
    eaMid: number;
    eaTotal: number;
    mpt: number;
    cpt: number;
  };
}

// Columns definition
export const CP_MID_COLS = ["G", "H", "I", "J", "K", "L", "M"]; // Weeks 1-7 (7 items)
export const CP_FIN_COLS = ["N", "O", "P", "Q", "R", "S", "T"]; // Weeks 8-13 (7 items)
export const EA_MID_COLS = ["U", "V", "W", "X", "Y", "Z", "AA"]; // Weeks 1-7 (7 items)
export const EA_FIN_COLS = ["AB", "AC", "AD", "AE", "AF", "AG", "AH"]; // Weeks 8-13 (7 items)
export const MPT_COL = "AI";
export const CPT_COL = "AJ";
export const BONUS_COL = "AK";

export const MIDTERM_PCT_COL = "AL";
export const MIDTERM_EQUIV_COL = "AM";
export const FINAL_PCT_COL = "AN";
export const FINAL_EQUIV_COL = "AO";
export const REMARKS_COL = "AP";

/**
 * Checks if the worksheet corresponds to the official Class Record Template
 */
export function isClassRecordTemplate(ws: XLSX.WorkSheet, wb?: XLSX.WorkBook): boolean {
  if (!ws) return false;

  // 1. Check defined names if workbook is provided
  if (wb && wb.Workbook && wb.Workbook.Names) {
    const names = wb.Workbook.Names.map((n) => n.Name);
    if (names.includes("CP_Midterms") || names.includes("EA_Midterms") || names.includes("CP_Total")) {
      return true;
    }
  }

  // 2. Check characteristic cells
  const c9 = String(ws["C9"]?.v || "").trim();
  const d9 = String(ws["D9"]?.v || "").trim();
  const g9 = String(ws["G9"]?.v || "").trim();
  const ab3 = String(ws["AB3"]?.v || "").trim();
  const ad3 = String(ws["AD3"]?.v || "").trim();

  if (c9.includes("ID Number") && d9.includes("Student Name")) {
    return true;
  }

  if (g9.includes("Class Participation") || (ab3 === "Components" && ad3 === "CP")) {
    return true;
  }

  return false;
}

/**
 * Known valid Grade Point Equivalents (rejects Excel error codes like 23 or 7)
 */
export function isValidGradeEquivalent(val: any): boolean {
  if (val === undefined || val === null) return false;
  // If val is a number (like Excel error codes 23 for #REF!, 7 for #DIV/0!), reject error numbers
  if (typeof val === "number") {
    const validNums = [1, 1.0, 1.5, 2, 2.0, 2.5, 3, 3.0, 3.5, 4, 4.0];
    return validNums.includes(val);
  }
  const str = String(val).trim();
  if (str.startsWith("#") || str === "23" || str === "7") return false;
  const validScale = new Set([
    "4.0", "3.5", "3.0", "2.5", "2.0", "1.5", "1.0", "R",
    "4", "3.50", "3", "3.00", "2.50", "2", "2.00", "1.50", "1", "1.00",
    "Pass", "Repeat", "INC", "DRP"
  ]);
  return validScale.has(str);
}

export const R_GRADE_MESSAGE = "Grade is unavaible to view. Kindly contact your professor for this matter. ";

/**
 * Grade Table equivalence converter
 * Official Academic Equivalence Scale:
 * 96 - 100       4.0
 * 90 - 95        3.5
 * 84 - 89        3.0
 * 78 - 83        2.5
 * 72 - 77        2.0
 * 66 - 71        1.5
 * 60 - 65        1.0
 * 59 and Below   R
 */
export function calculateGradeEquivalent(percentage: number | null, subjectTitle: string = ""): string | null {
  if (percentage === null || isNaN(percentage)) return null;

  let pct = percentage;
  // Handle normalized 0 to 1 decimals (e.g., 0.9032 -> 90.32)
  if (pct > 0 && pct <= 1) {
    pct = pct * 100;
  }

  // Round to 2 decimal places to avoid floating point precision edge-cases
  pct = Math.round(pct * 100) / 100;

  // Special Case: "The Nationalian"
  if (subjectTitle.trim().toLowerCase().includes("nationalian")) {
    return pct >= 60.0 ? "Pass" : "R";
  }

  // Standard Grading Scale
  if (pct >= 96.0) return "4.0";
  if (pct >= 90.0) return "3.5";
  if (pct >= 84.0) return "3.0";
  if (pct >= 78.0) return "2.5";
  if (pct >= 72.0) return "2.0";
  if (pct >= 66.0) return "1.5";
  if (pct >= 60.0) return "1.0";
  return "R";
}

/**
 * Descriptive remarks from Grade Point.
 * For "R" (59 and below) the remark is the consultation advisory note.
 */
export function getGradeRemarks(gradePoint: string | null): string {
  switch (gradePoint) {
    case "4.0":
      return "Excellent";
    case "3.5":
      return "Superior";
    case "3.0":
      return "Very Good";
    case "2.5":
      return "Good";
    case "2.0":
      return "Satisfactory";
    case "1.5":
      return "Fair";
    case "1.0":
      return "Passed";
    case "Pass":
      return "Passed";
    case "Repeat":
    case "R":
    case R_GRADE_MESSAGE:
      return R_GRADE_MESSAGE;
    default:
      return "Not Recorded";
  }
}

/**
 * Parses full Class Record Template from worksheet
 */
export function parseClassRecordTemplate(ws: XLSX.WorkSheet, wb?: XLSX.WorkBook): ClassRecordParseResult {
  // If workbook is provided, ensure we target the data sheet ('Input Here' or matching template)
  let activeWs = ws;
  if (wb && wb.SheetNames) {
    if (wb.Sheets["Input Here"]) {
      activeWs = wb.Sheets["Input Here"];
    } else {
      for (const sName of wb.SheetNames) {
        if (isClassRecordTemplate(wb.Sheets[sName], wb)) {
          activeWs = wb.Sheets[sName];
          break;
        }
      }
    }
  }

  const isClassRecord = isClassRecordTemplate(activeWs, wb);

  const getCleanVal = (cellCoord: string): string => {
    const val = activeWs[cellCoord]?.v;
    if (val === undefined || val === null || val === "-") return "";
    return String(val).trim();
  };

  const getCleanNum = (cellCoord: string, fallback: number = 0): number => {
    const val = activeWs[cellCoord]?.v;
    if (val === undefined || val === null || val === "-") return fallback;
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  // 1. Metadata (Rows 2 to 6)
  const metadata: ClassRecordMetadata = {
    facultyName: getCleanVal("G2"),
    department: getCleanVal("G4"),
    termAcademicYear: getCleanVal("G6"),
    subjectTitle: getCleanVal("O2"),
    subjectCode: getCleanVal("O4"),
    units: getCleanNum("O6", 3),
    sectionCode: getCleanVal("R6"),
    day: getCleanVal("V2"),
    time: getCleanVal("V4"),
    room: getCleanVal("V6"),
  };

  // 2. Weights Configuration (Rows 4 and 5)
  // Values in template are percentages e.g. 30 -> 0.30
  const weights: ComponentWeights = {
    midterms: {
      cp: (getCleanNum("AD4", 30) || 30) / 100,
      ea: (getCleanNum("AE4", 30) || 30) / 100,
      mpt: (getCleanNum("AF4", 40) || 40) / 100,
    },
    finals: {
      cp: (getCleanNum("AD5", 30) || 30) / 100,
      ea: (getCleanNum("AE5", 30) || 30) / 100,
      mpt: (getCleanNum("AF5", 20) || 20) / 100,
      cpt: (getCleanNum("AG5", 20) || 20) / 100,
    },
  };

  // 3. Assessment Items & HPS (Row 11: Title, Row 12: HPS)
  // RULE: G11-AH11 is our title. If it is empty, DO NOT create a column or grades on that.
  // Generate ONLY when there is a title there and grades.
  const assessmentItems: AssessmentItemDef[] = [];

  // Class Participation Midterms (G11..M11)
  CP_MID_COLS.forEach((col, idx) => {
    const title = getCleanVal(`${col}11`);
    if (!title || title === "-" || title.toLowerCase() === "undefined") return;
    const hps = getCleanNum(`${col}12`, 0);
    assessmentItems.push({
      code: `CP_${idx + 1}`,
      name: title,
      category: "Class Participation",
      period: "Midterms",
      col,
      hps,
    });
  });

  // Class Participation Finals (N11..T11)
  CP_FIN_COLS.forEach((col, idx) => {
    const title = getCleanVal(`${col}11`);
    if (!title || title === "-" || title.toLowerCase() === "undefined") return;
    const hps = getCleanNum(`${col}12`, 0);
    assessmentItems.push({
      code: `CP_${idx + 8}`,
      name: title,
      category: "Class Participation",
      period: "Finals",
      col,
      hps,
    });
  });

  // Enabling Assessments Midterms (U11..AA11)
  EA_MID_COLS.forEach((col, idx) => {
    const title = getCleanVal(`${col}11`);
    if (!title || title === "-" || title.toLowerCase() === "undefined") return;
    const hps = getCleanNum(`${col}12`, 0);
    assessmentItems.push({
      code: `EA_${idx + 1}`,
      name: title,
      category: "Enabling Assessment",
      period: "Midterms",
      col,
      hps,
    });
  });

  // Enabling Assessments Finals (AB11..AH11)
  EA_FIN_COLS.forEach((col, idx) => {
    const title = getCleanVal(`${col}11`);
    if (!title || title === "-" || title.toLowerCase() === "undefined") return;
    const hps = getCleanNum(`${col}12`, 0);
    assessmentItems.push({
      code: `EA_${idx + 8}`,
      name: title,
      category: "Enabling Assessment",
      period: "Finals",
      col,
      hps,
    });
  });

  // Major Performance Task (MPT, AI)
  const mptTitle = getCleanVal(`${MPT_COL}11`);
  const mptHps = getCleanNum(`${MPT_COL}12`, 0);
  if (mptTitle || mptHps > 0) {
    assessmentItems.push({
      code: "MPT",
      name: mptTitle || "Major Performance Task (MPT)",
      category: "Major PT",
      period: "Cumulative",
      col: MPT_COL,
      hps: mptHps || 100,
    });
  }

  // Culminating Performance Task (CPT, AJ)
  const cptTitle = getCleanVal(`${CPT_COL}11`);
  const cptHps = getCleanNum(`${CPT_COL}12`, 0);
  if (cptTitle || cptHps > 0) {
    assessmentItems.push({
      code: "CPT",
      name: cptTitle || "Culminating Performance Task (CPT)",
      category: "Culminating PT",
      period: "Finals",
      col: CPT_COL,
      hps: cptHps || 100,
    });
  }

  // Bonus Points (AK)
  const bonusTitle = getCleanVal(`${BONUS_COL}11`) || getCleanVal(`${BONUS_COL}9`);
  if (bonusTitle && bonusTitle !== "-") {
    assessmentItems.push({
      code: "BONUS",
      name: bonusTitle || "Bonus Points",
      category: "Bonus",
      period: "Cumulative",
      col: BONUS_COL,
      hps: 0,
    });
  }

  // Calculate active HPS totals for formulas using only valid items
  const sumActiveHps = (cols: string[]) =>
    cols.reduce((acc, col) => {
      const item = assessmentItems.find((a) => a.col === col);
      return item ? acc + item.hps : acc;
    }, 0);

  const cpMidHpsSum = sumActiveHps(CP_MID_COLS);
  const cpFinHpsSum = sumActiveHps(CP_FIN_COLS);
  const cpTotalHpsSum = cpMidHpsSum + cpFinHpsSum;

  const eaMidHpsSum = sumActiveHps(EA_MID_COLS);
  const eaFinHpsSum = sumActiveHps(EA_FIN_COLS);
  const eaTotalHpsSum = eaMidHpsSum + eaFinHpsSum;

  const hpsSums = {
    cpMid: cpMidHpsSum,
    cpTotal: cpTotalHpsSum,
    eaMid: eaMidHpsSum,
    eaTotal: eaTotalHpsSum,
    mpt: mptHps,
    cpt: cptHps,
  };

  // 4. Students (Rows 13 onwards, supports up to 150 students)
  const students: ParsedStudentRow[] = [];
  let consecutiveEmpty = 0;

  for (let r = 13; r <= 150; r++) {
    const studentNumber = getCleanVal(`C${r}`);
    const displayName = getCleanVal(`D${r}`);
    const program = getCleanVal(`E${r}`);

    // If both ID and Name are empty, row is unpopulated
    if (!studentNumber && !displayName) {
      consecutiveEmpty++;
      if (consecutiveEmpty >= 8 && r > 62) break;
      continue;
    }
    consecutiveEmpty = 0;

    const studentIndex = getCleanNum(`B${r}`, r - 12);
    const scores: Record<string, number | null> = {};

    let cpMidScoresSum = 0;
    let cpFinScoresSum = 0;
    let eaMidScoresSum = 0;
    let eaFinScoresSum = 0;

    // Collect CP Midterms scores
    CP_MID_COLS.forEach((col) => {
      const item = assessmentItems.find((a) => a.col === col);
      if (!item) return; // Only process if title existed in row 11
      const val = activeWs[`${col}${r}`]?.v;
      if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
        const sc = Number(val);
        scores[item.name] = sc;
        cpMidScoresSum += sc;
      } else {
        scores[item.name] = null;
      }
    });

    // Collect CP Finals scores
    CP_FIN_COLS.forEach((col) => {
      const item = assessmentItems.find((a) => a.col === col);
      if (!item) return;
      const val = activeWs[`${col}${r}`]?.v;
      if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
        const sc = Number(val);
        scores[item.name] = sc;
        cpFinScoresSum += sc;
      } else {
        scores[item.name] = null;
      }
    });

    // Collect EA Midterms scores
    EA_MID_COLS.forEach((col) => {
      const item = assessmentItems.find((a) => a.col === col);
      if (!item) return;
      const val = activeWs[`${col}${r}`]?.v;
      if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
        const sc = Number(val);
        scores[item.name] = sc;
        eaMidScoresSum += sc;
      } else {
        scores[item.name] = null;
      }
    });

    // Collect EA Finals scores
    EA_FIN_COLS.forEach((col) => {
      const item = assessmentItems.find((a) => a.col === col);
      if (!item) return;
      const val = activeWs[`${col}${r}`]?.v;
      if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
        const sc = Number(val);
        scores[item.name] = sc;
        eaFinScoresSum += sc;
      } else {
        scores[item.name] = null;
      }
    });

    // MPT Score
    const mptVal = activeWs[`${MPT_COL}${r}`]?.v;
    const mptScore = mptVal !== undefined && mptVal !== "" && !isNaN(Number(mptVal)) ? Number(mptVal) : null;
    const mptItem = assessmentItems.find((a) => a.col === MPT_COL);
    if (mptItem) {
      scores[mptItem.name] = mptScore;
    }

    // CPT Score
    const cptVal = activeWs[`${CPT_COL}${r}`]?.v;
    const cptScore = cptVal !== undefined && cptVal !== "" && !isNaN(Number(cptVal)) ? Number(cptVal) : null;
    const cptItem = assessmentItems.find((a) => a.col === CPT_COL);
    if (cptItem) {
      scores[cptItem.name] = cptScore;
    }

    // Bonus Points
    const bonusVal = activeWs[`${BONUS_COL}${r}`]?.v;
    const bonusPoints = bonusVal !== undefined && bonusVal !== "" && !isNaN(Number(bonusVal)) ? Number(bonusVal) : 0;
    const bonusItem = assessmentItems.find((a) => a.col === BONUS_COL);
    if (bonusItem) {
      scores[bonusItem.name] = bonusPoints;
    }

    // --- FORMULA COMPUTATION ---
    // Section 4.1: Midterm Grade Percentage (AL)
    let midtermPercentage: number | null = null;
    const midPctCell = activeWs[`${MIDTERM_PCT_COL}${r}`];
    // Reject Excel error types (cell.t === 'e') or non-numeric/error values
    if (midPctCell && midPctCell.t !== "e" && midPctCell.v !== undefined && !isNaN(Number(midPctCell.v))) {
      let rawPct = Number(midPctCell.v);
      if (rawPct > 0 && rawPct <= 1) rawPct = rawPct * 100;
      midtermPercentage = Number(rawPct.toFixed(2));
    } else {
      let cpComponent = 0;
      let eaComponent = 0;
      let mptComponent = 0;

      if (cpMidHpsSum > 0) {
        cpComponent = (cpMidScoresSum / cpMidHpsSum) * (weights.midterms.cp * 100);
      }
      if (eaMidHpsSum > 0) {
        eaComponent = (eaMidScoresSum / eaMidHpsSum) * (weights.midterms.ea * 100);
      }
      if (mptHps > 0 && mptScore !== null) {
        mptComponent = (mptScore / mptHps) * (weights.midterms.mpt * 100);
      }

      const totalMid = cpComponent + eaComponent + mptComponent;
      midtermPercentage = totalMid > 0 ? Number(totalMid.toFixed(2)) : null;
    }

    // Section 4.2: Midterm Equivalent Grade (AM)
    let midtermEquivalent: string | null = null;
    const midEquivCell = activeWs[`${MIDTERM_EQUIV_COL}${r}`];
    if (midEquivCell && midEquivCell.t !== "e" && isValidGradeEquivalent(midEquivCell.v)) {
      midtermEquivalent = String(midEquivCell.v).trim();
    } else {
      midtermEquivalent = calculateGradeEquivalent(midtermPercentage, metadata.subjectTitle);
    }
    if (
      midtermEquivalent === "Repeat" ||
      midtermEquivalent === R_GRADE_MESSAGE ||
      (midtermPercentage !== null && midtermPercentage < 60)
    ) {
      midtermEquivalent = "R";
    }

    // Section 4.3: Final Grade Percentage (AN) (Cumulative formula)
    let finalPercentage: number | null = null;
    const finPctCell = activeWs[`${FINAL_PCT_COL}${r}`];
    if (finPctCell && finPctCell.t !== "e" && finPctCell.v !== undefined && !isNaN(Number(finPctCell.v))) {
      let rawPct = Number(finPctCell.v);
      if (rawPct > 0 && rawPct <= 1) rawPct = rawPct * 100;
      finalPercentage = Number(rawPct.toFixed(2));
    } else {
      let cpFinComponent = 0;
      let eaFinComponent = 0;
      let mptFinComponent = 0;
      let cptFinComponent = 0;

      const cpTotalScoreSum = cpMidScoresSum + cpFinScoresSum;
      const eaTotalScoreSum = eaMidScoresSum + eaFinScoresSum;

      if (cpTotalHpsSum > 0) {
        cpFinComponent = (cpTotalScoreSum / cpTotalHpsSum) * (weights.finals.cp * 100);
      }
      if (eaTotalHpsSum > 0) {
        eaFinComponent = (eaTotalScoreSum / eaTotalHpsSum) * (weights.finals.ea * 100);
      }
      if (mptHps > 0 && mptScore !== null) {
        mptFinComponent = (mptScore / mptHps) * (weights.finals.mpt * 100);
      }
      if (cptHps > 0 && cptScore !== null) {
        cptFinComponent = (cptScore / cptHps) * (weights.finals.cpt * 100);
      }

      const totalFin = cpFinComponent + eaFinComponent + mptFinComponent + cptFinComponent + bonusPoints;
      finalPercentage = totalFin > 0 ? Number(totalFin.toFixed(2)) : null;
    }

    // Section 4.4: Final Equivalent Grade (AO)
    let finalEquivalent: string | null = null;
    const finEquivCell = activeWs[`${FINAL_EQUIV_COL}${r}`];
    if (finEquivCell && finEquivCell.t !== "e" && isValidGradeEquivalent(finEquivCell.v)) {
      finalEquivalent = String(finEquivCell.v).trim();
    } else {
      finalEquivalent = calculateGradeEquivalent(finalPercentage, metadata.subjectTitle);
    }
    if (
      finalEquivalent === "Repeat" ||
      finalEquivalent === R_GRADE_MESSAGE ||
      (finalPercentage !== null && finalPercentage < 60)
    ) {
      finalEquivalent = "R";
    }

    // Populate term grades in scores
    if (midtermPercentage !== null) {
      scores["Midterm Grade (%)"] = midtermPercentage;
    }
    if (finalPercentage !== null) {
      scores["Final Grade (%)"] = finalPercentage;
    }

    // Remarks (AP) — R grades always carry the consultation advisory note
    const existingRemarks = getCleanVal(`${REMARKS_COL}${r}`);
    let remarks = existingRemarks || getGradeRemarks(finalEquivalent);
    if (
      finalEquivalent === "R" ||
      remarks === "R" || remarks === "Repeat" || remarks === "Repeat / Failed"
    ) {
      remarks = R_GRADE_MESSAGE;
    }

    students.push({
      index: studentIndex,
      studentNumber: studentNumber || `STUDENT-${r - 12}`,
      displayName: displayName || `Student ${studentNumber || r - 12}`,
      program,
      scores,
      midtermPercentage,
      midtermEquivalent,
      finalPercentage,
      finalEquivalent,
      remarks,
    });
  }

  return {
    isClassRecord,
    metadata,
    weights,
    assessmentItems,
    students,
    hpsSums,
  };
}
