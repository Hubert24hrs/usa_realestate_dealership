"use client";

import { useState } from "react";
import Link from "@/components/app-link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FolderPlus, Loader2, Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, apiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { CollectionSummary } from "@/server/collections";

class SignInRequired extends Error {}

/** "Add to collection" — pick existing collections (toggle membership) or create one with this home in it. */
export function AddToCollectionButton({ listingId, className, variant = "outline", size = "lg", label = "Collections" }: { listingId: string; className?: string; variant?: "outline" | "ghost" | "secondary"; size?: "lg" | "sm" | "default"; label?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const qc = useQueryClient();
  const key = ["collections", listingId];
  const query = useQuery({
    queryKey: key,
    enabled: open,
    retry: false,
    queryFn: async () => {
      const r = await api<{ collections: CollectionSummary[] }>(`/api/collections?listingId=${listingId}`);
      if (r.status === 401) throw new SignInRequired();
      if (!r.ok) throw new Error(apiError(r));
      return r.data.collections;
    },
  });
  const needsAuth = query.error instanceof SignInRequired;

  const toggle = async (c: CollectionSummary) => {
    setBusy(c.id);
    const r = c.containsListing
      ? await api(`/api/collections/${c.id}/items/${listingId}`, { method: "DELETE" })
      : await api(`/api/collections/${c.id}/items`, { method: "POST", json: { listingId } });
    setBusy(null);
    if (!r.ok) return toast.error(apiError(r));
    qc.setQueryData<CollectionSummary[]>(key, (list) => list?.map((x) => (x.id === c.id ? { ...x, containsListing: !c.containsListing, itemCount: x.itemCount + (c.containsListing ? -1 : 1) } : x)));
    toast.success(c.containsListing ? `Removed from “${c.name}”` : `Added to “${c.name}”`);
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy("new");
    const r = await api<{ id: string }>("/api/collections", { method: "POST", json: { name: name.trim(), listingId } });
    setBusy(null);
    if (!r.ok) return toast.error(apiError(r));
    setName("");
    await qc.invalidateQueries({ queryKey: key });
    toast.success("Collection created", { action: { label: "Open", onClick: () => (window.location.href = `/account/collections/${r.data.id}`) } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={cn(size === "lg" && "h-11 rounded-full", className)}>
          <FolderPlus className="size-4" aria-hidden /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to a collection</DialogTitle>
          <DialogDescription>Group homes by trip, budget or partner — and share collections with co-shoppers or your agent.</DialogDescription>
        </DialogHeader>
        {needsAuth ? (
          <div className="space-y-3 rounded-xl border bg-muted/50 p-4 text-sm">
            <p>Sign in to organize homes into collections.</p>
            <Button asChild className="w-full"><Link href={`/sign-in?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}>Sign in</Link></Button>
          </div>
        ) : (
          <>
            <div className="max-h-72 space-y-1.5 overflow-y-auto" aria-busy={query.isLoading}>
              {query.isLoading && [0, 1].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}
              {query.data?.length === 0 && <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">No collections yet — create your first below.</p>}
              {query.data?.map((c) => {
                const viewOnly = c.access === "VIEWER";
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={viewOnly || busy === c.id}
                    onClick={() => toggle(c)}
                    aria-pressed={Boolean(c.containsListing)}
                    className={cn("flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60", c.containsListing && "border-brand-600/60 bg-brand-50/60 dark:bg-brand-100/40")}
                  >
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border", c.containsListing && "border-brand-700 bg-brand-700 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-brand-50")}>
                      {busy === c.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : c.containsListing ? <Check className="size-3.5" aria-hidden /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {c.itemCount} {c.itemCount === 1 ? "home" : "homes"}
                        {c.access !== "OWNER" && ` · shared by ${c.ownerName ?? "a co-shopper"}`}
                      </span>
                    </span>
                    {viewOnly && <Lock className="size-4 text-muted-foreground" aria-label="View only" />}
                  </button>
                );
              })}
            </div>
            <form onSubmit={create} className="flex items-end gap-2 border-t pt-4">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`new-collection-${listingId}`}>New collection</Label>
                <Input id={`new-collection-${listingId}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Must-sees near the lake" maxLength={80} />
              </div>
              <Button type="submit" disabled={!name.trim() || busy === "new"}>
                {busy === "new" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />} Create
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Create an empty collection from the collections page. */
export function NewCollectionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    const r = await api<{ id: string }>("/api/collections", { method: "POST", json: { name, description: description || undefined } });
    setPending(false);
    if (!r.ok) return toast.error(apiError(r));
    setOpen(false);
    router.push(`/account/collections/${r.data.id}`);
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setName(""); setDescription(""); } }}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-full px-4"><Plus className="size-4" aria-hidden /> New collection</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>Add homes from any listing page with the “Collections” button.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nc-name">Name</Label>
            <Input id="nc-name" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Austin shortlist" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nc-desc">Description (optional)</Label>
            <Textarea id="nc-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending || !name.trim()}>{pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
