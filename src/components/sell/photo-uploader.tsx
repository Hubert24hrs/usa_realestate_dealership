"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, RotateCcw, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PHOTO_CATEGORIES } from "@/lib/validation/fsbo";
import { cn } from "@/lib/utils";

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number][0];
export interface UploadedPhoto {
  uploadId: string;
  url: string;
  category: PhotoCategory;
  alt: string;
}

interface Item {
  key: string;
  preview: string;
  status: "compressing" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  uploadId?: string;
  url?: string;
  category: PhotoCategory;
  alt: string;
  altEdited: boolean;
}

const MAX_PHOTOS = 30;
const MAX_EDGE = 2400;
const CONCURRENCY = 3;
const label = (c: PhotoCategory) => PHOTO_CATEGORIES.find(([k]) => k === c)?.[1] ?? "Photo";
const autoAlt = (c: PhotoCategory, n: number) => (c === "FLOOR_PLAN" ? "Floor plan of the home" : c === "OTHER" ? `Photo ${n} of the home` : `${label(c)} of the home`);
const guessCategory = (index: number): PhotoCategory => (["EXTERIOR", "LIVING_ROOM", "KITCHEN", "PRIMARY_BEDROOM", "BATHROOM", "BACKYARD"] as const)[index] ?? "OTHER";

/** Downscale + re-encode in the browser so uploads are small and fast (the server re-processes anyway). */
async function compress(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  const out = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!out) throw new Error("Couldn't process this photo");
  const ext = out.type === "image/webp" ? "webp" : "jpg";
  return new File([out], file.name.replace(/\.[^.]+$/, "") + `.${ext}`, { type: out.type });
}

function upload(file: File, onProgress: (p: number) => void): Promise<{ id: string; url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let data: { id?: string; url?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.id && data.url) resolve({ id: data.id, url: data.url });
      else reject(new Error(data.error ?? (xhr.status === 401 ? "Please sign in again." : "Upload failed")));
    };
    xhr.onerror = () => reject(new Error("Network error — check your connection"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export function PhotoUploader({ initial, onChange }: { initial: UploadedPhoto[]; onChange: (photos: UploadedPhoto[]) => void }) {
  const [items, setItems] = useState<Item[]>(() =>
    initial.map((p, i) => ({ key: `init-${i}-${p.uploadId}`, preview: p.url, status: "done", progress: 100, uploadId: p.uploadId, url: p.url, category: p.category, alt: p.alt, altEdited: true })),
  );
  const [dragOver, setDragOver] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const active = useRef(0);
  const queue = useRef<string[]>([]);
  /** Pending originals, kept outside React state so the upload queue never runs inside an updater. */
  const files = useRef(new Map<string, File>());

  const patch = useCallback((key: string, p: Partial<Item>) => setItems((list) => list.map((it) => (it.key === key ? { ...it, ...p } : it))), []);

  // Report finished photos (in display order) to the parent.
  useEffect(() => {
    onChange(items.filter((i) => i.status === "done" && i.uploadId && i.url).map((i) => ({ uploadId: i.uploadId!, url: i.url!, category: i.category, alt: i.alt })));
  }, [items, onChange]);

  const pump = useCallback(() => {
    while (active.current < CONCURRENCY && queue.current.length) {
      const key = queue.current.shift()!;
      const file = files.current.get(key);
      if (!file) continue;
      active.current++;
      void (async () => {
        try {
          patch(key, { status: "compressing", error: undefined });
          const small = await compress(file);
          patch(key, { status: "uploading", progress: 0 });
          const res = await upload(small, (progress) => patch(key, { progress }));
          files.current.delete(key);
          patch(key, { status: "done", progress: 100, uploadId: res.id, url: res.url });
        } catch (err) {
          patch(key, { status: "error", error: (err as Error).message });
        } finally {
          active.current--;
          pump();
        }
      })();
    }
  }, [patch]);

  const addFiles = (incoming: FileList | File[]) => {
    const images = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    const room = MAX_PHOTOS - items.length;
    if (!images.length) return setNotice("Choose image files (JPEG, PNG, WebP or AVIF).");
    setNotice(images.length > room ? `Only ${room} more photo${room === 1 ? "" : "s"} fit — the rest were skipped.` : null);
    const fresh = images.slice(0, Math.max(0, room)).map((file, i): Item => {
      const category = guessCategory(items.length + i);
      const key = `${Date.now()}-${i}-${file.name}`;
      files.current.set(key, file);
      return { key, preview: URL.createObjectURL(file), status: "compressing", progress: 0, category, alt: autoAlt(category, items.length + i + 1), altEdited: false };
    });
    setItems((list) => [...list, ...fresh]);
    queue.current.push(...fresh.map((f) => f.key));
    setTimeout(pump, 0);
  };

  const retry = (key: string) => {
    queue.current.push(key);
    patch(key, { status: "compressing", error: undefined });
    setTimeout(pump, 0);
  };
  const remove = (key: string) => {
    files.current.delete(key);
    queue.current = queue.current.filter((k) => k !== key);
    setItems((list) => list.filter((i) => i.key !== key));
  };
  const move = (key: string, delta: number) =>
    setItems((list) => {
      const i = list.findIndex((x) => x.key === key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  const dropOn = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    setItems((list) => {
      const from = list.findIndex((x) => x.key === dragKey);
      const to = list.findIndex((x) => x.key === targetKey);
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
    setDragKey(null);
  };

  const done = items.filter((i) => i.status === "done").length;
  const busy = items.some((i) => i.status === "compressing" || i.status === "uploading");

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn("flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-8 text-center transition-colors", dragOver ? "border-primary bg-primary/5" : "bg-surface")}
      >
        <ImagePlus className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">Drag photos here</p>
        <p className="text-sm text-muted-foreground">JPEG, PNG, WebP or AVIF · up to {MAX_PHOTOS} photos · we resize and strip location data</p>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={items.length >= MAX_PHOTOS}>
          Choose photos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <p role="status" className="text-sm text-muted-foreground">
        {done} of {items.length} photo{items.length === 1 ? "" : "s"} uploaded{busy ? " — uploading…" : ""}
        {items.length > 0 && items.length < 8 ? " · listings with 8+ photos get far more views" : ""}
      </p>
      {notice && <p className="rounded-xl bg-warning/15 p-3 text-sm">{notice}</p>}

      {items.length > 0 && (
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Photos in display order — the first is the cover">
          {items.map((it, i) => (
            <li
              key={it.key}
              draggable={it.status === "done"}
              onDragStart={() => setDragKey(it.key)}
              onDragOver={(e) => dragKey && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                dropOn(it.key);
              }}
              className={cn("overflow-hidden rounded-2xl border bg-card", dragKey === it.key && "opacity-50")}
            >
              <div className="relative aspect-[3/2] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview */}
                <img src={it.preview} alt="" className="size-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
                    <Star className="size-3" aria-hidden /> Cover
                  </span>
                )}
                <button type="button" onClick={() => remove(it.key)} className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/70 text-white hover:bg-black" aria-label={`Remove photo ${i + 1}`}>
                  <X className="size-4" aria-hidden />
                </button>
                {it.status !== "done" && (
                  <div className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-medium text-white">
                    {it.status === "error" ? (
                      <div className="space-y-2 px-3 text-center">
                        <p>{it.error}</p>
                        {files.current.has(it.key) && <Button type="button" size="sm" variant="secondary" onClick={() => retry(it.key)}><RotateCcw className="size-3.5" aria-hidden /> Retry</Button>}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden /> {it.status === "compressing" ? "Optimizing…" : `Uploading ${it.progress}%`}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center gap-2">
                  <label htmlFor={`cat-${it.key}`} className="sr-only">Room for photo {i + 1}</label>
                  <select
                    id={`cat-${it.key}`}
                    value={it.category}
                    onChange={(e) => {
                      const category = e.target.value as PhotoCategory;
                      patch(it.key, { category, ...(it.altEdited ? {} : { alt: autoAlt(category, i + 1) }) });
                    }}
                    className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm"
                  >
                    {PHOTO_CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => move(it.key, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`}>
                    <ArrowLeft className="size-4" aria-hidden />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => move(it.key, 1)} disabled={i === items.length - 1} aria-label={`Move photo ${i + 1} later`}>
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </div>
                <label htmlFor={`alt-${it.key}`} className="sr-only">Description of photo {i + 1}</label>
                <input
                  id={`alt-${it.key}`}
                  value={it.alt}
                  maxLength={160}
                  onChange={(e) => patch(it.key, { alt: e.target.value, altEdited: true })}
                  placeholder="Describe this photo"
                  className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
