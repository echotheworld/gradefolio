"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Lock,
  KeyRound,
  ShieldAlert,
  CheckCircle2,
  Mail,
  Info,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { validateNistPassword, generateNistPassword } from "@/lib/nist-password";

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isFetchingUser, setIsFetchingUser] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch("/api/professor/account")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load account");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setDisplayName(data.user.displayName || "");
          setEmail(data.user.email || "");
          setRole(data.user.role || "PROFESSOR");
        }
      })
      .catch((err) => {
        console.error("Account load error:", err);
      })
      .finally(() => {
        setIsFetchingUser(false);
      });
  }, []);

  const nistValidation = useMemo(() => {
    if (!newPassword) return null;
    return validateNistPassword(newPassword, {
      displayName,
      email,
    });
  }, [newPassword, displayName, email]);

  const handleGeneratePassword = () => {
    const generated = generateNistPassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    toast({
      type: "info",
      title: "Secure Password Generated",
      message: "Generated a NIST-compliant passphrase. Ready to copy.",
    });
  };

  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
    toast({
      type: "success",
      title: "Copied to Clipboard",
      message: "Password copied. Store it securely in your password manager.",
    });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast({ type: "error", title: "Current Password Required", message: "Please enter your current password." });
      return;
    }

    if (!newPassword) {
      toast({ type: "error", title: "New Password Required", message: "Please enter a new password." });
      return;
    }

    const validation = validateNistPassword(newPassword, {
      displayName,
      email,
    });

    if (!validation.isValid) {
      toast({
        type: "error",
        title: "Password Does Not Meet NIST Guidelines",
        message: validation.errors[0],
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ type: "error", title: "Passwords Do Not Match", message: "The new passwords you entered do not match." });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/professor/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password update failed");

      toast({
        type: "success",
        title: "Password Updated",
        message: "Your workspace password has been changed successfully.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({ type: "error", title: "Update Failed", message: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <Link
          href="/professor"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
        <CardHeader className="border-b border-slate-100 p-6 sm:p-7">
          <CardTitle className="text-xl font-extrabold text-slate-900 tracking-tight">Account Settings</CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-1">
            Manage your faculty workspace access credentials and view your verified profile information.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-7 space-y-8">
          {/* Read-Only Profile Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Profile Information
              </h4>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Institutional ID
              </span>
            </div>

            {/* Full Display Name (Read-Only) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Full Display Name
              </label>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 truncate">
                    {isFetchingUser ? "Loading..." : displayName || "Faculty Member"}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200/90 px-2 py-0.5 rounded-md shrink-0">
                  Read Only
                </span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Cannot be edited directly. Contact your administrator if your name needs to be updated.</span>
              </p>
            </div>

            {/* Email Address (Read-Only) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Faculty Email Address
              </label>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60 flex items-center justify-center font-bold text-xs shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-medium text-slate-700 truncate">
                    {isFetchingUser ? "Loading..." : email || "faculty@institution.edu"}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <form onSubmit={handleUpdatePassword} className="space-y-6 pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Change Workspace Password
                  </h4>
                </div>
                <p className="text-[11px] text-slate-500">
                  Adheres to <strong>NIST SP 800-63B</strong> password guidelines (minimum 8 characters, high entropy).
                </p>
              </div>

              {/* Generate Password Button (Optional) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 transition-all cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Generate Password</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Password *
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    title={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      New Password *
                    </label>
                    {newPassword && (
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                        title="Copy password to clipboard"
                      >
                        {copiedPassword ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm New Password *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* NIST SP 800-63B Real-time Feedback */}
              {newPassword && nistValidation && (
                <div className={`p-3 rounded-xl border text-xs transition-all ${
                  nistValidation.isValid
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}>
                  {nistValidation.isValid ? (
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>✓ Meets NIST SP 800-63B Standards (Secure length, high entropy, breach screened)</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Password Requirements:</span>
                      </div>
                      {nistValidation.errors.map((err, i) => (
                        <div key={i} className="pl-5 text-amber-700">&bull; {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                size="sm"
                isLoading={isLoading}
                className="font-bold text-xs px-5 shadow-xs bg-slate-900 text-white hover:bg-slate-800"
              >
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
