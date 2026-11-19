"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ROUTING_STRATEGIES, type SettingUpdate } from "@/lib/validation/admin";
import { selectCls, useMutate } from "./controls";

function SaveButton({ busy, children = "Save" }: { busy: boolean; children?: React.ReactNode }) {
  return <Button type="submit" size="sm" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {children}</Button>;
}

function useSave() {
  const { busy, run } = useMutate();
  return { busy, save: (s: SettingUpdate, msg = "Saved") => void run("/api/admin/settings", "PUT", s, msg) };
}

type TextKey = "compliance.idxDisclaimer" | "compliance.listingDisclaimer" | "compliance.fairHousing" | "site.demoBanner";

export function TextSetting({ settingKey, label, help, value, rows = 4 }: { settingKey: TextKey; label: string; help?: string; value: string; rows?: number }) {
  const { busy, save } = useSave();
  const [text, setText] = useState(value);
  const id = `setting-${settingKey.replace(".", "-")}`;
  return (
    <form onSubmit={(e) => { e.preventDefault(); save({ key: settingKey, value: text } as SettingUpdate, `${label} saved`); }} className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {help && <p id={`${id}-help`} className="text-xs text-muted-foreground">{help}</p>}
      <Textarea id={id} rows={rows} value={text} onChange={(e) => setText(e.target.value)} aria-describedby={help ? `${id}-help` : undefined} />
      <SaveButton busy={busy} />
    </form>
  );
}

export function BrokerageSetting({ value }: { value: { name: string; licenses: string[]; address: string; phone: string } }) {
  const { busy, save } = useSave();
  const [form, setForm] = useState({ ...value, licensesText: value.licenses.join("\n") });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ key: "compliance.brokerage", value: { name: form.name, licenses: form.licensesText.split("\n").map((s) => s.trim()).filter(Boolean), address: form.address, phone: form.phone } }, "Brokerage of record saved");
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="brk-name" className="mb-1 block text-sm font-medium">Brokerage name</label>
          <Input id="brk-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="brk-phone" className="mb-1 block text-sm font-medium">Phone</label>
          <Input id="brk-phone" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
      </div>
      <div>
        <label htmlFor="brk-address" className="mb-1 block text-sm font-medium">Office address</label>
        <Input id="brk-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="brk-licenses" className="mb-1 block text-sm font-medium">License numbers (one per line, e.g. “TX #9000000”)</label>
        <Textarea id="brk-licenses" rows={3} value={form.licensesText} onChange={(e) => setForm((f) => ({ ...f, licensesText: e.target.value }))} />
      </div>
      <SaveButton busy={busy} />
    </form>
  );
}

export function RoutingSetting({ value }: { value: { strategy: string; preferListingAgent: boolean; slaMinutes: number } }) {
  const { busy, save } = useSave();
  const [form, setForm] = useState({ ...value, sla: String(value.slaMinutes) });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save({ key: "leads.routing", value: { strategy: form.strategy as "weighted-round-robin" | "round-robin", preferListingAgent: form.preferListingAgent, slaMinutes: Math.max(1, Number(form.sla) || 15) } }, "Lead routing saved");
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="rt-strategy" className="mb-1 block text-sm font-medium">Strategy</label>
          <select id="rt-strategy" className={`${selectCls} h-9 w-full`} value={form.strategy} onChange={(e) => setForm((f) => ({ ...f, strategy: e.target.value }))}>
            {ROUTING_STRATEGIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rt-sla" className="mb-1 block text-sm font-medium">Response target (minutes)</label>
          <Input id="rt-sla" inputMode="numeric" value={form.sla} onChange={(e) => setForm((f) => ({ ...f, sla: e.target.value }))} />
        </div>
      </div>
      <label htmlFor="rt-prefer" className="flex items-center gap-2 text-sm">
        <Switch id="rt-prefer" checked={form.preferListingAgent} onCheckedChange={(v) => setForm((f) => ({ ...f, preferListingAgent: v }))} />
        Send listing inquiries to the listing agent first
      </label>
      <SaveButton busy={busy} />
    </form>
  );
}

export function StateNotices({ states }: { states: Array<{ code: string; name: string; notice: string | null }> }) {
  const { busy, save } = useSave();
  const [code, setCode] = useState(states[0]?.code ?? "");
  const [drafts, setDrafts] = useState(() => Object.fromEntries(states.map((s) => [s.code, s.notice ?? ""])));
  const current = states.find((s) => s.code === code);
  return (
    <form onSubmit={(e) => { e.preventDefault(); save({ key: "state.notice", code, value: drafts[code] ?? "" }, `${current?.name ?? code} notice saved`); }} className="space-y-3">
      <div>
        <label htmlFor="st-code" className="mb-1 block text-sm font-medium">State</label>
        <select id="st-code" className={`${selectCls} h-9`} value={code} onChange={(e) => setCode(e.target.value)}>
          {states.map((s) => <option key={s.code} value={s.code}>{s.name}{s.notice ? "" : " (none)"}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="st-notice" className="mb-1 block text-sm font-medium">Required notice for {current?.name}</label>
        <Textarea id="st-notice" rows={4} value={drafts[code] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [code]: e.target.value }))} placeholder="e.g. the Texas Information About Brokerage Services and Consumer Protection Notice links" />
      </div>
      <SaveButton busy={busy} />
    </form>
  );
}
