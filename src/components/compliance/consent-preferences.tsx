"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface ConsentChoice {
  analytics: boolean;
  marketing: boolean;
  doNotSell: boolean;
}

/** Cookie preferences dialog. Loaded on demand (see ConsentBanner) so its dialog code isn't on every page. */
export function ConsentPreferences({ initial, gpc, onSave, onClose }: { initial: ConsentChoice; gpc: boolean; onSave: (c: ConsentChoice) => void; onClose: () => void }) {
  const [analytics, setAnalytics] = useState(initial.analytics);
  const [marketing, setMarketing] = useState(initial.marketing);
  const [doNotSell, setDoNotSell] = useState(initial.doNotSell);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" aria-hidden /> Cookie & privacy preferences</DialogTitle>
          <DialogDescription>Choose which optional cookies CITI VIEW may use. You can change this any time from the footer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <PreferenceRow id="pref-necessary" label="Strictly necessary" description="Sign in, security, saved preferences. Always on." checked disabled onChange={() => {}} />
          <PreferenceRow id="pref-analytics" label="Analytics" description="Anonymous usage statistics that help us improve search and listings." checked={analytics} onChange={setAnalytics} />
          <PreferenceRow id="pref-marketing" label="Marketing" description="Personalized ads and remarketing. Disabled while Do Not Sell or Share is on." checked={marketing && !doNotSell} disabled={doNotSell} onChange={setMarketing} />
          <PreferenceRow id="pref-dns" label="Do Not Sell or Share My Personal Information" description={gpc ? "Enabled automatically by your Global Privacy Control signal." : "California (CCPA/CPRA) and other state privacy rights."} checked={doNotSell} disabled={gpc} onChange={setDoNotSell} />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onSave({ analytics: false, marketing: false, doNotSell: true })}>Reject all optional</Button>
          <Button onClick={() => onSave({ analytics, marketing, doNotSell })}>Save preferences</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
