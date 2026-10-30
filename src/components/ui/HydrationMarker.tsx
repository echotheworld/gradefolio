"use client";

import { useEffect } from "react";
import { markHydrationComplete } from "@/lib/client-cache";

/**
 * Flips the client-cache hydration gate after the first client commit.
 * Before this runs, getCachedData() returns null so hydration matches SSR output.
 */
export function HydrationMarker() {
  useEffect(() => {
    markHydrationComplete();
  }, []);
  return null;
}
