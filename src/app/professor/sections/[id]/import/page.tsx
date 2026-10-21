"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Download,
  Info,
  Check,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

interface ValidationIssue {
  row: number;
  type: "error" | "warning";
  field: string;
  message: string;
  value: any;
}

export default function ImportGradebookWizard() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sectionId = params.id as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [section, setSection] = useState<{ id: string; sectionCode: string; subjectName: string } | null>(null);

  // Step 1: File state
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  // Step 2: Raw sheet data & header selection
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState<number>(0);

  // Step 3: Column Mapping
  const [headers, setHeaders] = useState<string[]>([]);
  const [studentIdCol, setStudentIdCol] = useState<string>("");
  const [studentNameCol, setStudentNameCol] = useState<string>("");
  const [finalGradeCol, setFinalGradeCol] = useState<string>("");
  const [assessmentCols, setAssessmentCols] = useState<Array<{ name: string; maxScore: number }>>([]);

  // Step 4: Validation
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [hasErrors, setHasErrors] = useState<boolean>(false);
  const [formulaWarning, setFormulaWarning] = useState<boolean>(false);

  // Step 5 & 6: Import preview & results
  const [importSummary, setImportSummary] = useState<{
    created: number;
    updated: number;
    skipped: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load section info
  useEffect(() => {
    fetch(`/api/professor/sections/${sectionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.section) {
          setSection({
            id: data.section.id,
            sectionCode: data.section.sectionCode,
            subjectName: data.section.subjectName,
          });
        }
      });
  }, [sectionId]);

  // Step 1: Process file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 15 * 1024 * 1024) {
      toast({ type: "error", title: "File Too Large", message: "Maximum file size is 15MB." });
      return;
    }

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellFormula: true, cellDates: true });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          setSelectedSheet(wb.SheetNames[0]);
          parseSheetData(wb, wb.SheetNames[0]);
        }
      } catch (err: any) {
        toast({ type: "error", title: "Invalid File", message: "Failed to parse spreadsheet: " + err.message });
      }
    };
    reader.readAsBinaryString(selected);
  };

  // Helper to load sample files
  const handleLoadSample = async (samplePath: string, filename: string) => {
    try {
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const sampleFile = new File([blob], filename, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary", cellFormula: true });
        setFile(sampleFile);
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        if (wb.SheetNames.length > 0) {
          setSelectedSheet(wb.SheetNames[0]);
          parseSheetData(wb, wb.SheetNames[0]);
        }
        toast({ type: "info", title: "Sample Loaded", message: `Loaded ${filename} for testing.` });
      };
      reader.readAsBinaryString(sampleFile);
    } catch {
      toast({ type: "error", title: "Error", message: "Failed to load sample sheet" });
    }
  };

  // Parse raw sheet data
  const parseSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Check for formula cells
    let hasFormulas = false;
    for (const cell in ws) {
      if (ws[cell] && typeof ws[cell] === "object" && ws[cell].f) {
        hasFormulas = true;
        break;
      }
    }
    setFormulaWarning(hasFormulas);

    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    setRawRows(rows);

    // Auto-detect header row (first non-empty row)
    const headerIdx = rows.findIndex((r) => r && r.length > 0 && r.some((c) => c !== undefined && c !== ""));
    setHeaderRowIndex(headerIdx >= 0 ? headerIdx : 0);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) parseSheetData(workbook, sheetName);
  };

  // Step 2 -> Step 3: Confirm header row & auto-detect mapping
  const proceedToMapping = () => {
    if (!rawRows[headerRowIndex]) {
      toast({ type: "error", title: "Header Error", message: "Please select a valid header row." });
      return;
    }

    const detectedHeaders = rawRows[headerRowIndex].map((h: any) => String(h || "").trim());
    setHeaders(detectedHeaders);

    // Smart auto-detection for column mappings
    let foundId = "";
    let foundName = "";
    let foundFinal = "";
    const assessments: Array<{ name: string; maxScore: number }> = [];

    detectedHeaders.forEach((h) => {
      const lower = h.toLowerCase();
      if (!foundId && (lower.includes("student id") || lower.includes("student number") || lower === "id" || lower === "sn")) {
        foundId = h;
      } else if (!foundName && (lower.includes("name") || lower.includes("student name"))) {
        foundName = h;
      } else if (!foundFinal && (lower.includes("final") || lower.includes("grade") || lower.includes("average") || lower.includes("total"))) {
        foundFinal = h;
      } else if (h.length > 0) {
        // Assume other columns are assessment columns
        // Try to parse max score in parentheses, e.g. "Quiz 1 (50)"
        let maxScore = 100;
        const match = h.match(/\((\d+)\)/);
        if (match) {
          maxScore = parseInt(match[1], 10);
        }
        assessments.push({ name: h, maxScore });
      }
    });

    setStudentIdCol(foundId);
    setStudentNameCol(foundName);
    setFinalGradeCol(foundFinal);
    setAssessmentCols(assessments);

    setCurrentStep(3);
  };

  // Step 3 -> Step 4: Run Validation Engine
  const proceedToValidation = () => {
    if (!studentIdCol) {
      toast({
        type: "error",
        title: "Required Mapping Missing",
        message: "You must map the Student ID column to proceed.",
      });
      return;
    }

    const idColIdx = headers.indexOf(studentIdCol);
    const nameColIdx = studentNameCol ? headers.indexOf(studentNameCol) : -1;
    const finalColIdx = finalGradeCol ? headers.indexOf(finalGradeCol) : -1;

    const dataRows = rawRows.slice(headerRowIndex + 1);
    const issues: ValidationIssue[] = [];
    const seenIds = new Set<string>();

    dataRows.forEach((row, idx) => {
      const rowNum = headerRowIndex + 2 + idx;
      if (!row || row.length === 0 || row.every((c) => !c)) return; // Ignore blank rows

      const idVal = row[idColIdx] ? String(row[idColIdx]).trim() : "";

      // 1. Missing Student ID
      if (!idVal) {
        issues.push({
          row: rowNum,
          type: "error",
          field: "Student ID",
          message: "Missing Student ID. Row will be skipped.",
          value: "Empty",
        });
      } else {
        // 2. Duplicate Student ID
        if (seenIds.has(idVal)) {
          issues.push({
            row: rowNum,
            type: "error",
            field: "Student ID",
            message: `Duplicate Student ID '${idVal}' found. Later row will overwrite earlier row.`,
            value: idVal,
          });
        }
        seenIds.add(idVal);
      }

      // 3. Assessment score range & type checks
      assessmentCols.forEach((ass) => {
        const colIdx = headers.indexOf(ass.name);
        if (colIdx >= 0) {
          const rawScore = row[colIdx];
          if (rawScore !== undefined && rawScore !== null && String(rawScore).trim() !== "") {
            const num = Number(rawScore);
            if (isNaN(num)) {
              issues.push({
                row: rowNum,
                type: "warning",
                field: ass.name,
                message: `Non-numeric value '${rawScore}' detected. Will be marked as NOT_RECORDED.`,
                value: rawScore,
              });
            } else if (num < 0 || num > ass.maxScore) {
              issues.push({
                row: rowNum,
                type: "warning",
                field: ass.name,
                message: `Score ${num} exceeds configured max score (${ass.maxScore}).`,
                value: num,
              });
            }
          }
        }
      });
    });

    setValidationIssues(issues);
    setHasErrors(issues.some((i) => i.type === "error"));
    setCurrentStep(4);
  };

  // Download validation error report as CSV
  const handleDownloadErrorReport = () => {
    if (validationIssues.length === 0) return;
    const csvRows = [
      ["Row Number", "Issue Severity", "Field Name", "Detected Value", "Description"],
      ...validationIssues.map((iss) => [iss.row, iss.type.toUpperCase(), iss.field, `"${iss.value}"`, `"${iss.message}"`]),
    ];
    const csvContent = csvRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Import_Validation_Report_${section?.sectionCode || "Section"}.csv`;
    a.click();
  };

  // Step 5: Prepare payload
  const getPreparedPayload = () => {
    const idColIdx = headers.indexOf(studentIdCol);
    const nameColIdx = studentNameCol ? headers.indexOf(studentNameCol) : -1;
    const finalColIdx = finalGradeCol ? headers.indexOf(finalGradeCol) : -1;

    const dataRows = rawRows.slice(headerRowIndex + 1);
    const rowsPayload: any[] = [];

    dataRows.forEach((row) => {
      if (!row || row.length === 0 || row.every((c) => !c)) return;
      const studentNumber = row[idColIdx] ? String(row[idColIdx]).trim() : "";
      if (!studentNumber) return; // skip missing ID

      const displayName = nameColIdx >= 0 && row[nameColIdx] ? String(row[nameColIdx]).trim() : `Student ${studentNumber}`;
      const finalGrade = finalColIdx >= 0 && row[finalColIdx] ? String(row[finalColIdx]).trim() : null;

      const scores: Record<string, number | null> = {};
      assessmentCols.forEach((ass) => {
        const colIdx = headers.indexOf(ass.name);
        if (colIdx >= 0) {
          const rawScore = row[colIdx];
          const num = Number(rawScore);
          scores[ass.name] = !isNaN(num) && rawScore !== undefined && rawScore !== "" ? num : null;
        }
      });

      rowsPayload.push({
        studentNumber,
        displayName,
        finalGrade,
        scores,
      });
    });

    return {
      fileName: file?.name || "gradebook.xlsx",
      gradeItems: assessmentCols,
      rows: rowsPayload,
      errorSummary: validationIssues.length > 0 ? `${validationIssues.length} warnings/errors detected` : null,
    };
  };

  // Step 6: Commit import to DB
  const handleCommitImport = async () => {
    setIsSaving(true);
    try {
      const payload = getPreparedPayload();
      const res = await fetch(`/api/professor/sections/${sectionId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit import.");

      setImportSummary({
        created: data.createdCount,
        updated: data.updatedCount,
        skipped: data.skippedCount,
      });

      toast({
        type: "success",
        title: "Import Saved as Draft",
        message: `Successfully processed ${payload.rows.length} records. Section remains in draft until published.`,
      });

      setCurrentStep(6);
    } catch (err: any) {
      toast({ type: "error", title: "Import Failed", message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    "Upload",
    "Select Sheet & Header",
    "Map Columns",
    "Validate Data",
    "Review Changes",
    "Saved as Draft",
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={`/professor/sections/${sectionId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Section Gradebook</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            6-Step Guided Import Wizard
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Import Excel / CSV Gradebook
          </h1>
          {section && (
            <p className="text-xs text-slate-500 mt-0.5">
              Target Section: <strong className="text-slate-900">{section.sectionCode}</strong> &bull; {section.subjectName}
            </p>
          )}
        </div>
      </div>

      {/* Step Progress Indicators */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
          {steps.map((st, i) => {
            const stepNum = i + 1;
            const isDone = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;
            return (
              <div
                key={st}
                className={`p-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                  isCurrent
                    ? "bg-slate-900 text-white font-semibold shadow-sm"
                    : isDone
                    ? "bg-emerald-50 text-emerald-800 font-medium"
                    : "text-slate-400 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] mb-0.5">
                  {isDone ? <Check className="w-3 h-3 text-emerald-600" /> : <span>Step {stepNum}</span>}
                </div>
                <span className="text-[11px] truncate max-w-full">{st}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Upload File */}
      {currentStep === 1 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Step 1 — Upload Spreadsheet File</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Upload your Excel (.xlsx, .xls) or CSV gradebook. Macro execution is disabled for safety.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors bg-slate-50/50">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <div className="text-sm font-semibold text-slate-900">
                Drag and drop your spreadsheet here, or browse
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Supports .xlsx, .xls, and .csv files up to 15MB.
              </p>
              <input
                type="file"
                id="fileUpload"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="fileUpload">
                <Button type="button" size="sm" variant="outline" className="cursor-pointer">
                  Select File from Computer
                </Button>
              </label>

              {file && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg inline-flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              )}
            </div>

            {/* Test Samples Box */}
            <div className="rounded-xl bg-teal-50/70 border border-teal-200/80 p-4">
              <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-teal-700" />
                Quick Test Sample Sheets
              </h4>
              <p className="text-xs text-teal-800 mb-3 leading-relaxed">
                Want to test the 6-step import wizard immediately? Load one of the pre-made test spreadsheets:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleLoadSample("/samples/sample_cs101_gradebook.xlsx", "sample_cs101_gradebook.xlsx")}
                  className="text-xs bg-white text-teal-900 border-teal-300 hover:bg-teal-100"
                >
                  Load Clean Gradebook (8 students)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleLoadSample("/samples/sample_with_validation_errors.xlsx", "sample_with_validation_errors.xlsx")
                  }
                  className="text-xs bg-white text-teal-900 border-teal-300 hover:bg-teal-100"
                >
                  Load Gradebook with Errors (Test Validation)
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button
              size="sm"
              disabled={!file || !workbook}
              onClick={() => setCurrentStep(2)}
              className="gap-1.5 font-semibold"
            >
              <span>Continue to Sheet Selection</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: Select Sheet & Header */}
      {currentStep === 2 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">
              Step 2 — Select Worksheet & Identify Header Row
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Pick the target tab from your workbook and click on the row containing column headings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sheet Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select Worksheet:
              </label>
              <div className="flex flex-wrap gap-2">
                {sheetNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSheetChange(name)}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all ${
                      selectedSheet === name
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Formula warning if detected */}
            {formulaWarning && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Excel Formula Detected: </strong>
                  Browser libraries import cached calculated values. Please ensure you saved your file in Excel after any formula changes.
                </div>
              </div>
            )}

            {/* Table preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Click a row to select it as the Header Row:</span>
                <span className="font-semibold text-slate-900">Current Header: Row {headerRowIndex + 1}</span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-72">
                <table className="w-full text-xs text-left divide-y divide-slate-100">
                  <tbody className="divide-y divide-slate-100">
                    {rawRows.slice(0, 10).map((row, idx) => {
                      const isHeader = idx === headerRowIndex;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setHeaderRowIndex(idx)}
                          className={`cursor-pointer transition-colors ${
                            isHeader
                              ? "bg-slate-900 text-white font-bold"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <td className="px-3 py-2 w-16 text-center font-mono opacity-60 text-[10px]">
                            {isHeader ? "HEADER" : `R${idx + 1}`}
                          </td>
                          {row.slice(0, 8).map((cell: any, cIdx: number) => (
                            <td key={cIdx} className="px-3 py-2 truncate max-w-[120px]">
                              {String(cell || "")}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button size="sm" onClick={proceedToMapping} className="gap-1.5 font-semibold">
              <span>Confirm Header & Map Columns</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: Map Columns */}
      {currentStep === 3 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Step 3 — Map Columns</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Confirm which columns correspond to Student ID, Name, Assessment columns, and Final Grade.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Student ID */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Student ID (Required) *
                </label>
                <select
                  value={studentIdCol}
                  onChange={(e) => setStudentIdCol(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Unique identifier per student.</p>
              </div>

              {/* Student Name */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Student Name (Recommended)
                </label>
                <select
                  value={studentNameCol}
                  onChange={(e) => setStudentNameCol(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- None / Do not import --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Full student display name.</p>
              </div>

              {/* Final Grade */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                  Final Grade (Optional)
                </label>
                <select
                  value={finalGradeCol}
                  onChange={(e) => setFinalGradeCol(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- None / Calculate later --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">Pre-computed overall course grade.</p>
              </div>
            </div>

            {/* Assessment Columns */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Assessment Columns ({assessmentCols.length})
                </h4>
                <span className="text-[11px] text-slate-500">Specify maximum score per item</span>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {assessmentCols.map((ass, i) => (
                  <div key={i} className="p-3 flex items-center justify-between gap-4 text-xs">
                    <span className="font-semibold text-slate-900 truncate flex-1">{ass.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">Max Score:</span>
                      <input
                        type="number"
                        min="1"
                        value={ass.maxScore}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 100;
                          const copy = [...assessmentCols];
                          copy[i].maxScore = val;
                          setAssessmentCols(copy);
                        }}
                        className="w-20 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-900 text-right font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(2)}>
              Back
            </Button>
            <Button size="sm" onClick={proceedToValidation} className="gap-1.5 font-semibold">
              <span>Validate Spreadsheet</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: Validation Engine */}
      {currentStep === 4 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Step 4 — Validation & Error Detection
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  System verifies duplicate identifiers, missing keys, and out-of-range values.
                </CardDescription>
              </div>
              {validationIssues.length > 0 && (
                <Button size="sm" variant="outline" onClick={handleDownloadErrorReport} className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report CSV</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationIssues.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm">All Records Passed Validation!</h4>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  No duplicate IDs, missing fields, or abnormal score formats were detected. Ready to proceed to review.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                  <span>
                    Detected <strong>{validationIssues.length} issues</strong> (
                    {validationIssues.filter((i) => i.type === "error").length} errors,{" "}
                    {validationIssues.filter((i) => i.type === "warning").length} warnings).
                  </span>
                  <span className="text-[11px] text-amber-800">Invalid rows will be skipped safely.</span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-64">
                  <table className="w-full text-xs text-left divide-y divide-slate-100">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Row</th>
                        <th className="px-3 py-2">Severity</th>
                        <th className="px-3 py-2">Field</th>
                        <th className="px-3 py-2">Detected Value</th>
                        <th className="px-3 py-2">Issue Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validationIssues.map((iss, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-slate-500">Row {iss.row}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                iss.type === "error"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {iss.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">{iss.field}</td>
                          <td className="px-3 py-2 font-mono text-slate-600 truncate max-w-[120px]">
                            {String(iss.value)}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{iss.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(3)}>
              Back
            </Button>
            <Button size="sm" onClick={() => setCurrentStep(5)} className="gap-1.5 font-semibold">
              <span>Review Changes</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 5: Review Changes */}
      {currentStep === 5 && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900">Step 5 — Review Changes & Diff</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Confirm the students and assessment marks to be committed as Draft.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const payload = getPreparedPayload();
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-2xl font-bold text-slate-900">{payload.rows.length}</div>
                      <div className="text-xs text-slate-500 mt-1">Valid Records</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-2xl font-bold text-slate-900">{assessmentCols.length}</div>
                      <div className="text-xs text-slate-500 mt-1">Assessment Items</div>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="text-2xl font-bold text-slate-900">
                        {validationIssues.filter((i) => i.type === "error").length}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">Skipped Bad Rows</div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60">
                    <table className="w-full text-xs text-left divide-y divide-slate-100">
                      <thead className="bg-slate-100 font-semibold text-slate-700">
                        <tr>
                          <th className="px-3 py-2">Student ID</th>
                          <th className="px-3 py-2">Name</th>
                          {assessmentCols.map((ass) => (
                            <th key={ass.name} className="px-3 py-2 text-right">
                              {ass.name}
                            </th>
                          ))}
                          <th className="px-3 py-2 text-right">Final Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payload.rows.slice(0, 10).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-medium text-slate-900">{r.studentNumber}</td>
                            <td className="px-3 py-2 text-slate-900">{r.displayName}</td>
                            {assessmentCols.map((ass) => (
                              <td key={ass.name} className="px-3 py-2 text-right font-mono text-slate-700">
                                {r.scores[ass.name] !== null ? r.scores[ass.name] : "—"}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                              {r.finalGrade || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Note: Submitting will save these records into section <strong>{section?.sectionCode}</strong> as a <strong>DRAFT</strong>. Students will NOT see these marks until you review the gradebook and click <strong>Publish</strong>.
                  </p>
                </div>
              );
            })()}
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Button size="sm" variant="outline" onClick={() => setCurrentStep(4)}>
              Back
            </Button>
            <Button
              size="sm"
              onClick={handleCommitImport}
              isLoading={isSaving}
              className="gap-1.5 font-semibold bg-slate-900 text-white"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>Confirm & Save as Draft</span>
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 6: Saved as Draft Confirmation */}
      {currentStep === 6 && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 shadow-sm p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Gradebook Saved as Draft</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Your spreadsheet marks have been securely imported and linked to section{" "}
            <strong>{section?.sectionCode}</strong>. Consistent with the intentional publishing principle, records remain private drafts.
          </p>

          {importSummary && (
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-center pt-2">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="text-lg font-bold text-slate-900">{importSummary.created}</div>
                <div className="text-[11px] text-slate-500">Created</div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="text-lg font-bold text-slate-900">{importSummary.updated}</div>
                <div className="text-[11px] text-slate-500">Updated</div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <div className="text-lg font-bold text-slate-900">{importSummary.skipped}</div>
                <div className="text-[11px] text-slate-500">Skipped</div>
              </div>
            </div>
          )}

          <div className="pt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href={`/professor/sections/${sectionId}`}>
              <Button size="md" className="gap-2 shadow-sm font-semibold">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Open Section Gradebook</span>
              </Button>
            </Link>

            <Link href={`/professor/sections/${sectionId}/credentials`}>
              <Button size="md" variant="outline" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                <span>Manage Student Credentials</span>
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
