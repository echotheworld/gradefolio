"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  UserPlus,
  KeyRound,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  BookOpen,
  Clock,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
  Copy,
  Check,
  Sparkles,
  Eye,
  EyeOff,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { getCachedData, setCachedData, invalidateCache } from "@/lib/client-cache";
import { validateNistPassword, generateNistPassword } from "@/lib/nist-password";

interface ProfessorItem {
  id: string;
  email: string;
  displayName: string;
  status: string;
  createdAt: string;
  lastSignInAt: string | null;
  _count: {
    sections: number;
  };
}

export default function AdminProfessorsPage() {
  const { toast } = useToast();
  // Safe SSR initial state
  const [professors, setProfessors] = useState<ProfessorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");

  // Add Faculty Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    initialPassword: "",
  });
  const [showInvitePassword, setShowInvitePassword] = useState(false);
  const [copiedInvitePassword, setCopiedInvitePassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suspend Modal
  const [selectedProf, setSelectedProf] = useState<ProfessorItem | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);

  // Edit Name Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [copiedResetPassword, setCopiedResetPassword] = useState(false);

  const copyToClipboard = (text: string, setCopiedState: (v: boolean) => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
    toast({ type: "success", title: "Copied!", message: "Password copied to clipboard." });
  };

  const invitePasswordValidation = useMemo(() => {
    if (!inviteForm.initialPassword) return null;
    return validateNistPassword(inviteForm.initialPassword, {
      firstName: inviteForm.firstName,
      lastName: inviteForm.lastName,
      email: inviteForm.email,
    });
  }, [inviteForm.initialPassword, inviteForm.firstName, inviteForm.lastName, inviteForm.email]);

  const resetPasswordValidation = useMemo(() => {
    if (!newPassword || !selectedProf) return null;
    return validateNistPassword(newPassword, {
      displayName: selectedProf.displayName,
      email: selectedProf.email,
    });
  }, [newPassword, selectedProf]);

  const loadProfessors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/professors");
      const data = await res.json();
      const list = data.professors || [];
      setProfessors(list);
      setCachedData("admin_professors", list);
    } catch {
      toast({ type: "error", title: "Error", message: "Failed to load professors" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // SWR instant paint from client cache on mount
    const cached = getCachedData<ProfessorItem[]>("admin_professors");
    if (cached && cached.length > 0) {
      setProfessors(cached);
      setIsLoading(false);
    }
    loadProfessors();

    const handleFocus = () => loadProfessors();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadProfessors]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const firstName = inviteForm.firstName.trim();
    const lastName = inviteForm.lastName.trim();
    const email = inviteForm.email.trim();
    const initialPassword = inviteForm.initialPassword.trim() || generateNistPassword();

    if (!firstName || !lastName) {
      toast({ type: "error", title: "Name Required", message: "Please provide both first name and last name." });
      return;
    }

    const validation = validateNistPassword(initialPassword, {
      firstName,
      lastName,
      email,
    });

    if (!validation.isValid) {
      toast({ type: "error", title: "Password Does Not Meet NIST Guidelines", message: validation.errors[0] });
      return;
    }

    setIsSubmitting(true);
    try {
      const displayName = `Prof. ${firstName} ${lastName}`;
      const res = await fetch("/api/admin/professors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          initialPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add faculty");

      toast({
        type: "success",
        title: "Faculty Member Added",
        message: `${displayName} has been created. Password: ${data.initialPassword}`,
      });

      setInviteModalOpen(false);
      setInviteForm({ firstName: "", lastName: "", email: "", initialPassword: "" });
      invalidateCache("admin_professors");
      await loadProfessors();
    } catch (e: any) {
      toast({ type: "error", title: "Failed", message: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedProf) return;
    setIsSubmitting(true);
    const targetStatus = selectedProf.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/professors/${selectedProf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) throw new Error("Status update failed");

      toast({
        type: "info",
        title: targetStatus === "SUSPENDED" ? "Account Suspended" : "Account Reactivated",
        message: `${selectedProf.displayName}'s account has been ${targetStatus.toLowerCase()}.`,
      });

      setSuspendModalOpen(false);
      invalidateCache("admin_professors");
      await loadProfessors();
    } catch (e: any) {
      toast({ type: "error", title: "Error", message: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProf || !newPassword) return;

    const validation = validateNistPassword(newPassword, {
      displayName: selectedProf.displayName,
      email: selectedProf.email,
    });

    if (!validation.isValid) {
      toast({ type: "error", title: "Password Does Not Meet NIST Guidelines", message: validation.errors[0] });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/professors/${selectedProf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      if (!res.ok) throw new Error("Failed to reset password");

      toast({
        type: "success",
        title: "Password Reset Successful",
        message: `Password updated for ${selectedProf.displayName}.`,
      });

      setResetModalOpen(false);
      setNewPassword("");
    } catch (e: any) {
      toast({ type: "error", title: "Reset Failed", message: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProf) return;

    const firstName = editFirstName.trim();
    const lastName = editLastName.trim();

    if (!firstName || !lastName) {
      toast({ type: "error", title: "Name Required", message: "Please provide both first name and last name." });
      return;
    }

    const formattedDisplayName = `Prof. ${firstName} ${lastName}`;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/professors/${selectedProf.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: formattedDisplayName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update faculty name");

      toast({
        type: "success",
        title: "Faculty Name Updated",
        message: `Name updated to "${formattedDisplayName}" successfully.`,
      });

      setEditModalOpen(false);
      invalidateCache("admin_professors");
      await loadProfessors();
    } catch (e: any) {
      toast({ type: "error", title: "Update Failed", message: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeCount = useMemo(() => professors.filter((p) => p.status === "ACTIVE").length, [professors]);
  const suspendedCount = useMemo(() => professors.filter((p) => p.status !== "ACTIVE").length, [professors]);

  const filtered = useMemo(() => {
    return professors.filter((p) => {
      const matchesSearch =
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && p.status === "ACTIVE") ||
        (statusFilter === "SUSPENDED" && p.status !== "ACTIVE");

      return matchesSearch && matchesStatus;
    });
  }, [professors, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-xs p-6 sm:p-7">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[11px] font-bold tracking-wider uppercase border border-blue-200">
              <Users className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Faculty Directory & Access Control</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Faculty Management
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Provision professor accounts, oversee course section ownerships, reset credentials, or suspend access across institutional departments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="md"
              variant="primary"
              onClick={() => {
                setInviteForm({
                  firstName: "",
                  lastName: "",
                  email: "",
                  initialPassword: generateNistPassword(),
                });
                setInviteModalOpen(true);
              }}
              className="gap-2 font-semibold shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Faculty</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Stat Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Faculty</p>
            {isLoading && professors.length === 0 ? (
              <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums" suppressHydrationWarning>{professors.length}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Active Professors</p>
            {isLoading && professors.length === 0 ? (
              <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5" suppressHydrationWarning>{activeCount}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-500">Suspended Profiles</p>
            {isLoading && professors.length === 0 ? (
              <div className="w-12 h-7 bg-slate-100 rounded-md animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5" suppressHydrationWarning>{suspendedCount}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search faculty by name or email address..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "ALL"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All ({professors.length})
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("SUSPENDED")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              statusFilter === "SUSPENDED"
                ? "bg-rose-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Suspended ({suspendedCount})
          </button>
        </div>
      </div>

      {/* Professors Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Faculty Member</th>
                <th className="px-6 py-3.5">Institutional Email</th>
                <th className="px-6 py-3.5">Sections Owned</th>
                <th className="px-6 py-3.5">Access Status</th>
                <th className="px-6 py-3.5">Last Sign In</th>
                <th className="px-6 py-3.5 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading && professors.length === 0 ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="w-32 h-4 bg-slate-100 rounded" />
                          <div className="w-20 h-2.5 bg-slate-50 rounded" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-40 h-3.5 bg-slate-100 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24 h-6 bg-slate-100 rounded-lg" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-16 h-5 bg-slate-100 rounded-full" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-24 h-3 bg-slate-100 rounded" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <div className="w-16 h-7 bg-slate-100 rounded-lg" />
                          <div className="w-16 h-7 bg-slate-100 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">No faculty accounts found</p>
                      <p className="text-xs text-slate-400">Try adjusting your search criteria or status filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((prof) => {
                  const isActive = prof.status === "ACTIVE";

                  return (
                    <tr key={prof.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & ID */}
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-slate-900">{prof.displayName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">ID: {prof.id.slice(0, 8)}</div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium">{prof.email}</span>
                        </div>
                      </td>

                      {/* Sections */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200/60">
                          <BookOpen className="w-3 h-3 text-slate-500" />
                          {prof._count.sections} {prof._count.sections === 1 ? "section" : "sections"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Last Sign In */}
                      <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {prof.lastSignInAt ? formatDate(prof.lastSignInAt) : "Never signed in"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedProf(prof);
                            const cleanName = prof.displayName.replace(/^Prof\.?\s+/i, "").trim();
                            const parts = cleanName.split(/\s+/);
                            if (parts.length >= 2) {
                              setEditFirstName(parts[0]);
                              setEditLastName(parts.slice(1).join(" "));
                            } else {
                              setEditFirstName(cleanName);
                              setEditLastName("");
                            }
                            setEditModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 text-blue-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedProf(prof);
                            setResetModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
                        >
                          <KeyRound className="w-3 h-3 text-purple-600" />
                          <span>Reset PW</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedProf(prof);
                            setSuspendModalOpen(true);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors border shadow-2xs ${
                            isActive
                              ? "border-rose-200/80 bg-rose-50 text-rose-700 hover:bg-rose-100"
                              : "border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <UserX className="w-3 h-3 text-rose-600" />
                              <span>Suspend</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3 h-3 text-emerald-600" />
                              <span>Reactivate</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Faculty */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Add Faculty"
        description="Create credentials for a professor to upload gradebooks, calculate student marks, and publish official grades."
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs pt-1">
          {/* Enter Name */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Enter Name *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  placeholder="e.g. Teresa"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  placeholder="e.g. Gomez"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Institutional Email Address */}
          <div>
            <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1.5">
              Institutional Email Address *
            </label>
            <input
              type="email"
              required
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="e.g. tgomez@institution.edu"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
          </div>

          {/* Initial Password with Generator & Copy */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                Initial Password
              </label>
              <button
                type="button"
                onClick={() => {
                  const generated = generateNistPassword();
                  setInviteForm({ ...inviteForm, initialPassword: generated });
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/80 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Generate Password</span>
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type={showInvitePassword ? "text" : "password"}
                value={inviteForm.initialPassword}
                onChange={(e) => setInviteForm({ ...inviteForm, initialPassword: e.target.value })}
                placeholder="Click Generate Password or enter initial password"
                className="w-full p-2.5 pr-20 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />

              <div className="absolute right-2 flex items-center gap-1">
                {inviteForm.initialPassword && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(inviteForm.initialPassword, setCopiedInvitePassword)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                    title="Copy password to clipboard"
                  >
                    {copiedInvitePassword ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowInvitePassword(!showInvitePassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                  title={showInvitePassword ? "Hide password" : "Show password"}
                >
                  {showInvitePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* NIST SP 800-63B Validation Checklist */}
            {inviteForm.initialPassword && invitePasswordValidation && (
              <div className={`p-2.5 rounded-xl border text-[11px] ${
                invitePasswordValidation.isValid
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-amber-50 text-amber-800 border-amber-200"
              }`}>
                {invitePasswordValidation.isValid ? (
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>✓ Meets NIST SP 800-63B Standards (Minimum 8 chars & high entropy)</span>
                  </div>
                ) : (
                  <div className="space-y-0.5 font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Password Requirements:</span>
                    </div>
                    {invitePasswordValidation.errors.map((err, i) => (
                      <div key={i} className="pl-5 text-amber-700">&bull; {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Adheres to <strong>NIST SP 800-63B</strong>: minimum 8 characters, checked against common breach dictionaries, with no arbitrary symbol requirements.
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInviteModalOpen(false)}
              className="rounded-xl font-medium"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Faculty
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Suspend / Reactivate Confirmation */}
      {selectedProf && (
        <Modal
          isOpen={suspendModalOpen}
          onClose={() => setSuspendModalOpen(false)}
          title={selectedProf.status === "ACTIVE" ? "Suspend Faculty Access" : "Reactivate Faculty Account"}
          description={`Target Account: ${selectedProf.displayName} (${selectedProf.email})`}
        >
          <div className="space-y-4 text-xs pt-1">
            <div
              className={`p-4 rounded-xl border leading-relaxed ${
                selectedProf.status === "ACTIVE"
                  ? "bg-rose-50/80 border-rose-200 text-rose-900"
                  : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
              }`}
            >
              {selectedProf.status === "ACTIVE" ? (
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">Access Revocation Notice</span>
                    Suspending this professor will immediately terminate active sessions and prevent sign-in or grade modifications. Their existing published sections will remain accessible to students unless individually archived.
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">Account Restoration</span>
                    Reactivating this account restores the professor&apos;s ability to sign in, upload spreadsheets, and manage their course sections.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSuspendModalOpen(false)}
                className="rounded-xl font-medium"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant={selectedProf.status === "ACTIVE" ? "destructive" : "primary"}
                onClick={handleToggleStatus}
                isLoading={isSubmitting}
                className="rounded-xl font-semibold"
              >
                Confirm {selectedProf.status === "ACTIVE" ? "Suspension" : "Reactivation"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Edit Faculty Name */}
      {selectedProf && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Faculty Name"
          description={`Update institutional profile and registered name for ${selectedProf.email}`}
        >
          <form onSubmit={handleEditNameSubmit} className="space-y-4 text-xs pt-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Faculty Name *
                </label>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                  Title: Prof. (System Maintained)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="e.g. Teresa"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="e.g. Gomez"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between mt-2">
                <span className="text-[11px] text-slate-500">Preview:</span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  Prof. {editFirstName.trim() || "[First]"} {editLastName.trim() || "[Last]"}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                The &ldquo;Prof.&rdquo; title is automatically maintained by the platform and appears on all course sections, published grade reports, and student portal views.
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="rounded-xl font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                className="rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Reset Password */}
      {selectedProf && (
        <Modal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          title="Reset Faculty Password"
          description={`Issue a new temporary access password for ${selectedProf.displayName}`}
        >
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs pt-1">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  New Temporary Password *
                </label>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateNistPassword())}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200/80 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Generate Password</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showResetPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Click Generate Password or enter temporary password"
                  className="w-full p-2.5 pr-20 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />

                <div className="absolute right-2 flex items-center gap-1">
                  {newPassword && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newPassword, setCopiedResetPassword)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                      title="Copy password to clipboard"
                    >
                      {copiedResetPassword ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                    title={showResetPassword ? "Hide password" : "Show password"}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* NIST SP 800-63B Validation */}
              {newPassword && resetPasswordValidation && (
                <div className={`p-2.5 rounded-xl border text-[11px] ${
                  resetPasswordValidation.isValid
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}>
                  {resetPasswordValidation.isValid ? (
                    <div className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>✓ Meets NIST SP 800-63B Standards</span>
                    </div>
                  ) : (
                    <div className="space-y-0.5 font-medium">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>NIST Password Requirements:</span>
                      </div>
                      {resetPasswordValidation.errors.map((err, i) => (
                        <div key={i} className="pl-5 text-amber-700">&bull; {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Provide this credential securely to the faculty member. It adheres to <strong>NIST SP 800-63B</strong> standards.
              </p>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResetModalOpen(false)}
                className="rounded-xl font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                className="rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Update Password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
