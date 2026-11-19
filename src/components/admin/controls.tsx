"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, apiError } from "@/lib/api-client";
import { LEAD_STATUSES } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const selectCls = "h-8 rounded-md border bg-background px-2 text-sm disabled:opacity-60";

type Method = "PATCH" | "POST" | "PUT" | "DELETE";

/** Call an admin API, toast the outcome and refresh server components. */
export function useMutate() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async <T = Record<string, unknown>,>(url: string, method: Method, json: unknown, success?: string) => {
    setBusy(true);
    const res = await api<T>(url, { method, json });
    setBusy(false);
    if (!res.ok) {
      toast.error(apiError(res));
      return null;
    }
    if (success) toast.success(success);
    router.refresh();
    return res.data;
  };
  return { busy, run };
}

export function FeatureToggle({ id, featured }: { id: string; featured: boolean }) {
  const { busy, run } = useMutate();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      aria-pressed={featured}
      onClick={() => void run(`/api/admin/listings/${id}`, "PATCH", { flags: { isFeatured: !featured } }, featured ? "Removed from featured" : "Featured on the home page")}
      className={cn("gap-1.5", featured && "text-copper-600 dark:text-copper-400")}
    >
      <Star className={cn("size-4", featured && "fill-current")} aria-hidden />
      {featured ? "Featured" : "Feature"}
    </Button>
  );
}

const PLAN_LABEL = { FREE: "Free", PRO: "Pro", PREMIER: "Premier" } as const;

export function AgentControls({ id, name, plan, acceptingLeads, leadWeight }: { id: string; name: string; plan: keyof typeof PLAN_LABEL; acceptingLeads: boolean; leadWeight: number }) {
  const { busy, run } = useMutate();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor={`plan-${id}`}>Plan for {name}</label>
      <select id={`plan-${id}`} className={selectCls} defaultValue={plan} disabled={busy} onChange={(e) => void run(`/api/admin/agents/${id}`, "PATCH", { plan: e.target.value }, "Plan updated (billing unchanged)")}>
        {Object.entries(PLAN_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <label className="flex items-center gap-1.5 text-sm" htmlFor={`weight-${id}`}>
        Weight
        <select id={`weight-${id}`} className={selectCls} key={leadWeight} defaultValue={leadWeight} disabled={busy} onChange={(e) => void run(`/api/admin/agents/${id}`, "PATCH", { leadWeight: Number(e.target.value) }, "Lead weight updated")}>
          {[0, 1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm" htmlFor={`accepting-${id}`}>
        <Switch id={`accepting-${id}`} checked={acceptingLeads} disabled={busy} onCheckedChange={(v) => void run(`/api/admin/agents/${id}`, "PATCH", { acceptingLeads: v }, v ? "Receiving leads" : "Paused — no new leads")} />
        Leads
      </label>
    </div>
  );
}

export function LeadAssign({ id, agentId, status, agents }: { id: string; agentId: string | null; status: string; agents: Array<{ id: string; name: string }> }) {
  const { busy, run } = useMutate();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`assign-${id}`}>Assigned agent</label>
      <select id={`assign-${id}`} className={cn(selectCls, "max-w-48")} defaultValue={agentId ?? ""} disabled={busy} onChange={(e) => void run(`/api/admin/leads/${id}`, "PATCH", { agentId: e.target.value || null }, e.target.value ? "Lead reassigned — the agent was notified" : "Returned to the concierge queue")}>
        <option value="">Concierge queue</option>
        {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <label className="sr-only" htmlFor={`lead-status-${id}`}>Lead status</label>
      <select id={`lead-status-${id}`} className={selectCls} defaultValue={status} disabled={busy} onChange={(e) => void run(`/api/admin/leads/${id}`, "PATCH", { status: e.target.value }, "Status updated")}>
        {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
      </select>
    </div>
  );
}

export function ReportControls({ id }: { id: string }) {
  const { busy, run } = useMutate();
  const [note, setNote] = useState("");
  const act = (action: "dismiss" | "resolve" | "unpublish", msg: string) => void run(`/api/admin/reports/${id}`, "PATCH", { action, resolution: note || undefined }, msg);
  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`resolution-${id}`}>Resolution note</label>
      <Input id={`resolution-${id}`} placeholder="Resolution note (internal)" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className="h-8 text-sm" />
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => act("unpublish", "Listing taken off market")}>Unpublish listing</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => act("resolve", "Report resolved")}>Resolve</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("dismiss", "Report dismissed")}>Dismiss</Button>
      </div>
    </div>
  );
}

/** Permanent delete behind a typed confirmation. */
export function DeleteButton({ url, what, redirectTo }: { url: string; what: string; redirectTo: string }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setBusy(true);
    const res = await api(url, { method: "DELETE", json: { confirm: "DELETE" } });
    setBusy(false);
    if (!res.ok) return toast.error(apiError(res));
    toast.success(`Deleted ${what}`);
    router.push(redirectTo);
    router.refresh();
  };
  return (
    <Dialog onOpenChange={() => setTyped("")}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="size-4" aria-hidden /> Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {what}?</DialogTitle>
          <DialogDescription>This permanently removes it and can&apos;t be undone. Unpublishing or taking it off market keeps the history instead.</DialogDescription>
        </DialogHeader>
        <label className="text-sm font-medium" htmlFor="confirm-delete">Type DELETE to confirm</label>
        <Input id="confirm-delete" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
          <Button variant="destructive" disabled={typed !== "DELETE" || busy} onClick={remove}>
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
