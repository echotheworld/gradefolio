"use client";

import React, { useEffect, useRef, useState } from "react";
import { UploadCloud, Loader2, FileText, X, Plus, Minus, Pencil, AlertTriangle, ArrowLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface ScheduleRow {
  day: string;
  time: string;
  roomType: string;
  room: string;
}

export interface EditableSection {
  id: string;
  sectionCode: string;
  subjectName: string;
  subjectCode?: string | null;
  sectionName: string;
  instructor?: string | null;
  offeredTo?: string | null;
  classLimit?: number | null;
  academicYear: string;
  term: string;
  schedules?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  section: EditableSection;
  onApplied: (message: string) => void;
  currentStudents?: Array<{ studentNumber: string; displayName: string }>;
}

const inputCls =
  "w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900";

function parseSchedules(raw?: string | null): ScheduleRow[] {
  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function EditSectionDetailsModal({ isOpen, onClose, section, onApplied, currentStudents = [] }: Props) {
  const [step, setStep] = useState<"edit" | "review">("edit");
  const [form, setForm] = useState({
    subjectName: "",
    subjectCode: "",
    sectionName: "",
    instructor: "",
    offeredTo: "",
    classLimit: "",
    academicYear: "",
    term: "Term 1",
  });
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [students, setStudents] = useState<any[] | null>(null);
  const [pdfName, setPdfName] = useState("");
  const [removeMissing, setRemoveMissing] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset whenever opened
  useEffect(() => {
    if (!isOpen) return;
    setStep("edit");
    setForm({
      subjectName: section.subjectName || "",
      subjectCode: section.subjectCode || "",
      sectionName: section.sectionName || "",
      instructor: section.instructor || "",
      offeredTo: section.offeredTo || "",
      classLimit: section.classLimit != null ? String(section.classLimit) : "",
      academicYear: section.academicYear || "",
      term: section.term || "Term 1",
    });
    setSchedules(parseSchedules(section.schedules));
    setStudents(null);
    setPdfName("");
    setRemoveMissing(true);
    setSummary(null);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handlePdf = async (file: File) => {
    setIsParsing(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/professor/sections/parse-pdf", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to parse classlist PDF.");
      const m = data.metadata || {};
      setForm((p) => ({
        ...p,
        subjectName: m.subjectName || p.subjectName,
        subjectCode: m.subjectCode || p.subjectCode,
        sectionName: m.sectionName || p.sectionName,
        instructor: m.instructor || p.instructor,
        offeredTo: m.offeredTo || p.offeredTo,
        classLimit: m.classLimit != null ? String(m.classLimit) : p.classLimit,
        academicYear: m.academicYear || p.academicYear,
        term: m.term || p.term,
      }));
      if (Array.isArray(m.schedules)) setSchedules(m.schedules);
      setStudents(data.students || []);
      setPdfName(data.fileName || file.name);
    } catch (e: any) {
      setError(e.message || "Failed to parse PDF.");
    } finally {
      setIsParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const call = async (mode: "preview" | "execute") => {
    const res = await fetch(`/api/professor/sections/${section.id}/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        section: { ...form, schedules },
        students,
        removeMissing,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  };

  const handleReview = async () => {
    setIsWorking(true);
    setError("");
    try {
      const data = await call("preview");
      setSummary(data.summary);
      setStep("review");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsWorking(false);
    }
  };

  const handleApply = async () => {
    setIsWorking(true);
    setError("");
    try {
      const data = await call("execute");
      const a = data.applied || {};
      onApplied(
        `Section details updated. ${a.added || 0} added, ${a.updated || 0} updated, ${a.removed || 0} removed.`
      );
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsWorking(false);
    }
  };

  // Live recompute of "will be removed" when toggle changes in review
  const nothingChanged =
    summary &&
    summary.fieldChanges.length === 0 &&
    summary.added.length === 0 &&
    summary.updated.length === 0 &&
    summary.removed.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isWorking) onClose();
      }}
      title={step === "edit" ? "Edit Section Details" : "Review Changes"}
      description={
        step === "edit"
          ? `Re-upload the official classlist PDF or edit the details of ${section.sectionCode}.`
          : "Nothing is saved until you confirm. Check what will be added, changed and removed."
      }
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-800 font-medium">
            {error}
          </div>
        )}

        {step === "edit" && (
          <>
            {/* PDF re-upload */}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-400 bg-slate-50/60 rounded-xl p-4 text-center cursor-pointer"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePdf(e.target.files[0])}
              />
              {isParsing ? (
                <div className="flex items-center justify-center gap-2 text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" /> Reading classlist PDF...
                </div>
              ) : pdfName ? (
                <div className="flex items-center justify-center gap-2 text-emerald-800 font-semibold">
                  <FileText className="w-4 h-4" />
                  <span>
                    {pdfName} &bull; {students?.length || 0} students loaded &mdash; click to choose a different PDF
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-5 h-5 mx-auto text-blue-600" />
                  <p className="font-semibold text-slate-800">Upload a new official classlist PDF (optional)</p>
                  <p className="text-slate-500">
                    Details and the roster will be compared with the current section before anything is overridden.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Subject Name" wide>
                <input className={inputCls} value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} />
              </Field>
              <Field label="Subject Code">
                <input className={inputCls} value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} />
              </Field>
              <Field label="Section">
                <input className={inputCls} value={form.sectionName} onChange={(e) => setForm({ ...form, sectionName: e.target.value })} />
              </Field>
              <Field label="Instructor">
                <input className={inputCls} value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
              </Field>
              <Field label="Offered To">
                <input className={inputCls} value={form.offeredTo} onChange={(e) => setForm({ ...form, offeredTo: e.target.value })} />
              </Field>
              <Field label="Class Limit">
                <input type="number" min={0} className={inputCls} value={form.classLimit} onChange={(e) => setForm({ ...form, classLimit: e.target.value })} />
              </Field>
              <Field label="Academic Year">
                <input className={inputCls} value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
              </Field>
              <Field label="Term">
                <select className={inputCls + " bg-white"} value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                  {["Term 1", "Term 2", "Term 3", "Midyear / Summer"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-slate-700 uppercase tracking-wider">Subject Schedules</span>
                <button
                  type="button"
                  onClick={() => setSchedules([...schedules, { day: "", time: "", roomType: "Lec", room: "" }])}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  + Add schedule
                </button>
              </div>
              <div className="space-y-2">
                {schedules.length === 0 && <p className="text-slate-400">No schedule.</p>}
                {schedules.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-[1fr_1.4fr_0.8fr_1fr_auto] gap-2">
                    {(["day", "time", "roomType", "room"] as const).map((f) => (
                      <input
                        key={f}
                        className={inputCls}
                        value={s[f]}
                        placeholder={f}
                        onChange={(e) =>
                          setSchedules(schedules.map((r, i) => (i === idx ? { ...r, [f]: e.target.value } : r)))
                        }
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setSchedules(schedules.filter((_, i) => i !== idx))}
                      className="px-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <RosterPanel current={currentStudents} incoming={students} />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleReview} isLoading={isWorking} disabled={isParsing} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Review Changes
              </Button>
            </div>
          </>
        )}

        {step === "review" && summary && (
          <>
            {nothingChanged && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-slate-600 font-medium">
                No differences found. The section already matches this data.
              </div>
            )}

            {summary.fieldChanges.length > 0 && (
              <ReviewBlock title={`Section details changed (${summary.fieldChanges.length})`} tone="blue">
                <div className="divide-y divide-slate-100">
                  {summary.fieldChanges.map((c: any) => (
                    <div key={c.field} className="py-2 grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-2">
                      <span className="font-semibold text-slate-700">{c.label}</span>
                      <span className="text-rose-700 line-through decoration-rose-300 break-words">{c.before}</span>
                      <span className="text-emerald-700 font-medium break-words">{c.after}</span>
                    </div>
                  ))}
                </div>
              </ReviewBlock>
            )}

            {!summary.rosterIncluded ? (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-slate-600">
                No PDF uploaded &mdash; the student roster will stay exactly as it is.
              </div>
            ) : (
              <>
                {summary.added.length > 0 && (
                  <ReviewBlock title={`Students to be added (${summary.added.length})`} tone="emerald" icon={<Plus className="w-3.5 h-3.5" />}>
                    <StudentList rows={summary.added} />
                  </ReviewBlock>
                )}

                {summary.updated.length > 0 && (
                  <ReviewBlock title={`Students with updated info (${summary.updated.length})`} tone="amber" icon={<Pencil className="w-3.5 h-3.5" />}>
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {summary.updated.map((u: any) => (
                        <div key={u.studentNumber} className="py-1.5">
                          <span className="font-mono font-semibold">{u.studentNumber}</span>{" "}
                          <span className="font-semibold">{u.displayName}</span>
                          <div className="text-slate-500">{u.changes.join(" • ")}</div>
                        </div>
                      ))}
                    </div>
                  </ReviewBlock>
                )}

                {summary.removed.length > 0 && (
                  <ReviewBlock
                    title={`Students not in the new classlist (${summary.removed.length})`}
                    tone="rose"
                    icon={<Minus className="w-3.5 h-3.5" />}
                  >
                    <label className="flex items-start gap-2 mb-2 p-2 rounded-lg bg-rose-50 border border-rose-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeMissing}
                        onChange={async (e) => {
                          setRemoveMissing(e.target.checked);
                        }}
                        className="mt-0.5 h-4 w-4"
                      />
                      <span className="text-rose-900 font-medium">
                        Remove these students from the section. Their grade records and credentials in this section
                        will be permanently deleted. Untick to keep them.
                      </span>
                    </label>
                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {summary.removed.map((r: any) => (
                        <div key={r.studentNumber} className={`py-1.5 ${removeMissing ? "" : "opacity-50"}`}>
                          <span className="font-mono font-semibold">{r.studentNumber}</span> {r.displayName}
                          {r.hasGrades && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                              <AlertTriangle className="w-3 h-3" /> has grades
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </ReviewBlock>
                )}

                <p className="text-slate-500">
                  {summary.unchangedCount} student(s) unchanged. Existing passwords are never reset; new students get
                  fresh credentials.
                </p>
              </>
            )}

            <div className="flex justify-between gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setStep("edit")} disabled={isWorking} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isWorking}>Cancel</Button>
                <Button size="sm" variant="destructive" onClick={handleApply} isLoading={isWorking} disabled={Boolean(nothingChanged)}>
                  Confirm &amp; Override
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function RosterPanel({
  current,
  incoming,
}: {
  current: Array<{ studentNumber: string; displayName: string }>;
  incoming: any[] | null;
}) {
  const [filter, setFilter] = useState<"all" | "new" | "removed" | "same">("all");

  const currentMap = new Map(current.map((s) => [s.studentNumber, s]));
  const incomingMap = new Map((incoming || []).map((s) => [String(s.studentNumber), s]));

  type Row = { studentNumber: string; displayName: string; state: "new" | "removed" | "same" | "current" };
  const rows: Row[] = [];
  if (!incoming) {
    current.forEach((s) => rows.push({ ...s, state: "current" }));
  } else {
    incoming.forEach((s) =>
      rows.push({
        studentNumber: String(s.studentNumber),
        displayName: s.displayName,
        state: currentMap.has(String(s.studentNumber)) ? "same" : "new",
      })
    );
    current.forEach((s) => {
      if (!incomingMap.has(s.studentNumber)) rows.push({ ...s, state: "removed" });
    });
  }
  rows.sort((a, b) => a.studentNumber.localeCompare(b.studentNumber));

  const counts = {
    new: rows.filter((r) => r.state === "new").length,
    removed: rows.filter((r) => r.state === "removed").length,
    same: rows.filter((r) => r.state === "same").length,
  };
  const shown = filter === "all" || !incoming ? rows : rows.filter((r) => r.state === filter);

  const badge = {
    new: "bg-emerald-50 text-emerald-800 border-emerald-200",
    removed: "bg-rose-50 text-rose-800 border-rose-200",
    same: "bg-slate-50 text-slate-600 border-slate-200",
    current: "bg-slate-50 text-slate-600 border-slate-200",
  };
  const label = { new: "Will be added", removed: "Will be removed", same: "Stays", current: "Enrolled" };

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-slate-800">
          {incoming ? "Student list comparison" : `Current students (${current.length})`}
        </span>
        {incoming && (
          <div className="flex gap-1.5 text-[11px] font-semibold">
            {(
              [
                ["all", `All (${rows.length})`],
                ["new", `+ Added (${counts.new})`],
                ["removed", `− Removed (${counts.removed})`],
                ["same", `Same (${counts.same})`],
              ] as const
            ).map(([k, t]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`px-2 py-0.5 rounded-md border cursor-pointer ${
                  filter === k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
        {shown.length === 0 ? (
          <p className="p-3 text-slate-400">No students.</p>
        ) : (
          shown.map((r) => (
            <div key={r.studentNumber} className="px-3 py-1.5 flex items-center justify-between gap-2">
              <span className={r.state === "removed" ? "line-through text-slate-400" : ""}>
                <span className="font-mono font-semibold">{r.studentNumber}</span> {r.displayName}
              </span>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge[r.state]}`}>
                {label[r.state]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function ReviewBlock({
  title,
  tone,
  icon,
  children,
}: {
  title: string;
  tone: "blue" | "emerald" | "amber" | "rose";
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones = {
    blue: "border-blue-200 text-blue-900 bg-blue-50",
    emerald: "border-emerald-200 text-emerald-900 bg-emerald-50",
    amber: "border-amber-200 text-amber-900 bg-amber-50",
    rose: "border-rose-200 text-rose-900 bg-rose-50",
  };
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className={`px-3 py-2 font-bold flex items-center gap-1.5 border-b ${tones[tone]}`}>
        {icon}
        {title}
      </div>
      <div className="p-3 bg-white">{children}</div>
    </div>
  );
}

function StudentList({ rows }: { rows: any[] }) {
  return (
    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
      {rows.map((r) => (
        <div key={r.studentNumber} className="py-1.5">
          <span className="font-mono font-semibold">{r.studentNumber}</span> {r.displayName}
          <span className="text-slate-400"> &bull; {[r.course, r.strand].filter(Boolean).join(" ")}</span>
        </div>
      ))}
    </div>
  );
}
