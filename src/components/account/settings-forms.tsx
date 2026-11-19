"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { BellRing, Download, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api, apiError } from "@/lib/api-client";
import { disablePush, enablePush, getPushState, PUSH_STATE_HINT, type PushState } from "@/lib/push-client";
import { signOutAction } from "@/server/actions/auth";

const ProfileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  phone: z.string().trim().max(30).regex(/^[0-9+().\-\s]*$/, "Use digits and + ( ) - only"),
});
type ProfileValues = z.infer<typeof ProfileSchema>;

export function ProfileForm({ defaults, email }: { defaults: ProfileValues; email: string | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const form = useForm<ProfileValues>({ resolver: zodResolver(ProfileSchema), defaultValues: defaults });
  const { errors, isSubmitting, isDirty } = form.formState;
  const submit = form.handleSubmit(async (values) => {
    const r = await api("/api/account", { method: "PATCH", json: values });
    if (!r.ok) return void toast.error(apiError(r));
    toast.success("Profile updated");
    form.reset(values);
    void qc.invalidateQueries({ queryKey: ["me"] });
    router.refresh();
  });
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="pf-name">Full name</Label>
        <Input id="pf-name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "pf-name-err" : undefined} {...form.register("name")} />
        {errors.name && <p id="pf-name-err" className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pf-phone">Phone</Label>
        <Input id="pf-phone" type="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "pf-phone-err" : undefined} {...form.register("phone")} />
        {errors.phone && <p id="pf-phone-err" className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="pf-email">Email</Label>
        <Input id="pf-email" value={email ?? ""} readOnly disabled />
        <p className="text-xs text-muted-foreground">Your email is your sign-in. Contact support to change it.</p>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting || !isDirty}>{isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />} Save profile</Button>
      </div>
    </form>
  );
}

export interface PrefsValues {
  emailListingAlerts: boolean;
  pushListingAlerts: boolean;
  emailPriceDrops: boolean;
  emailTourUpdates: boolean;
  emailMessages: boolean;
  emailNewsletter: boolean;
  alertDigest: "INSTANT" | "DAILY" | "WEEKLY" | "NONE";
}

const PREF_ROWS: Array<[keyof Omit<PrefsValues, "alertDigest">, string, string]> = [
  ["emailListingAlerts", "New listings for saved searches", "Emails when homes match a saved search"],
  ["emailPriceDrops", "Price drops on saved homes", "Emails when a home you saved gets cheaper"],
  ["emailTourUpdates", "Tour updates", "Confirmations and changes from agents"],
  ["emailMessages", "Messages", "Email me when someone replies"],
  ["pushListingAlerts", "Push alerts", "Alerts on devices where you've enabled push"],
  ["emailNewsletter", "Market newsletter", "Monthly market insights and guides"],
];

export function NotificationPrefsForm({ initial }: { initial: PrefsValues }) {
  const [prefs, setPrefs] = useState(initial);
  const update = async (change: Partial<PrefsValues>) => {
    const before = prefs;
    setPrefs((p) => ({ ...p, ...change }));
    const r = await api("/api/account/preferences", { method: "PATCH", json: change });
    if (!r.ok) {
      setPrefs(before);
      toast.error(apiError(r));
    }
  };
  return (
    <div className="divide-y">
      {PREF_ROWS.map(([key, label, hint]) => (
        <div key={key} className="flex items-center justify-between gap-4 py-3.5">
          <Label htmlFor={`pref-${key}`} className="flex-col items-start gap-0.5 font-normal">
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">{hint}</span>
          </Label>
          <Switch id={`pref-${key}`} checked={prefs[key]} onCheckedChange={(v) => update({ [key]: v })} />
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-4 py-3.5">
        <Label htmlFor="pref-digest" className="flex-col items-start gap-0.5 font-normal">
          <span className="text-sm font-medium">Default alert frequency</span>
          <span className="text-xs text-muted-foreground">Used for new saved searches</span>
        </Label>
        <Select value={prefs.alertDigest} onValueChange={(v) => update({ alertDigest: v as PrefsValues["alertDigest"] })}>
          <SelectTrigger id="pref-digest" className="w-40"><SelectValue>{{ INSTANT: "Instantly", DAILY: "Daily digest", WEEKLY: "Weekly digest", NONE: "Off" }[prefs.alertDigest]}</SelectValue></SelectTrigger>
          <SelectContent>
            <SelectItem value="INSTANT">Instantly</SelectItem>
            <SelectItem value="DAILY">Daily digest</SelectItem>
            <SelectItem value="WEEKLY">Weekly digest</SelectItem>
            <SelectItem value="NONE">Off</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function PushDeviceCard() {
  const [state, setState] = useState<PushState | "loading" | "error">("loading");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    void getPushState().then(setState);
  }, []);
  const turnOn = async () => {
    setPending(true);
    const result = await enablePush();
    setPending(false);
    setState(result);
    if (result === "enabled") toast.success("Push notifications enabled on this browser");
    else toast(PUSH_STATE_HINT[result]);
  };
  const turnOff = async () => {
    setPending(true);
    await disablePush();
    setPending(false);
    setState("disabled");
  };
  const test = async () => {
    const r = await api<{ sent: number }>("/api/push/test", { method: "POST" });
    if (!r.ok) return toast.error(apiError(r));
    toast.success(r.data.sent ? "Test notification sent" : "No devices are subscribed yet");
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <BellRing className="size-5 text-muted-foreground" aria-hidden />
      <p className="min-w-0 flex-1 text-sm" aria-live="polite">{state === "loading" ? "Checking this browser…" : PUSH_STATE_HINT[state]}</p>
      {state === "enabled" ? (
        <>
          <Button variant="outline" size="lg" onClick={test}><Send className="size-4" aria-hidden /> Send test</Button>
          <Button variant="ghost" size="lg" onClick={turnOff} disabled={pending}>Turn off</Button>
        </>
      ) : (
        <Button size="lg" onClick={turnOn} disabled={pending || state === "loading" || state === "unsupported" || state === "unconfigured" || state === "denied"}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Enable push
        </Button>
      )}
    </div>
  );
}

export function DataControls({ isDemo }: { isDemo: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const remove = async () => {
    setPending(true);
    const r = await api("/api/account", { method: "DELETE", json: { confirm } });
    if (!r.ok) {
      setPending(false);
      return toast.error(apiError(r));
    }
    toast.success("Your account was deleted");
    await signOutAction();
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="lg">
        <a href="/api/account/export" download><Download className="size-4" aria-hidden /> Download my data</a>
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); setConfirm(""); }}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="lg"><Trash2 className="size-4" aria-hidden /> Delete account</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your profile, saved homes, collections, searches, notes, messages and rental applications. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          {isDemo ? (
            <p className="rounded-xl bg-muted p-3 text-sm">Demo accounts are shared by everyone trying CITI VIEW, so they can&apos;t be deleted. Sign in with your own email to try this.</p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="del-confirm">Type DELETE to confirm</Label>
              <Input id="del-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={remove} disabled={isDemo || confirm !== "DELETE" || pending}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Delete forever</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ClearHistoryButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      size="lg"
      className="rounded-full"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const r = await api("/api/account/history", { method: "DELETE" });
        setPending(false);
        if (!r.ok) return toast.error(apiError(r));
        try {
          localStorage.removeItem("cv_recent_v1");
        } catch {}
        toast.success("Viewing history cleared");
        router.refresh();
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />} Clear history
    </Button>
  );
}
