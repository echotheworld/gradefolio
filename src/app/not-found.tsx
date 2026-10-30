import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404: This page could not be found.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white text-slate-900 selection:bg-[#2563EB] selection:text-white px-4">
      <div className="flex items-center divide-x divide-slate-300">
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight pr-4 sm:pr-6 text-slate-900">
          404
        </h1>
        <div className="pl-4 sm:pl-6">
          <p className="text-sm sm:text-base font-normal text-slate-600">
            This page could not be found.
          </p>
        </div>
      </div>
    </div>
  );
}
