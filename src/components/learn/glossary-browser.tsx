"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { GlossaryTerm } from "@/lib/content/glossary";
import { cn } from "@/lib/utils";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function GlossaryBrowser({ terms }: { terms: GlossaryTerm[] }) {
  const [q, setQ] = useState("");
  const bySlug = useMemo(() => new Map(terms.map((t) => [t.slug, t])), [terms]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? terms.filter((t) => t.term.toLowerCase().includes(needle) || t.definition.toLowerCase().includes(needle)) : terms;
  }, [q, terms]);
  const groups = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of filtered) {
      const letter = t.term[0]!.toUpperCase();
      map.set(letter, [...(map.get(letter) ?? []), t]);
    }
    return map;
  }, [filtered]);

  /** Jump to a term even when the current filter hides it. */
  const jump = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    setQ("");
    requestAnimationFrame(() => {
      const el = document.getElementById(slug);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.focus({ preventScroll: true });
      history.replaceState(null, "", `#${slug}`);
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter terms" aria-label="Filter glossary terms" className="pr-9 pl-9" />
          {q && (
            <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full hover:bg-accent" aria-label="Clear filter">
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <p role="status" className="text-xs text-muted-foreground">{filtered.length} of {terms.length} terms</p>
        <nav aria-label="Jump to letter">
          <ul className="grid grid-cols-7 gap-1 lg:grid-cols-6">
            {LETTERS.map((l) => {
              const has = groups.has(l);
              return (
                <li key={l}>
                  {has ? (
                    <a href={`#letter-${l}`} className="grid h-8 place-items-center rounded-lg text-sm font-semibold hover:bg-accent">{l}</a>
                  ) : (
                    <span aria-hidden className="grid h-8 place-items-center rounded-lg text-sm text-muted-foreground/40">{l}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="min-w-0">
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No terms match “{q}”.</p>
        )}
        {[...groups.entries()].map(([letter, items]) => (
          <section key={letter} aria-labelledby={`letter-${letter}`} className="mb-8">
            <h2 id={`letter-${letter}`} className="mb-3 scroll-mt-28 font-display text-2xl font-semibold">{letter}</h2>
            <dl className="space-y-3">
              {items.map((t) => (
                <div key={t.slug} id={t.slug} tabIndex={-1} className={cn("scroll-mt-28 rounded-2xl border bg-card p-4 outline-none target:border-primary target:ring-2 target:ring-primary/20 focus-visible:ring-2 focus-visible:ring-ring")}>
                  <dt className="font-semibold">{t.term}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.definition}</dd>
                  {(t.related?.length || t.link) && (
                    <dd className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      {t.related?.filter((s) => bySlug.has(s)).map((s) => (
                        <a key={s} href={`#${s}`} onClick={(e) => jump(e, s)} className="font-medium text-primary hover:underline">
                          {bySlug.get(s)!.term.replace(/\s*\(.*\)$/, "")}
                        </a>
                      ))}
                      {t.link && (
                        <Link href={t.link.href} className="rounded-full border px-2 py-0.5 font-medium hover:bg-accent">{t.link.label} →</Link>
                      )}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
