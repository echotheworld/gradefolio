"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UploadCloud,
  FileText,
  Users,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { generateRandomCode } from "@/lib/utils";

interface ParsedStudent {
  index: number;
  studentNumber: string;
  displayName: string;
  course?: string;
  strand?: string;
  gender?: string;
  email?: string;
  status?: string;
  dateEnrolled?: string;
}

interface ScheduleRow {
  day: string;
  time: string;
  roomType: string;
  room: string;
}

export default function CreateSectionPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    subjectName: "",
    subjectCode: "",
    sectionName: "",
    instructor: "",
    offeredTo: "",
    classLimit: "",
    academicYear: "2026-2027",
    term: "Term 1",
    sectionCode: "",
    announcement: "",
    showFinalGrade: true,
    showBreakdown: true,
    showProvisionalNotice: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [codeStatus, setCodeStatus] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
  }>({ checked: false, available: true, message: "" });
  const [error, setError] = useState("");
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);

  // PDF Drag & Drop / Classlist Parsing State
  const [isDragging, setIsDragging] = useState(false);
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("");
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [autoEnroll, setAutoEnroll] = useState(true);
  const [showRosterPreview, setShowRosterPreview] = useState(true);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced check for custom typed section codes
  const verifyCodeAvailability = (codeToTest: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = codeToTest.trim().toUpperCase();
    if (!trimmed) {
      setCodeStatus({ checked: false, available: true, message: "" });
      setIsCheckingCode(false);
      return;
    }

    setIsCheckingCode(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/professor/sections/check-code?code=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setCodeStatus({
            checked: true,
            available: Boolean(data.available),
            message: data.message || (data.available ? "Code is available." : "Code is already in use."),
          });
        }
      } catch (e) {
        console.error("Code verification error:", e);
      } finally {
        setIsCheckingCode(false);
      }
    }, 400);
  };

  // Generate a guaranteed unique, unused section code
  const handleGenerateCode = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/professor/sections/check-code");
      if (res.ok) {
        const data = await res.json();
        setFormData((prev) => ({ ...prev, sectionCode: data.code }));
        setCodeStatus({
          checked: true,
          available: true,
          message: `Code "${data.code}" is unique and available.`,
        });
      } else {
        const fallback = generateRandomCode("");
        setFormData((prev) => ({ ...prev, sectionCode: fallback }));
        setCodeStatus({ checked: false, available: true, message: "" });
      }
    } catch {
      const fallback = generateRandomCode("");
      setFormData((prev) => ({ ...prev, sectionCode: fallback }));
      setCodeStatus({ checked: false, available: true, message: "" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCodeChange = (val: string) => {
    const uppercaseVal = val.toUpperCase();
    setFormData((prev) => ({ ...prev, sectionCode: uppercaseVal }));
    verifyCodeAvailability(uppercaseVal);
  };

  // Process PDF file (either uploaded by user or loaded via sample)
  const processPdfFile = async (fileOrSample: File | "sample") => {
    setIsParsingPdf(true);
    setError("");
    setPdfSuccessMessage("");

    try {
      let res: Response;
      if (fileOrSample === "sample") {
        res = await fetch("/api/professor/sections/parse-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sample: true }),
        });
      } else {
        const fd = new FormData();
        fd.append("file", fileOrSample);
        res = await fetch("/api/professor/sections/parse-pdf", {
          method: "POST",
          body: fd,
        });
      }

      if (!res.ok) {
        let errMsg = "Failed to parse classlist PDF.";
        try {
          const errData = await res.json();
          if (errData.error) errMsg = errData.error;
        } catch {
          errMsg = `Server error (${res.status}). Please check server logs or verify your session.`;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();

      // Auto-populate form metadata
      const { metadata, students, fileName } = data;
      setPdfFileName(fileName || "classlist.pdf");
      setParsedStudents(students || []);
      if (Array.isArray(metadata.schedules)) setSchedules(metadata.schedules);
      setAutoEnroll(true);
      setShowRosterPreview(true);

      const targetCode = metadata.suggestedCode || metadata.sectionName || "";
      setFormData((prev) => ({
        ...prev,
        subjectName: metadata.subjectName || prev.subjectName,
        subjectCode: metadata.subjectCode || prev.subjectCode,
        instructor: metadata.instructor || prev.instructor,
        offeredTo: metadata.offeredTo || prev.offeredTo,
        classLimit:
          metadata.classLimit !== undefined && metadata.classLimit !== null
            ? String(metadata.classLimit)
            : prev.classLimit,
        sectionName: metadata.sectionName || prev.sectionName,
        academicYear: metadata.academicYear || prev.academicYear,
        term: metadata.term || prev.term,
        sectionCode: targetCode,
      }));

      // Check code availability
      if (targetCode) {
        verifyCodeAvailability(targetCode);
      }

      setPdfSuccessMessage(
        `Successfully extracted course "${metadata.subjectName}", section "${metadata.sectionName}", and ${students?.length || 0} enrolled students.`
      );
    } catch (err: any) {
      setError(err?.message || "An error occurred while parsing the classlist PDF.");
    } finally {
      setIsParsingPdf(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.toLowerCase().endsWith(".pdf")) {
        processPdfFile(droppedFile);
      } else {
        setError("Please upload an official classlist in PDF format (.pdf).");
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processPdfFile(e.target.files[0]);
    }
  };

  const handleClearPdf = () => {
    setPdfFileName("");
    setParsedStudents([]);
    setPdfSuccessMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.subjectName.trim() || !formData.sectionName.trim()) {
      setError("Please fill in both the Course Title and Section.");
      return;
    }

    if (codeStatus.checked && !codeStatus.available) {
      setError("The specified Section Code is already in use. Please generate or enter an available code.");
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = {
        ...formData,
        schedules: schedules.filter((s) => s.day || s.time || s.room),
        students: autoEnroll ? parsedStudents : [],
      };

      const res = await fetch("/api/professor/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMsg = "Failed to create section.";
        try {
          const errData = await res.json();
          if (errData.error) errMsg = errData.error;
        } catch {
          errMsg = `Server error (${res.status}). Please check your inputs or try again.`;
        }
        setError(errMsg);
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      router.push(`/professor/sections/${data.section.id}`);
      router.refresh();
    } catch {
      setError("An unexpected network error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/professor"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-[11px] font-mono text-slate-400">Classlist Smart Import v2.0</span>
      </div>

      <Card className="shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wide">
              Official Registrar Integration
            </span>
          </div>
          <CardTitle className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Create Course Section
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Drag and drop your official Registrar Classlist PDF to generate the section and auto-enroll students instantly, or fill out the form manually.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-800 font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* 1. OFFICIAL CLASSLIST PDF DRAG & DROP ZONE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Smart PDF Auto-Fill &amp; Roster Generator</span>
                </label>
                {pdfFileName && (
                  <button
                    type="button"
                    onClick={handleClearPdf}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear Uploaded PDF</span>
                  </button>
                )}
              </div>

              {!pdfFileName ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/70 scale-[1.01] shadow-md"
                      : "border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept=".pdf,application/pdf"
                    className="hidden"
                  />

                  {isParsingPdf ? (
                    <div className="py-4 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                      <p className="text-sm font-bold text-slate-800">
                        Analyzing Official Classlist PDF...
                      </p>
                      <p className="text-xs text-slate-500">
                        Extracting course metadata, subject code, section, and enrolled roster...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Drag &amp; drop official classlist PDF here, or{" "}
                          <span className="text-blue-600 underline underline-offset-2">browse file</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                          Supports Registrar official classlists (e.g. National University, MOA). Everything will be auto-generated.
                        </p>
                      </div>

                      {/* Sample One-Click Pill */}
                      <div className="pt-2 flex items-center justify-center gap-2">
                        <span className="text-[11px] text-slate-400">Want to test it out?</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            processPdfFile("sample");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-slate-700 hover:text-blue-700 shadow-2xs transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          <span>Load Sample Classlist (/SampleOfficialClasslistFetch.pdf)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* PDF Successfully Processed Banner */
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-emerald-950 font-mono truncate max-w-xs sm:max-w-md">
                            {pdfFileName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Parsed
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          {pdfSuccessMessage}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-white text-slate-700 hover:bg-slate-50"
                      >
                        Upload Different PDF
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept=".pdf,application/pdf"
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Quick stats ribbon */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-950 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-700" />
                      <span><strong>{parsedStudents.length}</strong> students extracted</span>
                    </div>
                    <span>&bull;</span>
                    <div>
                      Subject: <strong>{formData.subjectName}</strong>
                    </div>
                    <span>&bull;</span>
                    <div>
                      Section: <strong>{formData.sectionName}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. AUTO-POPULATED / EDITABLE SECTION METADATA */}
            <div className="pt-2 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Section Metadata Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Course Title / Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subjectName}
                    onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                    placeholder="e.g. BAITBUSL: I.T. APPLICATION TOOLS IN BUSINESS"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Section Name / Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sectionName}
                    onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                    placeholder="e.g. ACT261"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Unique Section Access Code *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={formData.sectionCode}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        placeholder="Auto-generated if blank"
                        className={`w-full uppercase font-mono px-3.5 py-2.5 text-sm rounded-lg border transition-all ${
                          codeStatus.checked && !codeStatus.available
                            ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/20"
                            : codeStatus.checked && codeStatus.available
                            ? "border-emerald-400 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/20"
                            : "border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                        }`}
                      />
                      {isCheckingCode && (
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-3 pointer-events-none" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCode}
                      isLoading={isGenerating}
                      className="shrink-0 text-xs gap-1"
                      title="Generate unique, unused section code"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      <span>Randomize</span>
                    </Button>
                  </div>

                  {codeStatus.checked && (
                    <div
                      className={`mt-1.5 text-[11px] font-medium flex items-center gap-1.5 ${
                        codeStatus.available ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {codeStatus.available ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{codeStatus.message}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{codeStatus.message}</span>
                        </>
                      )}
                    </div>
                  )}
                  {!codeStatus.checked && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Students use this code to access their private report.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Term / Semester *
                  </label>
                  <select
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-medium"
                  >
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                    <option value="Midyear / Summer">Midyear / Summer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Academic Year *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    placeholder="2026-2027"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={formData.subjectCode}
                    onChange={(e) => setFormData({ ...formData, subjectCode: e.target.value })}
                    placeholder="e.g. BAITBUSL"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Instructor
                  </label>
                  <input
                    type="text"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    placeholder="e.g. 26-05121: MR. JERICHO JAN M. FEOLINO"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Offered To
                  </label>
                  <input
                    type="text"
                    value={formData.offeredTo}
                    onChange={(e) => setFormData({ ...formData, offeredTo: e.target.value })}
                    placeholder="e.g. Continuing"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Class Limit
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.classLimit}
                    onChange={(e) => setFormData({ ...formData, classLimit: e.target.value })}
                    placeholder="e.g. 40"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 font-mono font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Subject Schedules
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSchedules([...schedules, { day: "", time: "", roomType: "Lec", room: "" }])
                      }
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      + Add schedule
                    </button>
                  </div>
                  {schedules.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      No schedule yet. Upload a classlist PDF or add one manually.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {schedules.map((s, idx) => (
                        <div key={idx} className="grid grid-cols-2 sm:grid-cols-[1fr_1.4fr_0.8fr_1fr_auto] gap-2">
                          {(["day", "time", "roomType", "room"] as const).map((field) => (
                            <input
                              key={field}
                              type="text"
                              value={s[field]}
                              onChange={(e) =>
                                setSchedules(
                                  schedules.map((r, i) => (i === idx ? { ...r, [field]: e.target.value } : r))
                                )
                              }
                              placeholder={
                                field === "day"
                                  ? "Day"
                                  : field === "time"
                                  ? "01:00PM - 03:00PM"
                                  : field === "roomType"
                                  ? "Lec / Lab"
                                  : "Room"
                              }
                              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => setSchedules(schedules.filter((_, i) => i !== idx))}
                            className="px-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Remove schedule"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Optional Announcement to Students
                  </label>
                  <textarea
                    rows={2}
                    value={formData.announcement}
                    onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
                    placeholder="e.g. Welcome to BAITBUSL! Official grades consultation will be held via Gradeview."
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 3. ROSTER PREVIEW (IF EXTRACTED FROM PDF) */}
            {parsedStudents.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Extracted Classlist Roster ({parsedStudents.length} Students)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      These students will be enrolled automatically. Initial passwords will be issued for them.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRosterPreview(!showRosterPreview)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showRosterPreview ? "Collapse Roster" : "Expand Roster"}</span>
                    {showRosterPreview ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Auto-enroll toggle checkbox */}
                <label className="flex items-center gap-2 p-3 rounded-xl bg-blue-50/60 border border-blue-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEnroll}
                    onChange={(e) => setAutoEnroll(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-600 h-4 w-4"
                  />
                  <span className="text-xs font-semibold text-blue-950">
                    Automatically enroll all {parsedStudents.length} students into this section upon creation
                  </span>
                </label>

                {/* Scrollable roster table */}
                {showRosterPreview && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">#</th>
                          <th className="py-2.5 px-3">Student ID</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Course / Strand</th>
                          <th className="py-2.5 px-3">Gender</th>
                          <th className="py-2.5 px-3">Official Email</th>
                          <th className="py-2.5 px-3">Date Enrolled</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {parsedStudents.map((st) => (
                          <tr key={st.studentNumber} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 text-center text-slate-400 font-normal">
                              {st.index}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {st.studentNumber}
                            </td>
                            <td className="py-2 px-3 font-sans font-medium text-slate-800">
                              {st.displayName}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-sans">
                              {st.course || "—"} {st.strand ? `(${st.strand})` : ""}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-sans">{st.gender || "—"}</td>
                            <td className="py-2 px-3 text-slate-500 text-[11px]">
                              {st.email || "—"}
                            </td>
                            <td className="py-2 px-3 text-slate-600 font-sans">{st.dateEnrolled || "—"}</td>
                            <td className="py-2 px-3 text-right font-sans">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {st.status || "Enrolled"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 4. STUDENT VISIBILITY PARAMETERS */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Student-Visible Report Fields
              </h3>

              <div className="space-y-2.5">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showFinalGrade}
                    onChange={(e) => setFormData({ ...formData, showFinalGrade: e.target.checked })}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">
                      Display Final Grade / Academic Standing
                    </span>
                    <span className="text-[11px] text-slate-500">
                      When enabled, authenticated students see their overall course mark and standing.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showBreakdown}
                    onChange={(e) => setFormData({ ...formData, showBreakdown: e.target.checked })}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">
                      Display Assessment Breakdown Ledger
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Shows itemized scores for class participation, enabling activities, and performance tasks.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showProvisionalNotice}
                    onChange={(e) => setFormData({ ...formData, showProvisionalNotice: e.target.checked })}
                    className="mt-0.5 rounded text-slate-900 focus:ring-slate-900 h-4 w-4"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">
                      Show Provisional Consultation Notice
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Displays a note indicating grades remain subject to final verification by registrar channels.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50/80 px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-between">
            <Link href="/professor">
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              size="md"
              className="gap-2 font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              isLoading={isLoading}
              disabled={codeStatus.checked && !codeStatus.available}
            >
              <Plus className="w-4 h-4" />
              <span>
                {autoEnroll && parsedStudents.length > 0
                  ? `Create Section & Enroll ${parsedStudents.length} Students`
                  : "Create Section (Draft)"}
              </span>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
