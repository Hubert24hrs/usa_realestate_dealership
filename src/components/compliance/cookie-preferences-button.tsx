"use client";

import { openCookiePreferences } from "@/lib/consent";

export function CookiePreferencesButton({ className, children = "Cookie preferences" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className}>
      {children}
    </button>
  );
}
