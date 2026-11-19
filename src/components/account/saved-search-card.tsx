"use client";

import { useState } from "react";
import Link from "@/components/app-link";
import { useRouter } from "next/navigation";
import { ArrowRight, BellRing, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api, apiError } from "@/lib/api-client";
import { enablePush, getPushState, PUSH_STATE_HINT } from "@/lib/push-client";

type Frequency = "INSTANT" | "DAILY" | "WEEKLY" | "NONE";

const FREQUENCY_LABEL: Record<Frequency, string> = { INSTANT: "Instant alerts", DAILY: "Daily digest", WEEKLY: "Weekly digest", NONE: "Alerts off" };

export interface SavedSearchView {
  id: string;
  name: string;
  path: string;
  chips: string[];
  frequency: Frequency;
  emailEnabled: boolean;
  pushEnabled: boolean;
  matchCount: number;
  meta: string;
}

export function SavedSearchCard({ search }: { search: SavedSearchView }) {
  const router = useRouter();
  const [state, setState] = useState(search);
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(search.name);
  const [deleting, setDeleting] = useState(false);

  const patch = async (change: Partial<Pick<SavedSearchView, "name" | "frequency" | "emailEnabled" | "pushEnabled">>) => {
    const before = state;
    setState((s) => ({ ...s, ...change }));
    const r = await api(`/api/saved-searches/${search.id}`, { method: "PATCH", json: change });
    if (!r.ok) {
      setState(before);
      toast.error(apiError(r));
      return false;
    }
    return true;
  };

  const togglePush = async (on: boolean) => {
    if (on && (await getPushState()) !== "enabled") {
      const result = await enablePush();
      if (result !== "enabled") return toast(PUSH_STATE_HINT[result]);
    }
    if (await patch({ pushEnabled: on })) toast.success(on ? "Push alerts on for this search" : "Push alerts off");
  };

  const remove = async () => {
    setDeleting(true);
    const r = await api(`/api/saved-searches/${search.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!r.ok) return toast.error(apiError(r));
    toast.success("Saved search deleted");
    router.refresh();
  };

  return (
    <article className="rounded-3xl border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">
            <Link href={state.path} className="hover:underline">{state.name}</Link>
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{search.meta}</p>
        </div>
        <Button asChild size="lg" variant="outline" className="rounded-full">
          <Link href={state.path}>
            {search.matchCount.toLocaleString("en-US")} {search.matchCount === 1 ? "home" : "homes"} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
      {search.chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Filters">
          {search.chips.map((chip) => (
            <li key={chip} className="rounded-full border bg-background px-2.5 py-1 text-xs">{chip}</li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-4">
        <div className="flex items-center gap-2">
          <BellRing className="size-4 text-muted-foreground" aria-hidden />
          <Label htmlFor={`freq-${search.id}`} className="sr-only">Alert frequency</Label>
          <Select value={state.frequency} onValueChange={(v) => patch({ frequency: v as Frequency })}>
            <SelectTrigger id={`freq-${search.id}`} className="h-8 w-40"><SelectValue>{FREQUENCY_LABEL[state.frequency]}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="INSTANT">Instant alerts</SelectItem>
              <SelectItem value="DAILY">Daily digest</SelectItem>
              <SelectItem value="WEEKLY">Weekly digest</SelectItem>
              <SelectItem value="NONE">Alerts off</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={state.emailEnabled} onCheckedChange={(v) => patch({ emailEnabled: v })} disabled={state.frequency === "NONE"} /> Email
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={state.pushEnabled} onCheckedChange={togglePush} disabled={state.frequency === "NONE"} /> Push
        </label>
        <div className="ml-auto flex gap-1">
          <Dialog open={renameOpen} onOpenChange={(v) => { setRenameOpen(v); if (v) setName(state.name); }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm"><Pencil className="size-3.5" aria-hidden /> Rename</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <form
                className="grid gap-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await patch({ name: name.trim() })) setRenameOpen(false);
                }}
              >
                <DialogHeader><DialogTitle>Rename saved search</DialogTitle></DialogHeader>
                <Input aria-label="Name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
                <DialogFooter><Button type="submit" disabled={!name.trim()}>Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={remove} disabled={deleting}>
            {deleting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />} Delete
          </Button>
        </div>
      </div>
    </article>
  );
}
