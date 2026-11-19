"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError } from "@/lib/api-client";
import { slugify } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PostSchema, type PostPayload } from "@/lib/validation/admin";
import { selectCls } from "./controls";

type Finding = { phrase: string; reason: string; severity: string };
const TYPES = [
  ["GUIDE", "Guide"],
  ["LEARN", "Learn"],
  ["NEWS", "News"],
  ["BLOG", "Blog"],
] as const;

export function PostEditor({ id, initial, cities }: { id?: string; initial: PostPayload; cities: Array<{ slug: string; name: string; stateCode: string }> }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [preview, setPreview] = useState<{ html: string; fairHousing: Finding[] } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const lastPreviewed = useRef<string | null>(null);

  const set = <K extends keyof PostPayload>(k: K, v: PostPayload[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (tab !== "preview" || lastPreviewed.current === form.body) return;
    let cancelled = false;
    setLoadingPreview(true);
    void api<{ html: string; fairHousing: Finding[] }>("/api/admin/preview", { method: "POST", json: { body: form.body } }).then((res) => {
      if (cancelled) return;
      setLoadingPreview(false);
      if (!res.ok) return toast.error(apiError(res));
      lastPreviewed.current = form.body;
      setPreview(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, form.body]);

  const save = async (status: PostPayload["status"]) => {
    const payload = { ...form, status, tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10) };
    const parsed = PostSchema.safeParse(payload);
    if (!parsed.success) {
      const errs = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
      setErrors(errs);
      setTab("write");
      document.getElementById(`post-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await api<{ id?: string; slug: string }>(id ? `/api/admin/posts/${id}` : "/api/admin/posts", { method: id ? "PATCH" : "POST", json: parsed.data });
    setBusy(false);
    if (!res.ok) return toast.error(apiError(res));
    set("status", status);
    toast.success(status === "PUBLISHED" ? "Published" : "Draft saved");
    if (!id && res.data.id) router.push(`/admin/content/${res.data.id}`);
    else router.refresh();
  };

  const err = (k: string) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `post-${k}-err` } : {});
  const msg = (k: string) => errors[k] && <p id={`post-${k}-err`} className="mt-1 text-sm text-destructive">{errors[k]}</p>;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <div>
          <label htmlFor="post-title" className="mb-1.5 block text-sm font-medium">Title</label>
          <Input
            id="post-title"
            value={form.title}
            maxLength={160}
            onChange={(e) => {
              const title = e.target.value;
              setForm((f) => ({ ...f, title, ...(slugTouched ? {} : { slug: slugify(title).slice(0, 120) }) }));
            }}
            {...err("title")}
          />
          {msg("title")}
        </div>
        <div>
          <label htmlFor="post-slug" className="mb-1.5 block text-sm font-medium">URL</label>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">/learn/</span>
            <Input id="post-slug" value={form.slug} maxLength={120} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase()); }} {...err("slug")} />
          </div>
          {msg("slug")}
        </div>
        <div>
          <label htmlFor="post-excerpt" className="mb-1.5 block text-sm font-medium">Excerpt</label>
          <Textarea id="post-excerpt" rows={2} maxLength={300} value={form.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} {...err("excerpt")} />
          {msg("excerpt")}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span id="post-body-label" className="text-sm font-medium">Article (Markdown)</span>
            <div role="tablist" aria-label="Editor mode" className="flex gap-1 rounded-lg bg-muted p-0.5">
              {(["write", "preview"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  id={`tab-${t}`}
                  aria-selected={tab === t}
                  aria-controls={`panel-${t}`}
                  onClick={() => setTab(t)}
                  className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium", tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {t === "write" ? <Pencil className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
                  {t === "write" ? "Write" : "Preview"}
                </button>
              ))}
            </div>
          </div>
          <div id="panel-write" role="tabpanel" aria-labelledby="tab-write" hidden={tab !== "write"}>
            <Textarea id="post-body" aria-labelledby="post-body-label" rows={22} className="font-mono text-sm" value={form.body} onChange={(e) => set("body", e.target.value)} {...err("body")} />
            {msg("body")}
            <p className="mt-1 text-xs text-muted-foreground">## Heading, **bold**, *italic*, [link](https://…), - lists, | tables |. Raw HTML is stripped.</p>
          </div>
          <div id="panel-preview" role="tabpanel" aria-labelledby="tab-preview" hidden={tab !== "preview"} className="min-h-64 rounded-2xl border bg-card p-5">
            {loadingPreview && !preview ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Rendering…</p>
            ) : preview ? (
              <>
                {preview.fairHousing.length > 0 && (
                  <div role="status" className="mb-4 space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <p className="font-medium">Fair Housing language check (advisory for articles)</p>
                    {preview.fairHousing.map((f, i) => (
                      <p key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden /><span><strong>“{f.phrase}”</strong>: {f.reason}</span></p>
                    ))}
                  </div>
                )}
                <h2 className="mb-4 font-display text-2xl font-semibold">{form.title || "Untitled"}</h2>
                <div className="prose-cv" dangerouslySetInnerHTML={{ __html: preview.html }} />
              </>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="space-y-2 rounded-2xl border bg-card p-4">
          <p className="text-sm">
            Status: <strong>{form.status === "PUBLISHED" ? "Published" : "Draft"}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save("PUBLISHED")} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" aria-hidden />} {form.status === "PUBLISHED" ? "Update" : "Publish"}</Button>
            <Button variant="outline" onClick={() => save("DRAFT")} disabled={busy}>{form.status === "PUBLISHED" ? "Unpublish" : "Save draft"}</Button>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div>
            <label htmlFor="post-type" className="mb-1 block text-sm font-medium">Section</label>
            <select id="post-type" className={`${selectCls} h-9 w-full`} value={form.type} onChange={(e) => set("type", e.target.value as PostPayload["type"])}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="post-tags" className="mb-1 block text-sm font-medium">Tags</label>
            <Input id="post-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="buying, mortgage" />
            <p className="mt-1 text-xs text-muted-foreground">Comma separated, up to 10.</p>
          </div>
          <div>
            <label htmlFor="post-citySlug" className="mb-1 block text-sm font-medium">Market (optional)</label>
            <select id="post-citySlug" className={`${selectCls} h-9 w-full`} value={form.citySlug ?? ""} onChange={(e) => set("citySlug", e.target.value)}>
              <option value="">Nationwide</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}, {c.stateCode}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="post-coverColor" className="mb-1 block text-sm font-medium">Cover color</label>
            <div className="flex items-center gap-2">
              <input type="color" aria-label="Pick cover color" value={form.coverColor || "#3b3fa8"} onChange={(e) => set("coverColor", e.target.value)} className="h-9 w-12 cursor-pointer rounded-md border bg-background" />
              <Input id="post-coverColor" value={form.coverColor ?? ""} maxLength={7} onChange={(e) => set("coverColor", e.target.value)} placeholder="#3b3fa8" {...err("coverColor")} />
            </div>
            {msg("coverColor")}
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium">Search appearance</p>
          <div>
            <label htmlFor="post-seoTitle" className="mb-1 block text-xs text-muted-foreground">SEO title ({(form.seoTitle ?? "").length}/70)</label>
            <Input id="post-seoTitle" value={form.seoTitle ?? ""} maxLength={70} onChange={(e) => set("seoTitle", e.target.value)} />
          </div>
          <div>
            <label htmlFor="post-seoDescription" className="mb-1 block text-xs text-muted-foreground">Meta description ({(form.seoDescription ?? "").length}/170)</label>
            <Textarea id="post-seoDescription" rows={3} value={form.seoDescription ?? ""} maxLength={170} onChange={(e) => set("seoDescription", e.target.value)} />
          </div>
        </div>
      </aside>
    </div>
  );
}
