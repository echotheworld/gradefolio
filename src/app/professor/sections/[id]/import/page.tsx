"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  AlertCircle,
  Download,
  Info,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Check,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  isClassRecordTemplate,
  parseClassRecordTemplate,
  calculateGradeEquivalent,
  ClassRecordParseResult,
} from "@/lib/class-record-parser";

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

  // Streamlined 2-Step Flow:
  // Step 1: Upload Worksheet
  // Step 2: Validate Data & Save as Draft -> Boom!
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [section, setSection] = useState<{ id: string; sectionName: string; sectionCode: string; subjectName: string } | null>(null);

  // File & Parser State
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed Data & Validation
  const [parsedData, setParsedData] = useState<ClassRecordParseResult | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [hasErrors, setHasErrors] = useState(false);

  // Load section info
  useEffect(() => {
    fetch(`/api/professor/sections/${sectionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.section) {
          setSection({
            id: data.section.id,
            sectionName: data.section.sectionName || data.section.sectionCode,
            sectionCode: data.section.sectionCode,
            subjectName: data.section.subjectName,
          });
        }
      })
      .catch((err) => console.error("Error loading section:", err));
  }, [sectionId]);

  // Execute high-precision parsing & validation
  const processSpreadsheet = (selectedFile: File) => {
    if (selectedFile.size > 15 * 1024 * 1024) {
      toast({ type: "error", title: "File Too Large", message: "Maximum file size is 15MB." });
      return;
    }

    setIsProcessing(true);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength === 0) {
          throw new Error("The selected file is empty.");
        }

        const wb = XLSX.read(buffer, { type: "array", cellFormula: true, cellDates: true });
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error("Workbook contains no readable worksheets.");
        }

        // Target 'Input Here' or first sheet
        let activeSheet = wb.Sheets["Input Here"] || wb.Sheets[wb.SheetNames[0]];
        for (const sName of wb.SheetNames) {
          if (isClassRecordTemplate(wb.Sheets[sName], wb)) {
            activeSheet = wb.Sheets[sName];
            break;
          }
        }

        const result = parseClassRecordTemplate(activeSheet, wb);
        setParsedData(result);

        // Run comprehensive validation
        const issues: ValidationIssue[] = [];
        const seenIds = new Set<string>();

        result.students.forEach((st, idx) => {
          const rowNum = 13 + idx;
          if (!st.studentNumber) {
            issues.push({
              row: rowNum,
              type: "error",
              field: "Student ID",
              message: "Missing student ID number.",
              value: st.displayName,
            });
          } else if (seenIds.has(st.studentNumber)) {
            issues.push({
              row: rowNum,
              type: "warning",
              field: "Student ID",
              message: `Duplicate student ID detected: ${st.studentNumber}`,
              value: st.studentNumber,
            });
          } else {
            seenIds.add(st.studentNumber);
          }

          if (!st.displayName) {
            issues.push({
              row: rowNum,
              type: "warning",
              field: "Student Name",
              message: "Student name is blank.",
              value: st.studentNumber,
            });
          }
        });

        setValidationIssues(issues);
        setHasErrors(issues.some((i) => i.type === "error"));
        setCurrentStep(2);

        toast({
          type: "success",
          title: "Workbook Parsed & Validated",
          message: `Detected ${result.students.length} students and ${result.assessmentItems.length} active assessment columns.`,
        });
      } catch (err: any) {
        console.error("Spreadsheet parse error:", err);
        toast({
          type: "error",
          title: "Parse Error",
          message: err.message || "Failed to parse workbook.",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      toast({ type: "error", title: "Read Error", message: "Failed to read the file." });
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processSpreadsheet(selected);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      processSpreadsheet(dropped);
    }
  };

  // Export validation report as CSV
  const handleDownloadErrorReport = () => {
    if (validationIssues.length === 0) return;
    const csvRows = [
      ["Row Number", "Issue Severity", "Field Name", "Detected Value", "Description"],
      ...validationIssues.map((iss) => [
        iss.row,
        iss.type.toUpperCase(),
        iss.field,
        `"${iss.value || ""}"`,
        `"${iss.message}"`,
      ]),
    ];
    const csvContent = csvRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Import_Validation_Report_${section?.sectionCode || "Section"}.csv`;
    a.click();
  };

  // Save as Draft (Boom!)
  const handleSaveAsDraft = async () => {
    if (!parsedData || parsedData.students.length === 0) {
      toast({ type: "error", title: "No Data", message: "No valid students to import." });
      return;
    }

    setIsSaving(true);
    try {
      let fileBase64: string | null = null;
      if (file) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          fileBase64 = btoa(binary);
        } catch (err) {
          console.error("Failed to encode uploaded file:", err);
        }
      }

      const payload = {
        fileName: file?.name || "class_record_template.xlsx",
        fileBase64,
        gradeItems: parsedData.assessmentItems.map((ass) => {
          let categoryWithPeriod: string = ass.category;
          if (ass.category === "Class Participation") {
            categoryWithPeriod =
              ass.period === "Midterms"
                ? "Class Participation - Midterms (Week 1 to Week 7)"
                : "Class Participation - Post Midterms (Week 8 to Week 13)";
          } else if (ass.category === "Enabling Assessment") {
            categoryWithPeriod =
              ass.period === "Midterms"
                ? "Enabling Activities - Midterms (Week 1 to Week 7)"
                : "Enabling Activities - Post Midterms (Week 8 to Week 13)";
          }
          return {
            name: ass.name,
            category: categoryWithPeriod,
            maxScore: ass.hps > 0 ? ass.hps : 100,
          };
        }),
        rows: parsedData.students.map((st) => {
          const R_MSG = "Grade is unavaible to view. Kindly contact your professor for this matter. ";

          const isR = (eq: string | null, pct: number | null) => {
            if (eq) {
              const s = eq.trim().toUpperCase();
              if (
                s === "R" ||
                s === "REPEAT" ||
                s.startsWith("R ") ||
                s.startsWith("R(") ||
                s.startsWith("R-") ||
                s.includes("KINDLY CONTACT") ||
                s.includes("UNAVAILABLE") ||
                s.includes("UNAVAIBLE")
              ) {
                return true;
              }
            }
            if (pct !== null && pct !== undefined && !isNaN(pct) && pct < 60) return true;
            return false;
          };

          const formatR = (pct: number | null) => {
            if (pct !== null && pct !== undefined && !isNaN(pct)) {
              return `R (${pct.toFixed(2)}%)`;
            }
            return "R";
          };

          const midStr = isR(st.midtermEquivalent, st.midtermPercentage)
            ? formatR(st.midtermPercentage)
            : st.midtermEquivalent && st.midtermPercentage !== null
            ? `${st.midtermEquivalent} (${st.midtermPercentage}%)`
            : st.midtermPercentage !== null
            ? (st.midtermPercentage < 60 ? formatR(st.midtermPercentage) : `${calculateGradeEquivalent(st.midtermPercentage)} (${st.midtermPercentage}%)`)
            : (st.midtermEquivalent || null);

          const finStr = isR(st.finalEquivalent, st.finalPercentage)
            ? formatR(st.finalPercentage)
            : st.finalEquivalent && st.finalPercentage !== null
            ? `${st.finalEquivalent} (${st.finalPercentage}%)`
            : st.finalPercentage !== null
            ? (st.finalPercentage < 60 ? formatR(st.finalPercentage) : `${calculateGradeEquivalent(st.finalPercentage)} (${st.finalPercentage}%)`)
            : (st.finalEquivalent || null);

          const remarksParts: string[] = [];
          if (midStr) {
            remarksParts.push(`Midterm: ${midStr}`);
          }
          if (st.remarks && !isR(st.remarks, null)) {
            remarksParts.push(st.remarks);
          }
          const remarksStr = remarksParts.length > 0 ? remarksParts.join(" | ") : null;

          return {
            studentNumber: st.studentNumber,
            displayName: st.displayName,
            finalGrade: finStr,
            midtermGrade: midStr,
            remarks: remarksStr,
            scores: st.scores,
          };
        }),
        errorSummary:
          validationIssues.length > 0
            ? `${validationIssues.length} warnings/notices detected`
            : null,
      };

      const res = await fetch(`/api/professor/sections/${sectionId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to commit import.");

      toast({
        type: "success",
        title: "Boom! Section Saved as Draft",
        message: `Successfully imported ${data.createdCount + data.updatedCount} student records with ${data.totalGradeRecords || 0} scores.`,
      });

      // Redirect immediately to section dashboard
      router.push(`/professor/sections/${sectionId}`);
      router.refresh();
    } catch (err: any) {
      console.error("Save as draft error:", err);
      toast({ type: "error", title: "Import Failed", message: err.message });
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Header */}
      <div>
        <Link
          href={`/professor/sections/${sectionId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Section Gradebook</span>
        </Link>
      </div>

      {/* Main Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            Fast Streamlined Importer
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Import Class Record
          </h1>
          {section && (
            <p className="text-xs text-slate-500 mt-1">
              Target Section: <strong className="text-slate-900 font-semibold">{section.sectionName || section.sectionCode}</strong> &bull; {section.subjectName}
            </p>
          )}
        </div>

        {/* 2-Step Progress Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentStep === 1
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            <span>1. Upload</span>
            {currentStep > 1 && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </div>

          <span className="text-slate-300 font-bold">&rarr;</span>

          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentStep === 2
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            <span>2. Validate &amp; Save as Draft</span>
          </div>
        </div>
      </div>

      {/* STEP 1: UPLOAD WORKSHEET */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Official Template Banner */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Official Class Record Template
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    Template
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  Row 11 (<code className="font-mono text-slate-800">G11..AH11</code>) defines active assessment titles; Row 12 defines HPS. Columns without titles are automatically omitted.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a href="/template.xlsx" download="class_record_template.xlsx">
                <Button size="sm" variant="primary" className="gap-1.5 text-xs shadow-xs font-semibold">
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download Template</span>
                </Button>
              </a>
            </div>
          </div>

          {/* Drag & Drop File Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50/60 scale-[1.01]"
                : "border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/60"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />

            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4 border border-slate-200">
              {isProcessing ? (
                <div className="animate-spin w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full"></div>
              ) : (
                <Upload className="w-7 h-7 text-slate-600" />
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {isProcessing ? "Analyzing & Validating Worksheet..." : "Drag and drop your gradebook file here"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Supports official <code className="font-mono text-slate-800">.xlsx</code> files up to 15MB.
            </p>

            <div className="mt-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="pointer-events-none text-xs font-semibold bg-white"
              >
                <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                Browse Files
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: VALIDATE DATA & SAVE AS DRAFT */}
      {currentStep === 2 && parsedData && (
        <div className="space-y-6">
          {/* File Header Pill */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-blue-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs truncate max-w-sm">
                  {file?.name || "class_record_template.xlsx"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {file ? `${(file.size / 1024).toFixed(1)} KB &bull; ` : ""}
                  Worksheet &ldquo;{parsedData.metadata.subjectTitle || "Input Here"}&rdquo;
                </div>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCurrentStep(1);
                setFile(null);
                setParsedData(null);
              }}
              className="gap-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Upload Different File</span>
            </Button>
          </div>

          {/* Validation Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Status Card */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Validation
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-sm font-bold text-emerald-950">
                {hasErrors ? "Errors Detected" : "Verified & Clean"}
              </div>
              <div className="text-[10px] text-emerald-800">
                {validationIssues.length === 0 ? "0 issues found" : `${validationIssues.length} notice(s)`}
              </div>
            </div>

            {/* Students Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Students
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {parsedData.students.length}
              </div>
              <div className="text-[10px] text-slate-500">
                Enrolled records ready to import
              </div>
            </div>

            {/* Assessment Items Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Active Columns
              </span>
              <div className="text-2xl font-bold font-mono text-blue-900">
                {parsedData.assessmentItems.length}
              </div>
              <div className="text-[10px] text-slate-500">
                Titled items in Row 11
              </div>
            </div>

            {/* Weights Card */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Formulas
              </span>
              <div className="text-xs font-bold text-slate-900">
                CP 30% &bull; EA 30%
              </div>
              <div className="text-[10px] text-slate-500">
                MPT 40% (Mid) &bull; MPT/CPT 20% (Fin)
              </div>
            </div>
          </div>

          {/* Validation Notices / Warnings Drawer (if any) */}
          {validationIssues.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-amber-950 text-xs">
                    Validation Notices ({validationIssues.length})
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadErrorReport}
                  className="gap-1 text-[11px] bg-white text-amber-900 border-amber-300 h-7"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Report (CSV)</span>
                </Button>
              </div>

              <div className="max-h-36 overflow-y-auto divide-y divide-amber-200/60 text-xs">
                {validationIssues.slice(0, 10).map((iss, i) => (
                  <div key={i} className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-amber-900 font-mono text-[11px]">Row {iss.row} &bull; {iss.field}</span>
                    <span className="text-amber-800 text-[11px] truncate max-w-md">{iss.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clean Student Roster Preview Table */}
          <Card className="border border-slate-200/90 shadow-xs overflow-hidden rounded-xl bg-white">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Roster Preview</h3>
                <p className="text-xs text-slate-500">
                  Showing first {Math.min(15, parsedData.students.length)} of {parsedData.students.length} students
                </p>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                Row 13 to {12 + parsedData.students.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-5 py-3">Student ID</th>
                    <th className="px-5 py-3">Student Name</th>
                    <th className="px-5 py-3">Midterm Grade</th>
                    <th className="px-5 py-3 font-bold text-blue-900 bg-blue-50/30">Final Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium">
                  {parsedData.students.slice(0, 15).map((st, idx) => {
                    const isMidR =
                      (st.midtermPercentage !== null && st.midtermPercentage < 60) ||
                      (st.midtermEquivalent && st.midtermEquivalent.toUpperCase().startsWith("R"));

                    const midStr = isMidR
                      ? (st.midtermPercentage !== null ? `R (${st.midtermPercentage.toFixed(2)}%)` : "R")
                      : st.midtermEquivalent && st.midtermPercentage !== null
                      ? `${st.midtermEquivalent} (${st.midtermPercentage}%)`
                      : st.midtermPercentage !== null
                      ? `${st.midtermPercentage}%`
                      : "-";

                    const isFinR =
                      (st.finalPercentage !== null && st.finalPercentage < 60) ||
                      (st.finalEquivalent && st.finalEquivalent.toUpperCase().startsWith("R"));

                    const finStr = isFinR
                      ? (st.finalPercentage !== null ? `R (${st.finalPercentage.toFixed(2)}%)` : "R")
                      : st.finalEquivalent && st.finalPercentage !== null
                      ? `${st.finalEquivalent} (${st.finalPercentage}%)`
                      : st.finalPercentage !== null
                      ? `${st.finalPercentage}%`
                      : "-";

                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3 font-mono font-semibold text-slate-800">
                          {st.studentNumber}
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-900">
                          {st.displayName}
                        </td>
                        <td className="px-5 py-3 font-mono text-slate-700">
                          {midStr !== "-" ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded font-semibold text-xs border ${
                              midStr.startsWith("R")
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : "bg-slate-100 text-slate-800 border-slate-200"
                            }`}>
                              {midStr}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-mono font-bold text-blue-900 bg-blue-50/20">
                          {finStr !== "-" ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-xs border ${
                              finStr.startsWith("R")
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : "bg-blue-50 text-blue-900 border-blue-200"
                            }`}>
                              {finStr}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {parsedData.students.length > 15 && (
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500 font-medium">
                + {parsedData.students.length - 15} more student records will be saved
              </div>
            )}
          </Card>

          {/* Action Footer: Save as Draft then Boom! */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-900 text-xs">Ready to Import</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Imports {parsedData.students.length} students and {parsedData.assessmentItems.length} active assessment columns in <strong>Draft</strong> status.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentStep(1);
                  setFile(null);
                  setParsedData(null);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>

              <Button
                size="sm"
                onClick={handleSaveAsDraft}
                isLoading={isSaving}
                className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Save as Draft (Import)</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
