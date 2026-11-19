"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FolderHeart, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/hooks/use-me";
import { api, apiError } from "@/lib/api-client";

interface CollectionOption {
  id: string;
  name: string;
  access: "OWNER" | "EDITOR" | "VIEWER";
}

/** "Invite your agent": share a collection so you and the agent can save homes and notes together. */
export function ShopTogetherCard({ agentSlug, agentName }: { agentSlug: string; agentName: string }) {
  const first = agentName.split(" ")[0];
  const { data: me } = useMe();
  const signedIn = Boolean(me?.user);
  const { data, isLoading } = useQuery({
    queryKey: ["collections", "owned"],
    enabled: signedIn,
    queryFn: async () => {
      const res = await api<{ collections: CollectionOption[] }>("/api/collections");
      return (res.data.collections ?? []).filter((c) => c.access === "OWNER");
    },
  });
  const [collectionId, setCollectionId] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const owned = data ?? [];
  const selected = collectionId || owned[0]?.id || "";

  return (
    <div className="rounded-3xl border bg-card p-5">
      <p className="flex items-center gap-2 font-semibold"><Users className="size-4 text-primary" aria-hidden /> Shop together</p>
      <p className="mt-1 text-sm text-muted-foreground">Invite {first} to a collection — you&apos;ll both see the same saved homes, shared notes and tour plans.</p>
      {!signedIn ? (
        <Button asChild variant="outline" className="mt-3 w-full"><Link href={`/sign-in?callbackUrl=${encodeURIComponent(`/agents/${agentSlug}`)}`}>Sign in to invite {first}</Link></Button>
      ) : isLoading ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading your collections…</p>
      ) : owned.length === 0 ? (
        <Button asChild variant="outline" className="mt-3 w-full"><Link href="/account/collections"><FolderHeart className="size-4" aria-hidden /> Create a collection first</Link></Button>
      ) : state === "sent" ? (
        <p role="status" className="mt-3 flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> Invitation sent. {first} can add homes and notes once they accept.</p>
      ) : (
        <form
          className="mt-3 space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setState("sending");
            setError(null);
            const res = await api(`/api/agents/${agentSlug}/invite`, { method: "POST", json: { collectionId: selected } });
            if (!res.ok) {
              setState("idle");
              return setError(apiError(res));
            }
            setState("sent");
          }}
        >
          <label htmlFor="st-collection" className="sr-only">Collection to share</label>
          <select id="st-collection" value={selected} onChange={(e) => setCollectionId(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
            {owned.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={state === "sending" || !selected}>
            {state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Invite {first}
          </Button>
        </form>
      )}
    </div>
  );
}
