"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutate } from "./controls";

interface PlaceFields {
  id: string;
  kind: "city" | "neighborhood";
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  heroColor?: string;
  highlights?: string[];
}

/** Editor for one city or neighborhood: page copy plus search snippet fields. */
export function PlaceForm({ place }: { place: PlaceFields }) {
  const { busy, run } = useMutate();
  const [form, setForm] = useState({ ...place, highlightsText: (place.highlights ?? []).join("\n") });
  const p = `${place.kind}-${place.id}`;
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const base = { kind: place.kind, id: place.id, description: form.description, seoTitle: form.seoTitle, seoDescription: form.seoDescription };
    const json =
      place.kind === "city"
        ? { ...base, heroColor: form.heroColor ?? "" }
        : { ...base, highlights: form.highlightsText.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 12) };
    void run("/api/admin/places", "PATCH", json, `${place.name} saved`);
  };
  return (
    <form onSubmit={save} className="space-y-3" aria-label={`Edit ${place.name}`}>
      <div>
        <label htmlFor={`${p}-description`} className="mb-1 block text-sm font-medium">Overview</label>
        <Textarea id={`${p}-description`} rows={place.kind === "city" ? 6 : 4} maxLength={4000} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      {place.kind === "neighborhood" && (
        <div>
          <label htmlFor={`${p}-highlights`} className="mb-1 block text-sm font-medium">Highlights (one per line)</label>
          <Textarea id={`${p}-highlights`} rows={3} value={form.highlightsText} onChange={(e) => setForm((f) => ({ ...f, highlightsText: e.target.value }))} />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${p}-seoTitle`} className="mb-1 block text-xs text-muted-foreground">SEO title ({form.seoTitle.length}/70)</label>
          <Input id={`${p}-seoTitle`} maxLength={70} value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} />
        </div>
        <div>
          <label htmlFor={`${p}-seoDescription`} className="mb-1 block text-xs text-muted-foreground">Meta description ({form.seoDescription.length}/170)</label>
          <Input id={`${p}-seoDescription`} maxLength={170} value={form.seoDescription} onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))} />
        </div>
      </div>
      {place.kind === "city" && (
        <div className="flex items-center gap-2">
          <label htmlFor={`${p}-heroColor`} className="text-sm font-medium">Accent color</label>
          <input type="color" aria-label="Pick accent color" value={form.heroColor || "#3b3fa8"} onChange={(e) => setForm((f) => ({ ...f, heroColor: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-md border bg-background" />
          <Input id={`${p}-heroColor`} className="w-28" maxLength={7} placeholder="#3b3fa8" value={form.heroColor ?? ""} onChange={(e) => setForm((f) => ({ ...f, heroColor: e.target.value }))} />
        </div>
      )}
      <Button type="submit" size="sm" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Save {place.kind}</Button>
    </form>
  );
}
