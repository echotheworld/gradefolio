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
export function parseClassRecordTemplate(
  ws: XLSX.WorkSheet,
  wb?: XLSX.WorkBook,
  options?: { overrideMetadata?: Partial<ClassRecordMetadata> }
): ClassRecordParseResult {
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

  if (options?.overrideMetadata) {
    if (options.overrideMetadata.facultyName && (!metadata.facultyName || metadata.facultyName === "0")) {
      metadata.facultyName = options.overrideMetadata.facultyName;
    }
    if (options.overrideMetadata.department && (!metadata.department || metadata.department === "0")) {
      metadata.department = options.overrideMetadata.department;
    }
    if (options.overrideMetadata.termAcademicYear && (!metadata.termAcademicYear || metadata.termAcademicYear === "0")) {
      metadata.termAcademicYear = options.overrideMetadata.termAcademicYear;
    }
    if (options.overrideMetadata.subjectTitle && (!metadata.subjectTitle || metadata.subjectTitle === "0")) {
      metadata.subjectTitle = options.overrideMetadata.subjectTitle;
    }
    if (options.overrideMetadata.subjectCode && (!metadata.subjectCode || metadata.subjectCode === "0")) {
      metadata.subjectCode = options.overrideMetadata.subjectCode;
    }
    if (options.overrideMetadata.sectionCode && (!metadata.sectionCode || metadata.sectionCode === "0")) {
      metadata.sectionCode = options.overrideMetadata.sectionCode;
    }
    if (options.overrideMetadata.units && (!metadata.units || metadata.units === 0)) {
      metadata.units = options.overrideMetadata.units;
    }
    if (options.overrideMetadata.day && (!metadata.day || metadata.day === "0")) {
      metadata.day = options.overrideMetadata.day;
    }
    if (options.overrideMetadata.time && (!metadata.time || metadata.time === "0")) {
      metadata.time = options.overrideMetadata.time;
    }
    if (options.overrideMetadata.room && (!metadata.room || metadata.room === "0")) {
      metadata.room = options.overrideMetadata.room;
    }
  }

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

export interface MultiSectionSheetSummary {
  sheetName: string;
  sheetIndex?: number;
  sectionCode: string;
  sectionName: string;
  subjectCode: string;
  subjectTitle: string;
  academicYear: string;
  term: string;
  department: string;
  facultyName: string;
  units: number;
  day?: string;
  time?: string;
  room?: string;
  studentCount: number;
  assessmentCount: number;
  parsedData: ClassRecordParseResult;
  isValid: boolean;
  isEmpty: boolean;
  warnings: string[];
}

export interface MultiSectionWorkbookResult {
  isMultiSection: boolean;
  coverPageFound: boolean;
  facultyName: string;
  academicYear: string;
  term: string;
  department: string;
  sections: MultiSectionSheetSummary[];
  totalActiveSections: number;
  totalStudents: number;
  warnings: string[];
}

/**
 * Checks if a sheet name is a non-data / guidance sheet
 */
function isNonDataSheet(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return (
    lower.includes("cover") ||
    lower.includes("instruction") ||
    lower.includes("guide") ||
    lower.includes("legend") ||
    lower.includes("readme") ||
    lower.includes("summary") ||
    lower.includes("template")
  );
}

/**
 * Parses a Multi-Section Institutional Class Record Workbook
 * Supports Cover Page directory mapping as well as sheets named by Section Name (e.g. ACT261, BSCS2A) or Sheet Number (1, 2, 3...)
 */
export function parseMultiSectionWorkbook(wb: XLSX.WorkBook): MultiSectionWorkbookResult {
  const warnings: string[] = [];

  // 1. Detect Cover Page
  const coverSheetName = wb.SheetNames.find((name) => {
    const clean = name.trim().toLowerCase();
    return clean === "cover page" || clean === "cover" || clean === "coverpage";
  });

  const coverWs = coverSheetName ? wb.Sheets[coverSheetName] : null;
  const coverPageFound = Boolean(coverWs);

  const getCellStr = (ws: XLSX.WorkSheet | null | undefined, coord: string): string => {
    if (!ws) return "";
    const val = ws[coord]?.v;
    if (val === undefined || val === null || val === "-") return "";
    return String(val).trim();
  };

  const getCellNum = (ws: XLSX.WorkSheet | null | undefined, coord: string, fallback: number = 0): number => {
    if (!ws) return fallback;
    const val = ws[coord]?.v;
    if (val === undefined || val === null || val === "-") return fallback;
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  };

  // Cover Page Global Metadata
  // C13: Faculty Name (C14 is label)
  // M13: Academic Year (M14 is label)
  // R13: Term (R14 is label)
  // C15: Department (C16 is label)
  let facultyName = getCellStr(coverWs, "C13");
  if (!facultyName) facultyName = getCellStr(coverWs, "D13");

  let academicYear = getCellStr(coverWs, "M13");
  if (!academicYear) academicYear = getCellStr(coverWs, "N13");

  let term = getCellStr(coverWs, "R13");
  if (!term) term = getCellStr(coverWs, "S13");

  let department = getCellStr(coverWs, "C15");
  if (!department) department = getCellStr(coverWs, "D15");

  // Cover Page directory rows (standard is rows 19 through 28 for 10 sheets)
  interface CoverEntry {
    sheetIndex: number;
    sectionName: string;
    subjectCode: string;
    subjectTitle: string;
    day: string;
    time: string;
    room: string;
    units: number;
  }
  const coverEntries: CoverEntry[] = [];

  if (coverWs) {
    for (let r = 19; r <= 35; r++) {
      const sheetNumRaw = coverWs[`D${r}`]?.v;
      const secName = getCellStr(coverWs, `E${r}`);
      const subjCode = getCellStr(coverWs, `G${r}`);
      const subjTitle = getCellStr(coverWs, `I${r}`);
      const day = getCellStr(coverWs, `N${r}`);
      const time = getCellStr(coverWs, `P${r}`);
      const room = getCellStr(coverWs, `R${r}`);
      const units = getCellNum(coverWs, `T${r}`, 3);

      const sheetNum = Number(sheetNumRaw);
      if ((!isNaN(sheetNum) && sheetNum > 0) || secName || subjCode || subjTitle) {
        coverEntries.push({
          sheetIndex: !isNaN(sheetNum) && sheetNum > 0 ? sheetNum : coverEntries.length + 1,
          sectionName: secName,
          subjectCode: subjCode,
          subjectTitle: subjTitle,
          day,
          time,
          room,
          units: units || 3,
        });
      }
    }
  }

  // 2. Identify candidate section sheets
  const candidateSheetNames = wb.SheetNames.filter((name) => !isNonDataSheet(name));
  const processedSheetNames = new Set<string>();
  const sectionSummaries: MultiSectionSheetSummary[] = [];

  // Helper to find a worksheet in wb (case-insensitive)
  const findSheet = (nameOrIndex: string | number): { sheetName: string; ws: XLSX.WorkSheet } | null => {
    const targetStr = String(nameOrIndex).trim().toLowerCase();
    for (const sName of wb.SheetNames) {
      if (sName.trim().toLowerCase() === targetStr) {
        return { sheetName: sName, ws: wb.Sheets[sName] };
      }
    }
    return null;
  };

  // 3. Match from Cover Page directory first
  for (const entry of coverEntries) {
    // Attempt 1: by section name (e.g. sheet named "ACT261")
    let match = entry.sectionName ? findSheet(entry.sectionName) : null;

    // Attempt 2: by sheet index (e.g. sheet named "1", "2")
    if (!match && entry.sheetIndex) {
      match = findSheet(entry.sheetIndex);
    }

    // Attempt 3: by sheet index string with prefix (e.g. "Sheet 1" or "Sheet1")
    if (!match && entry.sheetIndex) {
      match = findSheet(`Sheet ${entry.sheetIndex}`) || findSheet(`Sheet${entry.sheetIndex}`);
    }

    if (match && !processedSheetNames.has(match.sheetName)) {
      processedSheetNames.add(match.sheetName);

      const sectionWs = match.ws;
      const isTemplate = isClassRecordTemplate(sectionWs, wb);

      const overrideMetadata: Partial<ClassRecordMetadata> = {
        facultyName: facultyName || undefined,
        department: department || undefined,
        termAcademicYear: term && academicYear ? `${term} SY ${academicYear}` : undefined,
        subjectTitle: entry.subjectTitle || undefined,
        subjectCode: entry.subjectCode || undefined,
        sectionCode: entry.sectionName || undefined,
        units: entry.units || undefined,
        day: entry.day || undefined,
        time: entry.time || undefined,
        room: entry.room || undefined,
      };

      const parsedData = parseClassRecordTemplate(sectionWs, undefined, { overrideMetadata });

      const cleanCode = (val: string | undefined): string => {
        if (!val || val === "0" || val === "-" || val === "undefined") return "";
        return val.trim();
      };

      const finalSecName = cleanCode(entry.sectionName) || cleanCode(parsedData.metadata.sectionCode) || match.sheetName;
      const finalSubjTitle = cleanCode(entry.subjectTitle) || cleanCode(parsedData.metadata.subjectTitle) || "Course Section";
      const finalSubjCode = cleanCode(entry.subjectCode) || cleanCode(parsedData.metadata.subjectCode) || "";

      const studentCount = parsedData.students.length;
      const assessmentCount = parsedData.assessmentItems.filter((a) => a.code !== "BONUS" || a.name !== "BONUS").length;
      const isEmpty = studentCount === 0;

      sectionSummaries.push({
        sheetName: match.sheetName,
        sheetIndex: entry.sheetIndex,
        sectionCode: finalSecName,
        sectionName: finalSecName,
        subjectCode: finalSubjCode,
        subjectTitle: finalSubjTitle,
        academicYear: academicYear || parsedData.metadata.termAcademicYear || "2024-2025",
        term: term || "1st Term",
        department: department || parsedData.metadata.department || "",
        facultyName: facultyName || parsedData.metadata.facultyName || "",
        units: entry.units || parsedData.metadata.units || 3,
        day: entry.day || parsedData.metadata.day,
        time: entry.time || parsedData.metadata.time,
        room: entry.room || parsedData.metadata.room,
        studentCount,
        assessmentCount,
        parsedData,
        isValid: isTemplate,
        isEmpty,
        warnings: [],
      });
    }
  }

  // 4. Any remaining candidate sheets in the workbook (e.g., sheets not listed in Cover Page, or when no Cover Page exists)
  for (const sName of candidateSheetNames) {
    if (processedSheetNames.has(sName)) continue;
    const sectionWs = wb.Sheets[sName];
    if (!sectionWs) continue;

    // Check if it looks like a class record sheet
    if (!isClassRecordTemplate(sectionWs, wb)) continue;

    processedSheetNames.add(sName);

    const overrideMetadata: Partial<ClassRecordMetadata> = {
      facultyName: facultyName || undefined,
      department: department || undefined,
      termAcademicYear: term && academicYear ? `${term} SY ${academicYear}` : undefined,
      sectionCode: sName,
    };

    const parsedData = parseClassRecordTemplate(sectionWs, undefined, { overrideMetadata });

    const cleanCode = (val: string | undefined): string => {
      if (!val || val === "0" || val === "-" || val === "undefined") return "";
      return val.trim();
    };

    const finalSecName = cleanCode(parsedData.metadata.sectionCode) || sName;
    const finalSubjTitle = cleanCode(parsedData.metadata.subjectTitle) || "Course Section";
    const finalSubjCode = cleanCode(parsedData.metadata.subjectCode) || "";

    const studentCount = parsedData.students.length;
    const assessmentCount = parsedData.assessmentItems.filter((a) => a.code !== "BONUS" || a.name !== "BONUS").length;
    const isEmpty = studentCount === 0;

    sectionSummaries.push({
      sheetName: sName,
      sectionCode: finalSecName,
      sectionName: finalSecName,
      subjectCode: finalSubjCode,
      subjectTitle: finalSubjTitle,
      academicYear: academicYear || parsedData.metadata.termAcademicYear || "2024-2025",
      term: term || "1st Term",
      department: department || parsedData.metadata.department || "",
      facultyName: facultyName || parsedData.metadata.facultyName || "",
      units: parsedData.metadata.units || 3,
      day: parsedData.metadata.day,
      time: parsedData.metadata.time,
      room: parsedData.metadata.room,
      studentCount,
      assessmentCount,
      parsedData,
      isValid: true,
      isEmpty,
      warnings: [],
    });
  }

  const activeSections = sectionSummaries.filter((s) => !s.isEmpty && s.studentCount > 0);
  const totalStudents = activeSections.reduce((sum, s) => sum + s.studentCount, 0);

  return {
    isMultiSection: sectionSummaries.length > 1 || coverPageFound,
    coverPageFound,
    facultyName,
    academicYear,
    term,
    department,
    sections: sectionSummaries,
    totalActiveSections: activeSections.length,
    totalStudents,
    warnings,
  };
}
