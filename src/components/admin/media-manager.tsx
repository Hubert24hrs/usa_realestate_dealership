"use client";

import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Star, Trash2 } from "lucide-react";
import { ListingImage } from "@/components/media/listing-image";
import { PhotoUploader, type UploadedPhoto } from "@/components/sell/photo-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEDIA_CATEGORIES, MEDIA_CATEGORY_LABELS } from "@/lib/domain";
import { selectCls, useMutate } from "./controls";

export interface ManagedMedia {
  id: string;
  url: string;
  alt: string;
  category: string;
  isPrimary: boolean;
  blurDataUrl: string | null;
  provider: string;
}

function MediaCard({ m, index, count }: { m: ManagedMedia; index: number; count: number }) {
  const { busy, run } = useMutate();
  const [alt, setAlt] = useState(m.alt);
  const patch = (json: Record<string, unknown>, msg?: string) => void run(`/api/admin/media/${m.id}`, "PATCH", json, msg);
  return (
    <li className="overflow-hidden rounded-2xl border bg-card">
      <div className="relative aspect-[4/3] bg-muted">
        <ListingImage src={m.url} alt={m.alt} blurDataUrl={m.blurDataUrl} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
        {index === 0 && <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">Cover</span>}
        {busy && <span className="absolute inset-0 grid place-items-center bg-black/30"><Loader2 className="size-6 animate-spin text-white" aria-label="Saving" /></span>}
      </div>
      <div className="space-y-2 p-3">
        <div>
          <label htmlFor={`cat-${m.id}`} className="sr-only">Room or category for photo {index + 1}</label>
          <select id={`cat-${m.id}`} className={`${selectCls} w-full`} defaultValue={m.category} disabled={busy} onChange={(e) => patch({ category: e.target.value }, "Category updated")}>
            {MEDIA_CATEGORIES.map((c) => <option key={c} value={c}>{MEDIA_CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`alt-${m.id}`} className="sr-only">Description (alt text) for photo {index + 1}</label>
          <Input
            id={`alt-${m.id}`}
            value={alt}
            maxLength={160}
            onChange={(e) => setAlt(e.target.value)}
            onBlur={() => alt.trim().length >= 3 && alt !== m.alt && patch({ alt: alt.trim() }, "Description saved")}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="icon-sm" variant="ghost" disabled={busy || index === 0} onClick={() => patch({ move: "up" })} aria-label={`Move photo ${index + 1} earlier`}><ArrowUp className="size-4" aria-hidden /></Button>
          <Button type="button" size="icon-sm" variant="ghost" disabled={busy || index === count - 1} onClick={() => patch({ move: "down" })} aria-label={`Move photo ${index + 1} later`}><ArrowDown className="size-4" aria-hidden /></Button>
          <Button type="button" size="sm" variant="ghost" disabled={busy || index === 0} onClick={() => patch({ cover: true }, "Cover photo updated")}><Star className="size-4" aria-hidden /> Cover</Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="ml-auto text-destructive hover:text-destructive"
            disabled={busy}
            aria-label={`Remove photo ${index + 1}`}
            onClick={() => window.confirm("Remove this photo from the listing?") && void run(`/api/admin/media/${m.id}`, "DELETE", undefined, "Photo removed")}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}

export function MediaManager({ listingId, media }: { listingId: string; media: ManagedMedia[] }) {
  const { busy, run } = useMutate();
  const [pending, setPending] = useState<UploadedPhoto[]>([]);
  const [uploaderKey, setUploaderKey] = useState(0);
  const onChange = useCallback((photos: UploadedPhoto[]) => setPending(photos), []);
  const attach = async () => {
    const ok = await run(`/api/admin/listings/${listingId}/media`, "POST", { photos: pending.map(({ uploadId, category, alt }) => ({ uploadId, category, alt })) }, `${pending.length} photo${pending.length === 1 ? "" : "s"} added`);
    if (ok) {
      setPending([]);
      setUploaderKey((k) => k + 1);
    }
  };
  return (
    <div className="space-y-6">
      {media.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {media.map((m, i) => <MediaCard key={`${m.id}-${i}`} m={m} index={i} count={media.length} />)}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No photos yet. Drafts need at least one photo before they can be published.</p>
      )}
      <div className="rounded-2xl border bg-card p-4">
        <h3 className="font-semibold">Add photos</h3>
        <p className="mb-3 text-sm text-muted-foreground">Only upload photos you have the rights to use. EXIF and GPS data are stripped on upload.</p>
        <PhotoUploader key={uploaderKey} initial={[]} onChange={onChange} />
        <Button className="mt-3" disabled={busy || pending.length === 0} onClick={attach}>
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Add {pending.length || ""} photo{pending.length === 1 ? "" : "s"} to listing
        </Button>
      </div>
    </div>
  );
}
