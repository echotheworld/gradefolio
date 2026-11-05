"use client";

import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Users,
  BookOpen,
  ArrowRight,
  RefreshCw,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PreviewStudent {
  studentNumber: string;
  displayName: string;
  midtermEquivalent: string | null;
  finalEquivalent: string | null;
  remarks: string | null;
}

interface SectionPreview {
  sheetName: string;
  sheetIndex?: number;
  sectionCode: string;
  sectionName: string;
  subjectCode: string;
  subjectTitle: string;
  academicYear: string;
  term: string;
  units: number;
  studentCount: number;
  assessmentCount: number;
  isEmpty: boolean;
  isValid: boolean;
  matchedExistingSection: {
    id: string;
    sectionCode: string;
    sectionName: string;
    subjectName: string;
    enrolledCount: number;
  } | null;
  recommendedAction: "CREATE" | "UPDATE";
  studentsPreview: PreviewStudent[];
}

interface PreviewData {
  success: boolean;
  fileName: string;
  coverPageFound: boolean;
  facultyName: string;
  academicYear: string;
  term: string;
  department: string;
  totalSections: number;
  activeSectionsCount: number;
  totalStudents: number;
  sections: SectionPreview[];
}

interface MasterWorkbookImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MasterWorkbookImportModal({
  isOpen,
  onClose,
  onSuccess,
}: MasterWorkbookImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isUsingSample, setIsUsingSample] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [importResult, setImportResult] = useState<{
    message: string;
    importedCount: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setIsUsingSample(false);
    setIsParsing(false);
    setIsImporting(false);
    setError(null);
    setPreviewData(null);
    setSelectedSheets([]);
    setExpandedSection(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const requestPreview = async (selectedFile: File | null, useSample: boolean) => {
    setIsParsing(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("mode", "preview");

      if (useSample) {
        formData.append("useSample", "true");
      } else if (selectedFile) {
        formData.append("file", selectedFile);
      } else {
        throw new Error("No file selected.");
      }

      const res = await fetch("/api/professor/sections/batch-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to parse workbook");
      }

      setPreviewData(data);

      // By default, select all active sections that have students
      const activeSheetNames = (data.sections as SectionPreview[])
        .filter((s) => !s.isEmpty && s.studentCount > 0)
        .map((s) => s.sheetName);
      setSelectedSheets(activeSheetNames);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while parsing the file.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setIsUsingSample(false);
      requestPreview(selected, false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.name.endsWith(".xlsx") || dropped.name.endsWith(".xls"))) {
      setFile(dropped);
      setIsUsingSample(false);
      requestPreview(dropped, false);
    }
  };

  const handleUseSample = () => {
    setFile(null);
    setIsUsingSample(true);
    requestPreview(null, true);
  };

  const toggleSelectSheet = (sheetName: string) => {
    setSelectedSheets((prev) =>
      prev.includes(sheetName) ? prev.filter((s) => s !== sheetName) : [...prev, sheetName]
    );
  };

  const toggleSelectAll = () => {
    if (!previewData) return;
    const activeSheetNames = previewData.sections
      .filter((s) => !s.isEmpty && s.studentCount > 0)
      .map((s) => s.sheetName);

    if (selectedSheets.length === activeSheetNames.length) {
      setSelectedSheets([]);
    } else {
      setSelectedSheets(activeSheetNames);
    }
  };

  const handleExecuteImport = async () => {
    if (selectedSheets.length === 0) {
      setError("Please select at least one course section to import.");
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("mode", "execute");
      formData.append("selectedSheets", JSON.stringify(selectedSheets));

      if (isUsingSample) {
        formData.append("useSample", "true");
      } else if (file) {
        formData.append("file", file);
      } else {
        throw new Error("No file available for import.");
      }

      const res = await fetch("/api/professor/sections/batch-import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete batch section import.");
      }

      setImportResult({
        message: data.message || "Batch section import completed successfully!",
        importedCount: data.importedCount || selectedSheets.length,
      });

      // Refresh dashboard background data
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to import selected sections.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Master Workbook Import
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Multi-Section
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your institutional master Excel workbook to create or sync all your course sections at once.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto grow">
          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="grow">
                <p className="font-semibold">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-rose-500 hover:text-rose-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {importResult ? (
            <div className="text-center py-8 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-extrabold text-slate-900">
                  Import & Sync Complete!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                  {importResult.message}
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl max-w-sm mx-auto text-xs text-slate-600 space-y-1 text-left">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span>Sections Imported:</span>
                  <span className="font-mono text-emerald-600 font-bold">
                    {importResult.importedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Status:</span>
                  <span className="text-amber-600 font-medium">Ready for Review (Draft)</span>
                </div>
              </div>
              <div className="pt-3 flex justify-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleClose}
                  className="font-bold text-xs gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View on Dashboard</span>
                </Button>
              </div>
            </div>
          ) : !previewData ? (
            /* STEP 1: DROPZONE / FILE SELECTION */
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/20 rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors shadow-2xs">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to browse or drag and drop your Master Class Record
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepts official multi-sheet Excel files (<span className="font-mono">.xlsx</span>, <span className="font-mono">.xls</span>)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cover Page & Sections</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Reads the Cover Page directory and matches section sheets named by Section Name (<span className="font-mono">ACT261</span>) or Sheet Number (<span className="font-mono">1, 2, 3</span>).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Safe Account Sync</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Generates secure student passwords for new enrollments while keeping existing student credentials intact.
                  </p>
                </div>
              </div>

              {/* Sample Class Record Test Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Want to test without a file?</span>
                <button
                  type="button"
                  onClick={handleUseSample}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Inspect Template (class_record.xlsx)</span>
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: MULTI-SECTION PREVIEW & SELECTION */
            <div className="space-y-4">
              {/* Metadata Banner */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Workbook Summary
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {previewData.facultyName || "Faculty"} &bull; {previewData.department || "Academic Department"}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {previewData.term} SY {previewData.academicYear} &bull; {previewData.fileName}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800">
                      {previewData.activeSectionsCount} Active Sections
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {previewData.totalStudents} Total Students
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Upload Different</span>
                  </Button>
                </div>
              </div>

              {/* Section Selection Bar */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="selectAllCheckbox"
                    checked={
                      selectedSheets.length > 0 &&
                      selectedSheets.length ===
                        previewData.sections.filter((s) => !s.isEmpty && s.studentCount > 0).length
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <label
                    htmlFor="selectAllCheckbox"
                    className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    Select All Active Sections ({selectedSheets.length} of{" "}
                    {previewData.sections.filter((s) => !s.isEmpty && s.studentCount > 0).length} selected)
                  </label>
                </div>

                <span className="text-[11px] text-slate-400">
                  {previewData.sections.filter((s) => s.isEmpty).length} empty sheets excluded
                </span>
              </div>

              {/* Section Cards List */}
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {previewData.sections.map((sec) => {
                  const isSelected = selectedSheets.includes(sec.sheetName);
                  const isExpanded = expandedSection === sec.sheetName;

                  return (
                    <div
                      key={sec.sheetName}
                      className={`rounded-xl border transition-all ${
                        sec.isEmpty
                          ? "bg-slate-50/60 border-slate-200/60 opacity-60"
                          : isSelected
                          ? "bg-blue-50/30 border-blue-300 shadow-2xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="p-3.5 flex items-start gap-3">
                        <input
                          type="checkbox"
                          disabled={sec.isEmpty}
                          checked={isSelected}
                          onChange={() => toggleSelectSheet(sec.sheetName)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-1 cursor-pointer disabled:cursor-not-allowed"
                        />

                        <div className="grow min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {sec.sectionName}
                            </span>

                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                              Sheet: {sec.sheetName}
                            </span>

                            {sec.isEmpty ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Empty Sheet (0 Students)
                              </span>
                            ) : sec.matchedExistingSection ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                Sync with Existing: {sec.matchedExistingSection.sectionCode}
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                New Section
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-700 font-medium mt-1 truncate">
                            {sec.subjectCode ? `${sec.subjectCode} - ` : ""}
                            {sec.subjectTitle}
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <Users className="w-3 h-3 text-blue-600" />
                              {sec.studentCount} Students
                            </span>
                            <span>&bull;</span>
                            <span>{sec.assessmentCount} Assessments</span>
                            <span>&bull;</span>
                            <span>{sec.units} Units</span>
                          </div>
                        </div>

                        {!sec.isEmpty && sec.studentsPreview.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedSection(isExpanded ? null : sec.sheetName)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title={isExpanded ? "Collapse preview" : "Preview student roster"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expandable Roster Preview */}
                      {isExpanded && sec.studentsPreview.length > 0 && (
                        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            Sample Student Roster Preview ({sec.studentsPreview.length} of {sec.studentCount})
                          </p>
                          <div className="space-y-1">
                            {sec.studentsPreview.map((st, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-200/60 text-slate-700"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-slate-500">
                                    {st.studentNumber}
                                  </span>
                                  <span className="font-medium">{st.displayName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px]">
                                  {st.midtermEquivalent && (
                                    <span className="text-slate-500 font-mono">
                                      Mid: {st.midtermEquivalent}
                                    </span>
                                  )}
                                  {st.finalEquivalent && (
                                    <span className="font-bold text-blue-700 font-mono">
                                      Fin: {st.finalEquivalent}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={isParsing || isImporting}
            className="text-xs"
          >
            {importResult ? "Close" : "Cancel"}
          </Button>

          {previewData && !importResult && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {selectedSheets.length} section{selectedSheets.length === 1 ? "" : "s"} ready
              </span>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleExecuteImport}
                disabled={selectedSheets.length === 0 || isImporting}
                className="font-bold text-xs gap-2 shadow-xs"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Importing Sections...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Import & Sync {selectedSheets.length} Sections</span>
                    <ArrowRight className="w-3.5 h-3.5 text-white/80" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
