"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { LineChart } from "@/components/charts/line-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError } from "@/lib/api-client";
import { LEAD_STATUSES } from "@/lib/domain";
import { formatMoney } from "@/lib/format";

const selectCls = "h-8 rounded-md border bg-background px-2 text-sm disabled:opacity-60";

function useMutate() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (url: string, method: "PATCH" | "POST", json: unknown, success?: string) => {
    setBusy(true);
    const res = await api(url, { method, json });
    setBusy(false);
    if (!res.ok) {
      toast.error(apiError(res));
      return false;
    }
    if (success) toast.success(success);
    router.refresh();
    return true;
  };
  return { busy, run };
}

export function LeadControls({ id, status, note }: { id: string; status: string; note: string }) {
  const { busy, run } = useMutate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`lead-status-${id}`}>Lead status</label>
      <select id={`lead-status-${id}`} className={selectCls} defaultValue={status} disabled={busy} onChange={(e) => void run(`/api/agent/leads/${id}`, "PATCH", { status: e.target.value }, "Status updated")}>
        {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
      </select>
      {editing ? (
        <div className="space-y-1.5">
          <label className="sr-only" htmlFor={`lead-note-${id}`}>Private note</label>
          <Textarea id={`lead-note-${id}`} rows={2} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-0 text-sm" />
          <div className="flex gap-1.5">
            <Button size="sm" disabled={busy} onClick={async () => (await run(`/api/agent/leads/${id}`, "PATCH", { note: draft }, "Note saved")) && setEditing(false)}>
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />} Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setDraft(note); setEditing(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground">
          <Pencil className="size-3" aria-hidden /> {note ? note : "Add a private note"}
        </button>
      )}
    </div>
  );
}

const SALE_STATUSES = ["ACTIVE", "COMING_SOON", "PENDING", "SOLD", "OFF_MARKET"] as const;
const RENT_STATUSES = ["ACTIVE", "COMING_SOON", "RENTED", "OFF_MARKET"] as const;
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Active", COMING_SOON: "Coming soon", PENDING: "Pending", SOLD: "Sold", RENTED: "Rented", OFF_MARKET: "Off market", DRAFT: "Draft" };

export function ListingControls({ id, status, price, rental }: { id: string; status: string; price: number; rental: boolean }) {
  const { busy, run } = useMutate();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(price));
  const statuses = rental ? RENT_STATUSES : SALE_STATUSES;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`listing-status-${id}`}>Listing status</label>
      <select id={`listing-status-${id}`} className={selectCls} defaultValue={status} disabled={busy} onChange={(e) => void run(`/api/listings/${id}/manage`, "PATCH", { status: e.target.value }, "Status updated")}>
        {!(statuses as readonly string[]).includes(status) && <option value={status}>{STATUS_LABEL[status] ?? status}</option>}
        {statuses.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      {editing ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={async (e) => {
            e.preventDefault();
            const n = Number(value.replace(/[^\d]/g, ""));
            if (!n) return toast.error("Enter a price");
            if (await run(`/api/listings/${id}/manage`, "PATCH", { price: n }, n < price ? "Price reduced — saved-search alerts will notify followers" : "Price updated")) setEditing(false);
          }}
        >
          <label className="sr-only" htmlFor={`listing-price-${id}`}>New price</label>
          <Input id={`listing-price-${id}`} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} className="h-8 w-28 text-sm" />
          <Button size="sm" type="submit" disabled={busy}>{busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : "Save"}</Button>
          <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </form>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit price <span className="sr-only">({formatMoney(price)})</span></Button>
      )}
    </div>
  );
}

export function TourControls({ id, status }: { id: string; status: string }) {
  const { busy, run } = useMutate();
  if (status === "CANCELLED" || status === "COMPLETED") return null;
  const act = (action: "confirm" | "complete" | "cancel", msg: string) => void run(`/api/tours/${id}`, "PATCH", { action }, msg);
  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "REQUESTED" && <Button size="sm" disabled={busy} onClick={() => act("confirm", "Tour confirmed — the buyer was notified")}>Confirm</Button>}
      {status === "CONFIRMED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => act("complete", "Marked complete")}>Mark complete</Button>}
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => act("cancel", "Tour cancelled")}>Cancel</Button>
    </div>
  );
}

export function ApplicationControls({ id, status }: { id: string; status: string }) {
  const { busy, run } = useMutate();
  const [note, setNote] = useState("");
  if (!["SUBMITTED", "UNDER_REVIEW"].includes(status)) return null;
  const decide = (decision: "UNDER_REVIEW" | "APPROVED" | "DENIED", msg: string) => void run(`/api/agent/applications/${id}`, "POST", { decision, note: note || undefined }, msg);
  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`app-note-${id}`}>Note to applicant</label>
      <Input id={`app-note-${id}`} placeholder="Optional note to the applicant" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} className="h-8 text-sm" />
      <div className="flex flex-wrap gap-1.5">
        {status === "SUBMITTED" && <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("UNDER_REVIEW", "Marked under review")}>Start review</Button>}
        <Button size="sm" disabled={busy} onClick={() => decide("APPROVED", "Approved — lease sent for signature")}>Approve & send lease</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => decide("DENIED", "Application declined")}>Decline</Button>
      </div>
    </div>
  );
}

export function DailyChart({ labels, series, caption }: { labels: string[]; series: Array<{ key: string; label: string; values: number[] }>; caption: string }) {
  const colors = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)"];
  return (
    <LineChart
      labels={labels}
      series={series.map((s, i) => ({ ...s, color: colors[i]! }))}
      format={(v) => Math.round(v).toLocaleString("en-US")}
      includeZero
      height={220}
      ariaLabel={caption}
      caption={caption}
    />
  );
}
