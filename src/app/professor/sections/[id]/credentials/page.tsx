"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  Download,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  ArrowLeft,
  Users,
  Lock,
  EyeOff,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

interface StudentCredentialItem {
  sectionStudentId: string;
  studentId: string;
  studentNumber: string;
  displayName: string;
  credentialStatus: string;
  hasCredential: boolean;
  lastAccessAt: string | null;
}

export default function StudentCredentialsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const sectionId = params.id as string;

  const [students, setStudents] = useState<StudentCredentialItem[]>([]);
  const [sectionCode, setSectionCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Batch Generation Modal (One-time download)
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchCredentials, setBatchCredentials] = useState<
    Array<{ studentNumber: string; displayName: string; password: string }>
  >([]);

  // Single Reissue Modal
  const [reissueModalOpen, setReissueModalOpen] = useState(false);
  const [reissuedData, setReissuedData] = useState<{
    studentNumber: string;
    displayName: string;
    password: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadCredentials = async () => {
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}/credentials`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }
        throw new Error("Failed to load credentials");
      }
      const data = await res.json();
      setStudents(data.students || []);
      setSectionCode(data.sectionCode || "");
      setIsLoading(false);
    } catch {
      toast({ type: "error", title: "Error", message: "Failed to load credentials." });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, [sectionId]);

  // Batch generate
  const handleBatchGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_all" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Batch generation failed");

      setBatchCredentials(data.credentials || []);
      setBatchModalOpen(true);
      await loadCredentials();
      toast({
        type: "success",
        title: "Credentials Generated",
        message: `Generated passwords for ${data.credentials.length} students.`,
      });
    } catch (e: any) {
      toast({ type: "error", title: "Generation Error", message: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // Reissue single
  const handleReissueSingle = async (studentId: string) => {
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reissue_single", studentId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reissue failed");

      setReissuedData({
        studentNumber: data.studentNumber,
        displayName: data.displayName,
        password: data.password,
      });
      setReissueModalOpen(true);
      await loadCredentials();
    } catch (e: any) {
      toast({ type: "error", title: "Reissue Error", message: e.message });
    }
  };

  // Toggle status (Active / Revoked)
  const handleToggleStatus = async (studentId: string, currentStatus: string) => {
    const targetStatus = currentStatus === "ACTIVE" ? "REVOKED" : "ACTIVE";
    try {
      const res = await fetch(`/api/professor/sections/${sectionId}/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_status", studentId, targetStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");

      toast({
        type: "info",
        title: targetStatus === "REVOKED" ? "Credential Revoked" : "Credential Reactivated",
        message: `Student access status changed to ${targetStatus}.`,
      });
      await loadCredentials();
    } catch (e: any) {
      toast({ type: "error", title: "Update Error", message: e.message });
    }
  };

  // Download Distribution CSV
  const handleDownloadDistributionCSV = () => {
    if (batchCredentials.length === 0) return;
    const header = ["Section Code", "Student ID", "Student Name", "Access Password"];
    const rows = batchCredentials.map((c) => [
      `"${sectionCode}"`,
      `"${c.studentNumber}"`,
      `"${c.displayName}"`,
      `"${c.password}"`,
    ]);
    const csvContent = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GradeView_Distribution_${sectionCode}.csv`;
    a.click();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ type: "info", title: "Copied", message: "Password copied to clipboard." });
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

      {/* Header & Batch Generation Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
            Access Control Management
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Student Credential Manager
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Section: <strong className="font-mono text-slate-900">{sectionCode}</strong> &bull; Total Students:{" "}
            <strong>{students.length}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="md"
            onClick={handleBatchGenerate}
            isLoading={isGenerating}
            className="gap-2 font-semibold shadow-sm bg-slate-900 text-white"
          >
            <KeyRound className="w-4 h-4 text-teal-400" />
            <span>Generate Credentials for All</span>
          </Button>
        </div>
      </div>

      {/* Security Baseline Alert */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-900 block mb-0.5">Privacy & Security Baseline:</strong>
          Passwords are never stored in plain text (only irreversible cryptographic hashes are retained). To distribute passwords, generate credentials and download the one-time private distribution CSV. Passwords cannot be recovered once dismissed; if a student forgets their secret, use the <strong>Reissue</strong> button to generate a new replacement.
        </div>
      </div>

      {/* Students Credentials Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-4 border-b border-slate-100 flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">Enrolled Student Access List</CardTitle>
          <span className="text-xs text-slate-500">
            {students.filter((s) => s.hasCredential).length} of {students.length} credentials issued
          </span>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Student ID</th>
                <th className="px-6 py-3">Display Name</th>
                <th className="px-6 py-3">Credential Status</th>
                <th className="px-6 py-3">Last Access</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading student credentials...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No students enrolled in this section. Import an Excel gradebook first.
                  </td>
                </tr>
              ) : (
                students.map((ss) => (
                  <tr key={ss.sectionStudentId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-medium text-slate-900">{ss.studentNumber}</td>
                    <td className="px-6 py-3.5 font-medium text-slate-900">{ss.displayName}</td>
                    <td className="px-6 py-3.5">
                      {ss.hasCredential ? (
                        ss.credentialStatus === "ACTIVE" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                            Revoked
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Unissued
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 font-mono text-[11px]">
                      {ss.lastAccessAt ? formatDate(ss.lastAccessAt) : "Never accessed"}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReissueSingle(ss.studentId)}
                        className="text-[11px] h-7 px-2.5"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Reissue
                      </Button>

                      <Button
                        size="sm"
                        variant={ss.credentialStatus === "ACTIVE" ? "ghost" : "outline"}
                        onClick={() => handleToggleStatus(ss.studentId, ss.credentialStatus)}
                        className={`text-[11px] h-7 px-2.5 ${
                          ss.credentialStatus === "ACTIVE"
                            ? "text-rose-600 hover:bg-rose-50"
                            : "text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {ss.credentialStatus === "ACTIVE" ? "Revoke" : "Reactivate"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Screen 5 Modal: Batch One-Time Distribution Download */}
      <Modal
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        title="Student Passwords Generated (One-Time View)"
        description="Important: Save and distribute this list now. Passwords cannot be viewed again once dismissed."
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900 leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Confidential Distribution Notice: </strong>
              Download this CSV and securely distribute individual passwords to each student. Never post this file publicly or send reusable passwords through an insecure group link.
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-slate-900">
              Generated Passwords ({batchCredentials.length} students)
            </span>
            <Button size="sm" onClick={handleDownloadDistributionCSV} className="gap-1.5 text-xs font-semibold">
              <Download className="w-3.5 h-3.5" />
              <span>Download Distribution CSV</span>
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-56">
            <table className="w-full text-xs text-left divide-y divide-slate-100">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-3 py-2">Student ID</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Generated Password</th>
                  <th className="px-3 py-2 text-right">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchCredentials.map((c) => (
                  <tr key={c.studentNumber} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-slate-900">{c.studentNumber}</td>
                    <td className="px-3 py-2 text-slate-800">{c.displayName}</td>
                    <td className="px-3 py-2 font-mono font-bold text-teal-800 bg-teal-50/50">
                      {c.password}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => copyToClipboard(c.password, c.studentNumber)}
                        className="p-1 text-slate-400 hover:text-slate-900"
                      >
                        {copiedId === c.studentNumber ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-4 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setBatchModalOpen(false)}>
              I Have Saved the Passwords (Dismiss)
            </Button>
          </div>
        </div>
      </Modal>

      {/* Screen 5 Modal: Single Reissue Modal */}
      {reissueModalOpen && reissuedData && (
        <Modal
          isOpen={true}
          onClose={() => setReissueModalOpen(false)}
          title="Credential Reissued"
          description={`New access password generated for ${reissuedData.displayName}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-slate-500">
                Student ID: <strong>{reissuedData.studentNumber}</strong>
              </div>
              <div className="text-slate-500">
                Student Name: <strong>{reissuedData.displayName}</strong>
              </div>
              <div className="pt-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                  New One-Time Password:
                </span>
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-teal-300 shadow-sm font-mono text-base font-bold text-teal-900">
                  <span>{reissuedData.password}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(reissuedData.password, "single")}
                    className="gap-1 text-xs"
                  >
                    {copiedId === "single" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy</span>
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-slate-500 leading-relaxed">
              Provide this code directly to the student. As soon as you close this window, the plain-text password cannot be retrieved again.
            </p>

            <div className="pt-3 flex justify-end">
              <Button size="sm" onClick={() => setReissueModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
