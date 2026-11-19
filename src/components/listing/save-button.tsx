"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

/** Shared, in-memory set of saved listing ids so every heart on the page stays in sync — scoped to the signed-in user. */
const listeners = new Set<() => void>();
let saved: Set<string> | null = null;
let loadedFor: string | null | undefined;
let loading: Promise<void> | null = null;

const notify = () => listeners.forEach((l) => l());

function loadSaved(userId: string | null) {
  if (loadedFor === userId && (saved || loading)) return;
  loadedFor = userId;
  if (!userId) {
    saved = new Set();
    loading = null;
    notify();
    return;
  }
  saved = null;
  loading = fetch("/api/favorites/ids", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { ids: [] }))
    .then((data: { ids?: string[] }) => {
      if (loadedFor === userId) saved = new Set(data.ids ?? []);
    })
    .catch(() => {
      if (loadedFor === userId) saved = new Set();
    })
    .finally(() => {
      loading = null;
      notify();
    });
}

export function useIsSaved(id: string): [boolean, (value: boolean) => void] {
  const [, force] = useState(0);
  const { data: me } = useMe();
  const userId = me ? (me.user?.id ?? null) : undefined;
  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  useEffect(() => {
    if (userId !== undefined) loadSaved(userId);
  }, [userId]);
  const set = (value: boolean) => {
    saved ??= new Set();
    if (value) saved.add(id);
    else saved.delete(id);
    notify();
  };
  return [saved?.has(id) ?? false, set];
}

export function SaveButton({ listingId, label, className, size = "md" }: { listingId: string; label: string; className?: string; size?: "md" | "lg" }) {
  const [isSaved, setSaved] = useIsSaved(listingId);
  const [pending, setPending] = useState(false);

  const toggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (pending) return;
    const next = !isSaved;
    setSaved(next);
    setPending(true);
    try {
      const res = await fetch(`/api/favorites/${listingId}`, { method: next ? "POST" : "DELETE" });
      if (res.status === 401) {
        setSaved(!next);
        toast("Sign in to save homes", {
          description: "Saved homes sync across devices and power price-drop alerts.",
          action: { label: "Sign in", onClick: () => (window.location.href = `/sign-in?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`) },
        });
        return;
      }
      if (!res.ok) throw new Error();
      toast.success(next ? "Saved to your favorites" : "Removed from favorites", {
        action: next ? { label: "View", onClick: () => (window.location.href = "/account/favorites") } : undefined,
      });
    } catch {
      setSaved(!next);
      toast.error("Couldn't update favorites. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${label} from saved homes` : `Save ${label}`}
      className={cn(
        "grid place-items-center rounded-full bg-white/90 text-ink shadow-[var(--shadow-card)] backdrop-blur transition-transform hover:scale-105 active:scale-95 dark:bg-black/60 dark:text-white",
        size === "lg" ? "size-11" : "size-9",
        className,
      )}
    >
      <Heart className={cn(size === "lg" ? "size-5" : "size-[1.05rem]", isSaved && "fill-copper-500 text-copper-500")} aria-hidden />
    </button>
  );
}

export function SignInLink({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/sign-in" className="font-medium text-primary underline underline-offset-4">
      {children}
    </Link>
  );
}
