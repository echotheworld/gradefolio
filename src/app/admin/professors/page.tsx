"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  ArrowLeft,
  KeyRound,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

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
  const [professors, setProfessors] = useState<ProfessorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    displayName: "",
    initialPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suspend Modal
  const [selectedProf, setSelectedProf] = useState<ProfessorItem | null>(null);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const loadProfessors = async () => {
    try {
      const res = await fetch("/api/admin/professors");
      const data = await res.json();
      setProfessors(data.professors || []);
      setIsLoading(false);
    } catch {
      toast({ type: "error", title: "Error", message: "Failed to load professors" });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfessors();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/professors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to invite professor");

      toast({
        type: "success",
        title: "Professor Account Created",
        message: `${data.professor.displayName} invited with initial password: ${data.initialPassword}`,
      });

      setInviteModalOpen(false);
      setInviteForm({ email: "", displayName: "", initialPassword: "" });
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

  const filtered = professors.filter(
    (p) =>
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Super Admin Overview</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
            Faculty Directory & Access Control
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manage Professors
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Provision new faculty accounts, monitor activity, or suspend compromised profiles.
          </p>
        </div>

        <div>
          <Button
            size="md"
            onClick={() => setInviteModalOpen(true)}
            className="gap-2 font-semibold shadow-sm bg-slate-900 text-white"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Professor</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search professor by name or email..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong>{filtered.length}</strong> of {professors.length} professors
        </div>
      </div>

      {/* Professors Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Professor</th>
                <th className="px-6 py-3.5">Email</th>
                <th className="px-6 py-3.5">Sections Owned</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Last Sign In</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Loading professors...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No professors found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((prof) => (
                  <tr key={prof.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{prof.displayName}</td>
                    <td className="px-6 py-4 text-slate-600">{prof.email}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium">
                      {prof._count.sections} sections
                    </td>
                    <td className="px-6 py-4">
                      {prof.status === "ACTIVE" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                      {prof.lastSignInAt ? formatDate(prof.lastSignInAt) : "Never signed in"}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProf(prof);
                          setResetModalOpen(true);
                        }}
                        className="text-[11px] h-7 px-2"
                      >
                        <KeyRound className="w-3 h-3 mr-1" /> Reset PW
                      </Button>

                      <Button
                        size="sm"
                        variant={prof.status === "ACTIVE" ? "ghost" : "outline"}
                        onClick={() => {
                          setSelectedProf(prof);
                          setSuspendModalOpen(true);
                        }}
                        className={`text-[11px] h-7 px-2 ${
                          prof.status === "ACTIVE"
                            ? "text-rose-600 hover:bg-rose-50"
                            : "text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {prof.status === "ACTIVE" ? "Suspend" : "Reactivate"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Professor Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite / Create Professor Account"
        description="Provision a faculty member to manage their own sections and gradebooks."
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Display Name *
            </label>
            <input
              type="text"
              required
              value={inviteForm.displayName}
              onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })}
              placeholder="e.g. Prof. Teresa Gomez"
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Institutional Email Address *
            </label>
            <input
              type="email"
              required
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="e.g. tgomez@gradeview.edu"
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Initial Password (Optional)
            </label>
            <input
              type="text"
              value={inviteForm.initialPassword}
              onChange={(e) => setInviteForm({ ...inviteForm, initialPassword: e.target.value })}
              placeholder="Leave blank to use default 'FacultyPass2026!'"
              className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting} className="font-semibold">
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Suspend / Reactivate Confirmation Modal */}
      {selectedProf && (
        <Modal
          isOpen={suspendModalOpen}
          onClose={() => setSuspendModalOpen(false)}
          title={selectedProf.status === "ACTIVE" ? "Suspend Professor Access" : "Reactivate Professor Account"}
          description={`Target Account: ${selectedProf.displayName} (${selectedProf.email})`}
        >
          <div className="space-y-4 text-xs">
            <div
              className={`p-4 rounded-xl border leading-relaxed ${
                selectedProf.status === "ACTIVE"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
              }`}
            >
              {selectedProf.status === "ACTIVE" ? (
                <>
                  <strong>Caution: </strong>
                  Suspending this professor will immediately block them from signing in, importing gradebooks, and modifying sections. Their existing published sections will remain accessible to students unless archived. This action is recorded in the platform audit log.
                </>
              ) : (
                <>
                  Reactivating this account restores the professor&apos;s ability to sign in and manage their course sections.
                </>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setSuspendModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant={selectedProf.status === "ACTIVE" ? "destructive" : "primary"}
                onClick={handleToggleStatus}
                isLoading={isSubmitting}
                className="font-semibold"
              >
                Confirm {selectedProf.status === "ACTIVE" ? "Suspension" : "Reactivation"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {selectedProf && (
        <Modal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          title="Reset Faculty Password"
          description={`Set a new temporary password for ${selectedProf.displayName}`}
        >
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                New Password *
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="e.g. NewPass2026!#"
                className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setResetModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting} className="font-semibold">
                Update Password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
