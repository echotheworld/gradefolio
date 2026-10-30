"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Clock, ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface IdleSessionTrackerProps {
  /** Inactivity timeout in minutes (default: 20 for faculty, 15 for students) */
  timeoutMinutes?: number;
  /** Warning countdown window in seconds before auto-logout (default: 60) */
  warningSeconds?: number;
  /** Destination to redirect on session timeout (e.g., "/admin_mis" or "/section/[code]/login") */
  redirectUrl: string;
  /** Role label for custom messaging */
  roleLabel?: string;
}

export function IdleSessionTracker({
  timeoutMinutes = 20,
  warningSeconds = 60,
  redirectUrl,
  roleLabel = "faculty",
}: IdleSessionTrackerProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningSeconds);
  const [isExtending, setIsExtending] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningSeconds * 1000;

  // Perform secure signout and redirection
  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleLabel === "student" ? "STUDENT" : "FACULTY" }),
      });
    } catch (e) {
      console.error("Signout error during idle timeout:", e);
    } finally {
      const sep = redirectUrl.includes("?") ? "&" : "?";
      router.push(`${redirectUrl}${sep}expired=idle`);
      router.refresh();
    }
  }, [redirectUrl, router, roleLabel]);

  // Extend session: reset local activity time and ping heartbeat endpoint
  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      await fetch("/api/auth/heartbeat", { method: "POST" });
    } catch (e) {
      console.error("Heartbeat refresh failed:", e);
    } finally {
      lastActivityRef.current = Date.now();
      setShowWarning(false);
      setSecondsRemaining(warningSeconds);
      setIsExtending(false);
    }
  };

  // Activity listener (throttled to avoid main thread churn)
  useEffect(() => {
    let lastThrottledTime = Date.now();

    const updateActivity = () => {
      const now = Date.now();
      // Throttle event handling to at most once every 1.5 seconds
      if (now - lastThrottledTime > 1500) {
        lastThrottledTime = now;
        // Only reset if we're not currently showing the warning modal
        // (if the modal is open, user must explicitly click "Stay Signed In")
        if (!showWarning) {
          lastActivityRef.current = now;
        }
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((evt) => window.addEventListener(evt, updateActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, updateActivity));
    };
  }, [showWarning]);

  // Main 1-second interval loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;
      const remainingMs = timeoutMs - elapsed;

      if (remainingMs <= 0) {
        clearInterval(interval);
        handleLogout();
      } else if (remainingMs <= warningMs) {
        setShowWarning(true);
        setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutMs, warningMs, showWarning, handleLogout]);

  if (!showWarning) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            Security Timeout Warning
          </div>
          <h2 id="idle-modal-title" className="text-xl font-extrabold text-slate-900 tracking-tight">
            Session Expiring Soon
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            You have been inactive for a while. For your account security, your {roleLabel} session will automatically close in:
          </p>
        </div>

        {/* Big Countdown Badge */}
        <div className="py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-200/80 inline-block font-mono text-2xl font-black text-amber-600 tracking-wider shadow-inner">
          {String(Math.floor(secondsRemaining / 60)).padStart(2, "0")}:
          {String(secondsRemaining % 60).padStart(2, "0")}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleLogout}
            className="flex-1 gap-1.5 text-xs text-slate-600 border-slate-300 hover:bg-slate-100 font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Now</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleExtendSession}
            isLoading={isExtending}
            className="flex-1 gap-1.5 text-xs shadow-md font-bold bg-[#2563EB] hover:bg-blue-700 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Stay Signed In</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
