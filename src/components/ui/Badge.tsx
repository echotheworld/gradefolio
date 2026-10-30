import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "draft"
  | "published"
  | "archived"
  | "needs_attention"
  | "needs_review"
  | "provisional"
  | "final"
  | "missing"
  | "not_recorded"
  | "default"
  | "info";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    draft: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
    published: "bg-emerald-50 text-emerald-800 border-emerald-300",
    archived: "bg-slate-100 text-slate-600 border-slate-200",
    needs_attention: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
    needs_review: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
    provisional: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]",
    final: "bg-blue-50 text-[#2563EB] border-blue-200",
    missing: "bg-rose-50 text-rose-800 border-rose-200",
    not_recorded: "bg-slate-50 text-slate-500 border-slate-200",
    default: "bg-slate-100 text-slate-800 border-slate-200",
    info: "bg-blue-50 text-[#2563EB] border-blue-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold border shadow-2xs",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const norm = status?.toUpperCase() || "";

  if (norm === "PUBLISHED") {
    return <Badge variant="published">Published</Badge>;
  }
  if (norm === "DRAFT") {
    return <Badge variant="draft">Draft</Badge>;
  }
  if (norm === "ARCHIVED") {
    return <Badge variant="archived">Archived</Badge>;
  }
  if (norm === "NEEDS_ATTENTION" || norm === "WARNINGS") {
    return <Badge variant="needs_attention">Needs Attention</Badge>;
  }
  if (norm === "PROVISIONAL") {
    return <Badge variant="provisional">Provisional</Badge>;
  }
  if (norm === "FINAL") {
    return <Badge variant="final">Final Grade</Badge>;
  }
  if (norm === "MISSING") {
    return <Badge variant="missing">Missing</Badge>;
  }
  if (norm === "NOT_RECORDED") {
    return <Badge variant="not_recorded">Not Recorded</Badge>;
  }

  return <Badge variant="default">{status}</Badge>;
}
