"use client";

import { useState } from "react";
import { FlaskConical, Info, X } from "lucide-react";
import { SITE_NOTICE_KEY } from "./site-notice-script";

// Server-rendered so it never pops in and shifts the page; see site-notice-script.ts for the hide before first paint.

export function SiteNotice({ text }: { text: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    // min-height fits three lines on phones (the fallback font wraps wider), so a font swap never resizes it.
    <div data-site-notice className="relative bg-brand-950 text-[0.8rem] text-white dark:bg-brand-100 dark:text-brand-950">
      <div className="container-page flex min-h-16 items-center justify-center gap-2 py-1.5 pr-10 text-center sm:min-h-9">
        <Info className="size-3.5 shrink-0 text-copper-300 dark:text-copper-700" aria-hidden />
        <p>{text}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem(SITE_NOTICE_KEY, "1");
          } catch {}
        }}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 opacity-80 hover:bg-white/10 hover:opacity-100"
        aria-label="Dismiss notice"
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border border-dashed border-copper-500/60 bg-copper-50 px-2 py-0.5 text-[0.68rem] font-semibold tracking-wide text-copper-800 uppercase dark:bg-copper-50/10 dark:text-copper-600 ${className}`}>
      <FlaskConical className="size-3" aria-hidden /> Sample
    </span>
  );
}
