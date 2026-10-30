import React from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";

export default function GlobalLoading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 space-y-4 animate-pulse">
      <BrandLogo size={44} className="w-11 h-11 ring-4 ring-blue-50" priority />
      <div className="w-32 h-2.5 bg-slate-200 rounded-full" />
    </div>
  );
}
