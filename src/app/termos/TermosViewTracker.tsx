"use client";

import { useEffect } from "react";
import { trackTermsView } from "@/src/lib/analytics";

export function TermosViewTracker() {
  useEffect(() => {
    trackTermsView();
  }, []);
  return null;
}
