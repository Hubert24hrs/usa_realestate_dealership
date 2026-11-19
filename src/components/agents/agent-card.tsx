import Link from "next/link";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { Stars } from "@/components/agents/stars";
import type { AgentCardRow } from "@/server/agents";

export function AgentCard({ agent: a, cityNames, headingLevel = "h3" }: { agent: AgentCardRow; cityNames?: Map<string, string>; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  const areas = a.areasServed.map((s) => cityNames?.get(s) ?? s).slice(0, 2);
  return (
    <article className="relative flex h-full flex-col rounded-3xl border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-card)]">
      {a.plan === "PREMIER" && (
        <span className="absolute top-4 right-4 rounded-full bg-copper-50 px-2 py-0.5 text-[0.7rem] font-semibold text-copper-800 dark:bg-copper-800/30 dark:text-copper-200">Featured</span>
      )}
      <div className="flex items-start gap-3 pr-16">
        <AgentAvatar name={a.name} color={a.brandColor} size="lg" />
        <div className="min-w-0">
          <H className="font-semibold">
            <Link href={`/agents/${a.slug}`} className="hover:underline">{a.name}</Link>
          </H>
          <p className="truncate text-sm text-muted-foreground">{[a.title, a.organization?.name].filter(Boolean).join(" · ")}</p>
          {a.reviewCount > 0 ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm">
              <Stars rating={a.rating} />
              <span className="font-medium">{a.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({a.reviewCount} review{a.reviewCount === 1 ? "" : "s"})</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No reviews yet</p>
          )}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface p-3 text-center">
        <div><dt className="text-[0.7rem] text-muted-foreground">Sales · 12 mo</dt><dd className="font-semibold tabular-nums">{a.salesLast12Months}</dd></div>
        <div><dt className="text-[0.7rem] text-muted-foreground">Active listings</dt><dd className="font-semibold tabular-nums">{a._count.listings}</dd></div>
        <div><dt className="text-[0.7rem] text-muted-foreground">Experience</dt><dd className="font-semibold tabular-nums">{a.yearsExperience} yrs</dd></div>
      </dl>
      {a.specialties.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Specialties">
          {a.specialties.slice(0, 3).map((s) => <li key={s} className="rounded-full border px-2 py-0.5 text-xs">{s}</li>)}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {areas.length > 0 && <>Serves {areas.join(", ")}</>}
        {a.languages.length > 1 && <> · Speaks {a.languages.join(", ")}</>}
      </p>
      <Link href={`/agents/${a.slug}`} className="mt-auto pt-4 text-sm font-semibold text-primary hover:underline">
        View profile<span className="sr-only"> of {a.name}</span> →
      </Link>
    </article>
  );
}
