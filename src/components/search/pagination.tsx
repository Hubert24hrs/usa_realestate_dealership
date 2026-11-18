"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function pages(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current, current - 1, current + 1]);
  const list = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  list.forEach((p, i) => {
    if (i > 0 && p - (list[i - 1] as number) > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageCount, hrefFor, onPage }: { page: number; pageCount: number; hrefFor: (p: number) => string; onPage: (p: number) => void }) {
  if (pageCount <= 1) return null;
  const link = (p: number, label: React.ReactNode, aria: string, disabled = false) => (
    <a
      href={disabled ? undefined : hrefFor(p)}
      aria-label={aria}
      aria-disabled={disabled}
      aria-current={p === page && typeof label === "number" ? "page" : undefined}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) onPage(p);
      }}
      className={cn(
        "grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-medium transition-colors",
        disabled ? "pointer-events-none opacity-40" : "hover:bg-accent",
        p === page && typeof label === "number" && "bg-primary text-primary-foreground hover:bg-primary",
      )}
    >
      {label}
    </a>
  );
  return (
    <nav aria-label="Search results pages" className="flex items-center justify-center gap-1 py-8">
      {link(page - 1, <ChevronLeft className="size-4" aria-hidden />, "Previous page", page <= 1)}
      {pages(page, pageCount).map((p, i) => (p === "…" ? <span key={`e${i}`} className="px-1 text-muted-foreground">…</span> : <span key={p}>{link(p, p, `Page ${p}`)}</span>))}
      {link(page + 1, <ChevronRight className="size-4" aria-hidden />, "Next page", page >= pageCount)}
    </nav>
  );
}
