"use client";

import { useState } from "react";
import Link from "next/link";
import { BellPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SearchFilters } from "@/lib/search/filters";

export function SaveSearchButton({ filters, href, defaultName }: { filters: SearchFilters; href: string; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [frequency, setFrequency] = useState("DAILY");
  const [push, setPush] = useState(false);
  const [pending, setPending] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);

  const save = async () => {
    setPending(true);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || defaultName, filters, path: href, frequency, emailEnabled: frequency !== "NONE", pushEnabled: push }),
      });
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) throw new Error();
      toast.success("Search saved", { description: frequency === "NONE" ? "No alerts — you can turn them on any time." : "We'll email you when new homes match.", action: { label: "Manage", onClick: () => (window.location.href = "/account/saved-searches") } });
      setOpen(false);
    } catch {
      toast.error("Couldn't save this search. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setName(defaultName); setNeedsAuth(false); } }}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-9 shrink-0 rounded-full px-4">
          <BellPlus className="size-4" aria-hidden /> Save search
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save this search</DialogTitle>
          <DialogDescription>Get alerts when new listings, price cuts or open houses match.</DialogDescription>
        </DialogHeader>
        {needsAuth ? (
          <div className="space-y-3 rounded-xl border bg-muted/50 p-4 text-sm">
            <p>Sign in to save searches and receive alerts. It only takes a moment.</p>
            <Button asChild className="w-full" size="lg">
              <Link href={`/sign-in?callbackUrl=${encodeURIComponent(href)}`}>Sign in or create account</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ss-name">Name</Label>
              <Input id="ss-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-freq">Email alerts</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="ss-freq" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INSTANT">Instantly</SelectItem>
                  <SelectItem value="DAILY">Daily digest</SelectItem>
                  <SelectItem value="WEEKLY">Weekly digest</SelectItem>
                  <SelectItem value="NONE">No emails</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <Label htmlFor="ss-push" className="flex-col items-start gap-0 font-normal">
                <span className="font-medium">Push notifications</span>
                <span className="text-xs text-muted-foreground">On this device, when supported</span>
              </Label>
              <Switch id="ss-push" checked={push} onCheckedChange={setPush} />
            </div>
          </div>
        )}
        {!needsAuth && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Save search
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
