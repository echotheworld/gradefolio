"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // When pathname or searchParams change, navigation completed
  useEffect(() => {
    if (isVisible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept click on internal links to give instant feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        target.getAttribute("target") === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if it's an internal link
      try {
        const currentUrl = new URL(window.location.href);
        const nextUrl = new URL(href, window.location.origin);

        if (nextUrl.origin === currentUrl.origin) {
          // If clicking the current exact page and search, don't trigger
          if (nextUrl.pathname === currentUrl.pathname && nextUrl.search === currentUrl.search) {
            return;
          }

          // Trigger instant top navigation indicator
          setIsVisible(true);
          setProgress(25);

          const step1 = setTimeout(() => setProgress(65), 120);
          const step2 = setTimeout(() => setProgress(85), 400);

          return () => {
            clearTimeout(step1);
            clearTimeout(step2);
          };
        }
      } catch {
        // Ignore URL parse errors
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
    };
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page navigation progress"
      className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 shadow-[0_0_10px_rgba(59,130,246,0.6)] transition-all duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transitionProperty: "width, opacity",
          transitionDuration: progress === 100 ? "300ms" : "200ms",
        }}
      />
    </div>
  );
}
