"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "@/components/app-link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OPEN_PREFERENCES_EVENT, globalPrivacyControl, readConsent, writeConsent } from "@/lib/consent";
import type { ConsentChoice } from "./consent-preferences";

// The preferences dialog (Radix Dialog + Switch) loads only when someone opens it.
const ConsentPreferences = dynamic(() => import("./consent-preferences").then((m) => m.ConsentPreferences), { ssr: false });

/**
 * Cookie manager: GDPR-style opt-in for analytics/marketing, CCPA "Do Not Sell or
 * Share" opt-out, and automatic honoring of the Global Privacy Control signal.
 */
export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [open, setOpen] = useState(false);
  const [gpc, setGpc] = useState(false);
  const [choice, setChoice] = useState<ConsentChoice>({ analytics: false, marketing: false, doNotSell: false });

  useEffect(() => {
    const signal = globalPrivacyControl();
    setGpc(signal);
    const existing = readConsent();
    if (existing) {
      setChoice({ analytics: existing.analytics, marketing: existing.marketing && !signal, doNotSell: existing.doNotSell || signal });
    } else {
      setChoice({ analytics: false, marketing: false, doNotSell: signal });
      setShowBanner(true);
    }
    const openPrefs = () => {
      const current = readConsent();
      if (current) setChoice({ analytics: current.analytics, marketing: current.marketing, doNotSell: current.doNotSell || globalPrivacyControl() });
      setOpen(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
  }, []);

  const save = (state: ConsentChoice) => {
    const next = { ...state, marketing: state.marketing && !state.doNotSell };
    writeConsent(next);
    setChoice(next);
    setShowBanner(false);
    setOpen(false);
  };

  return (
    <>
      {showBanner && (
        <div role="region" aria-label="Cookie consent" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border bg-popover p-4 shadow-[var(--shadow-float)] sm:inset-x-6 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Cookie className="hidden size-8 shrink-0 text-copper-600 sm:block" aria-hidden />
            <p className="text-sm text-muted-foreground">
              We use essential cookies to run CITI VIEW, and — only with your permission — analytics and marketing cookies.{" "}
              {gpc && <span className="font-medium text-foreground">Your browser&apos;s Global Privacy Control signal is on, so we won&apos;t sell or share your data. </span>}
              See our <Link href="/legal/privacy" prefetch={false} className="font-medium text-primary underline underline-offset-4">Privacy Policy</Link>.
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="ghost" size="lg" onClick={() => setOpen(true)}>Customize</Button>
              <Button variant="outline" size="lg" onClick={() => save({ analytics: false, marketing: false, doNotSell: true })}>Reject non-essential</Button>
              <Button size="lg" onClick={() => save({ analytics: true, marketing: !gpc, doNotSell: gpc })}>Accept all</Button>
            </div>
          </div>
        </div>
      )}
      {open && <ConsentPreferences initial={choice} gpc={gpc} onSave={save} onClose={() => setOpen(false)} />}
    </>
  );
}
