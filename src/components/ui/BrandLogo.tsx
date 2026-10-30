import React from "react";
import Image from "next/image";

interface BrandLogoProps {
  size?: number;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}

export function BrandLogo({
  size = 40,
  className = "w-10 h-10",
  imageClassName = "object-contain",
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={`relative shrink-0 flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-2xs border border-slate-200/80 p-1 ring-4 ring-blue-500/10 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Image
        src="/favicon_io/android-chrome-192x192.png"
        alt="Gradefolio Logo"
        width={size * 2}
        height={size * 2}
        priority={priority}
        className={`w-full h-full ${imageClassName}`}
      />
    </div>
  );
}
