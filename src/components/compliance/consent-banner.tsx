"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { OPEN_PREFERENCES_EVENT, globalPrivacyControl, readConsent, writeConsent } from "@/lib/consent";

/**
 * Cookie manager: GDPR-style opt-in for analytics/marketing, CCPA "Do Not Sell or
 * Share" opt-out, and automatic honoring of the Global Privacy Control signal.
 */
export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [open, setOpen] = useState(false);
  const [gpc, setGpc] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [doNotSell, setDoNotSell] = useState(false);

  useEffect(() => {
    const signal = globalPrivacyControl();
    setGpc(signal);
    const existing = readConsent();
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing && !signal);
      setDoNotSell(existing.doNotSell || signal);
    } else {
      setDoNotSell(signal);
      setShowBanner(true);
    }
    const openPrefs = () => {
      const current = readConsent();
      if (current) {
        setAnalytics(current.analytics);
        setMarketing(current.marketing);
        setDoNotSell(current.doNotSell || globalPrivacyControl());
      }
      setOpen(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
  }, []);

  const save = (state: { analytics: boolean; marketing: boolean; doNotSell: boolean }) => {
    writeConsent({ ...state, marketing: state.marketing && !state.doNotSell });
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
              See our <Link href="/legal/privacy" className="font-medium text-primary underline underline-offset-4">Privacy Policy</Link>.
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="ghost" size="lg" onClick={() => setOpen(true)}>Customize</Button>
              <Button variant="outline" size="lg" onClick={() => save({ analytics: false, marketing: false, doNotSell: true })}>Reject non-essential</Button>
              <Button size="lg" onClick={() => save({ analytics: true, marketing: !gpc, doNotSell: gpc })}>Accept all</Button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" aria-hidden /> Cookie & privacy preferences</DialogTitle>
            <DialogDescription>Choose which optional cookies CITI VIEW may use. You can change this any time from the footer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <PreferenceRow id="pref-necessary" label="Strictly necessary" description="Sign-in, security, saved preferences. Always on." checked disabled onChange={() => {}} />
            <PreferenceRow id="pref-analytics" label="Analytics" description="Anonymous usage statistics that help us improve search and listings." checked={analytics} onChange={setAnalytics} />
            <PreferenceRow id="pref-marketing" label="Marketing" description="Personalized ads and remarketing. Disabled while Do Not Sell or Share is on." checked={marketing && !doNotSell} disabled={doNotSell} onChange={setMarketing} />
            <PreferenceRow id="pref-dns" label="Do Not Sell or Share My Personal Information" description={gpc ? "Enabled automatically by your Global Privacy Control signal." : "California (CCPA/CPRA) and other state privacy rights."} checked={doNotSell} disabled={gpc} onChange={setDoNotSell} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => save({ analytics: false, marketing: false, doNotSell: true })}>Reject all optional</Button>
            <Button onClick={() => save({ analytics, marketing, doNotSell })}>Save preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreferenceRow(props: { id: string; label: string; description: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
      <div>
        <Label htmlFor={props.id} className="text-sm font-semibold">{props.label}</Label>
        <p className="mt-1 text-xs text-muted-foreground">{props.description}</p>
      </div>
      <Switch id={props.id} checked={props.checked} disabled={props.disabled} onCheckedChange={props.onChange} />
    </div>
  );
}
