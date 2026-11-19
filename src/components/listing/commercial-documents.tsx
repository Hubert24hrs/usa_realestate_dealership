"use client";

import { useState } from "react";
import { FileLock2, FileText, Loader2, LockOpen, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DocRow {
  id: string;
  name: string;
  kind: string;
  requiresNda: boolean;
  pages: number | null;
  sizeKb: number | null;
}

export function CommercialDocuments({ listingId, documents, initiallyUnlocked }: { listingId: string; documents: DocRow[]; initiallyUnlocked: boolean }) {
  const [unlocked, setUnlocked] = useState(initiallyUnlocked);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "Principal", signature: "", accept: false });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLocked = documents.some((d) => d.requiresNda);

  const sign = async () => {
    setPending(true);
    setError(null);
    const res = await fetch("/api/nda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, ...form }) });
    setPending(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string; issues?: Array<{ message: string }> };
      setError(body.issues?.[0]?.message ?? body.error ?? "Please complete every field.");
      return;
    }
    setUnlocked(true);
    setOpen(false);
    toast.success("Confidentiality agreement signed — documents unlocked.");
  };

  return (
    <div>
      <ul className="divide-y rounded-2xl border">
        {documents.map((d) => {
          const locked = d.requiresNda && !unlocked;
          return (
            <li key={d.id} className="flex items-center gap-3 p-3">
              {locked ? <FileLock2 className="size-5 text-muted-foreground" aria-hidden /> : <FileText className="size-5 text-primary" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">PDF{d.pages ? ` · ${d.pages} pages` : ""}{d.sizeKb ? ` · ${(d.sizeKb / 1024).toFixed(1)} MB` : ""}{d.requiresNda ? " · NDA required" : ""}</p>
              </div>
              {locked ? (
                <Button size="sm" variant="outline" onClick={() => setOpen(true)}><FileLock2 className="size-3.5" aria-hidden /> Sign NDA</Button>
              ) : (
                <Button asChild size="sm" variant="outline"><a href={`/api/documents/${d.id}`} target="_blank" rel="noopener">Open</a></Button>
              )}
            </li>
          );
        })}
      </ul>
      {hasLocked && !unlocked && (
        <Button className="mt-3 w-full sm:w-auto" onClick={() => setOpen(true)}><ShieldCheck className="size-4" aria-hidden /> Request offering memorandum</Button>
      )}
      {unlocked && hasLocked && <p className="mt-3 flex items-center gap-1.5 text-sm text-success"><LockOpen className="size-4" aria-hidden /> NDA on file — confidential documents unlocked for this browser.</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confidentiality agreement</DialogTitle>
            <DialogDescription>Sign to access the offering memorandum, rent roll and financials. The listing broker receives your request.</DialogDescription>
          </DialogHeader>
          <div className="max-h-36 overflow-y-auto rounded-xl border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            You agree to keep all information about this property confidential, to use it solely to evaluate a potential transaction, not to contact tenants, owners or property staff directly, and to return or destroy materials on request. Information is provided as-is without warranty. This demo agreement illustrates the CITI VIEW NDA flow and is not a legal contract.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="nda-name">Full name</Label><Input id="nda-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></div>
            <div className="space-y-1.5"><Label htmlFor="nda-email">Email</Label><Input id="nda-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></div>
            <div className="space-y-1.5"><Label htmlFor="nda-company">Company</Label><Input id="nda-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} autoComplete="organization" /></div>
            <div className="space-y-1.5">
              <Label htmlFor="nda-role">Your role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger id="nda-role" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{["Principal", "Broker", "Lender", "Advisor", "Other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nda-sign">Type your full name to sign</Label>
              <Input id="nda-sign" value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} className="font-display text-lg italic" placeholder={form.name || "Your name"} />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={form.accept} onCheckedChange={(v) => setForm({ ...form, accept: v === true })} className="mt-0.5" />
            I agree to the confidentiality terms and to sign electronically.
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button onClick={sign} disabled={pending || !form.accept}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Sign & unlock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
