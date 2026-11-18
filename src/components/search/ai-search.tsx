"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Info, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SearchMode } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface ParseResponse {
  href: string;
  chips: string[];
  notices: string[];
  engine: "rules" | "ai+rules";
}

const EXAMPLES = [
  "3 bed under $600k near good schools with a yard",
  "dog-friendly 2 bedroom apartment in Denver under $2,500 a month",
  "new construction townhome in Raleigh with a 2 car garage",
  "100+ acres in Texas for hunting with a creek",
];

export function AiSearch({ mode, className, compact = false }: { mode: SearchMode; className?: string; compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (text = query) => {
    if (text.trim().length < 2) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/nl-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, mode }),
      });
      if (!res.ok) throw new Error(res.status === 429 ? "You're searching quickly — try again in a moment." : "Couldn't understand that search.");
      setResult((await res.json()) as ParseResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (result && !pending) router.push(result.href);
          else void run();
        }}
        className="relative"
      >
        <label htmlFor="ai-search-input" className="sr-only">
          Describe the home you want in plain English
        </label>
        <Sparkles className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-copper-600" aria-hidden />
        <input
          id="ai-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResult(null);
          }}
          placeholder="Try “3 bed under $600k near good schools with a yard”"
          className={cn(
            "w-full rounded-xl border border-input bg-background pr-36 pl-11 text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
            compact ? "h-11 text-sm" : "h-14 text-base",
          )}
          maxLength={300}
        />
        <Button type="submit" size="lg" disabled={pending || query.trim().length < 2} className="absolute top-1/2 right-2 h-10 -translate-y-1/2 px-4">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : result ? "Show homes" : "Understand"}
          {!pending && <ArrowRight className="size-4" aria-hidden />}
        </Button>
      </form>

      <div aria-live="polite" className="min-h-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">We understood:</span>
              {result.chips.length ? (
                result.chips.map((chip) => (
                  <span key={chip} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800 dark:border-brand-300 dark:text-brand-900">
                    {chip}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">no specific filters — we&apos;ll show everything nearby</span>
              )}
            </div>
            {result.notices.map((n) => (
              <p key={n} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-copper-600" aria-hidden /> {n}
              </p>
            ))}
          </div>
        )}
        {!result && !error && !compact && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuery(ex);
                  void run(ex);
                }}
                className="rounded-full border bg-background/70 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
