"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flag, Loader2, NotebookPen, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { AddToCollectionButton } from "@/components/account/collection-dialogs";
import { pushRecent, type RecentEntry } from "@/lib/recent";
import { SaveButton } from "./save-button";

const REASONS: Array<[string, string]> = [
  ["INACCURATE_INFO", "Incorrect information"],
  ["SCAM_OR_FRAUD", "Possible scam or fraud"],
  ["DISCRIMINATORY_LANGUAGE", "Discriminatory language"],
  ["NO_LONGER_AVAILABLE", "No longer available"],
  ["DUPLICATE", "Duplicate listing"],
  ["INAPPROPRIATE_MEDIA", "Inappropriate photos"],
  ["OTHER", "Something else"],
];

export function ListingActions({ listingId, title }: { listingId: string; title: string }) {
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      /* user cancelled */
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 print:hidden">
      <SaveButton listingId={listingId} label={title} size="lg" className="border bg-background shadow-none" />
      <AddToCollectionButton listingId={listingId} />
      <Button variant="outline" size="lg" className="h-11 rounded-full" onClick={share}><Share2 className="size-4" aria-hidden /> Share</Button>
      <Button variant="outline" size="lg" className="h-11 rounded-full" onClick={() => window.print()}><Printer className="size-4" aria-hidden /> Print</Button>
      <NotesButton listingId={listingId} />
      <ReportButton listingId={listingId} />
    </div>
  );
}

function NotesButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "auth" | "saving">("idle");
  useEffect(() => {
    if (!open) return;
    setState("loading");
    fetch(`/api/notes/${listingId}`)
      .then(async (r) => {
        if (r.status === 401) return setState("auth");
        const data = (await r.json()) as { body?: string };
        setBody(data.body ?? "");
        setState("idle");
      })
      .catch(() => setState("idle"));
  }, [open, listingId]);
  const save = async () => {
    setState("saving");
    const r = await fetch(`/api/notes/${listingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    if (r.status === 401) return setState("auth");
    setState("idle");
    if (r.ok) {
      toast.success("Note saved — only you can see it");
      setOpen(false);
    } else toast.error("Couldn't save your note");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="h-11 rounded-full"><NotebookPen className="size-4" aria-hidden /> Notes</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Private notes</DialogTitle>
          <DialogDescription>Only you can see these. Shared notes for co-shoppers live in collections.</DialogDescription>
        </DialogHeader>
        {state === "auth" ? (
          <div className="space-y-3 rounded-xl border bg-muted/50 p-4 text-sm">
            <p>Sign in to keep private notes on homes you&apos;re considering.</p>
            <Button asChild className="w-full"><Link href={`/sign-in?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}>Sign in</Link></Button>
          </div>
        ) : (
          <>
            <Label htmlFor="note-body" className="sr-only">Note</Label>
            <Textarea id="note-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Ask about the roof age; loved the kitchen light." disabled={state === "loading"} maxLength={5000} />
            <DialogFooter>
              <Button onClick={save} disabled={state === "saving" || state === "loading"}>{state === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />} Save note</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("INACCURATE_INFO");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async () => {
    setPending(true);
    const r = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, reason, details, email }) });
    setPending(false);
    if (r.ok) {
      toast.success("Thanks — our moderation team will review this listing.");
      setOpen(false);
      setDetails("");
    } else toast.error(r.status === 429 ? "You've sent several reports — try again later." : "Couldn't send the report.");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="lg" className="h-11 rounded-full text-muted-foreground"><Flag className="size-4" aria-hidden /> Report</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
          <DialogDescription>Tell us what&apos;s wrong. Suspected scams are reviewed first.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={setReason} className="gap-2">
          {REASONS.map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem id={`rr-${value}`} value={value} />
              <Label htmlFor={`rr-${value}`} className="font-normal">{label}</Label>
            </div>
          ))}
        </RadioGroup>
        <div className="space-y-1.5">
          <Label htmlFor="rr-details">Details (optional)</Label>
          <Textarea id="rr-details" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rr-email">Your email (optional, for follow-up)</Label>
          <Input id="rr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Send report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Records the view (analytics + recently viewed). Renders nothing. */
export function ViewTracker({ entry }: { entry: Omit<RecentEntry, "ts"> }) {
  useEffect(() => {
    pushRecent(entry);
    const t = setTimeout(() => {
      void fetch(`/api/listings/${entry.id}/view`, { method: "POST", keepalive: true }).catch(() => undefined);
    }, 1200);
    return () => clearTimeout(t);
  }, [entry]);
  return null;
}
