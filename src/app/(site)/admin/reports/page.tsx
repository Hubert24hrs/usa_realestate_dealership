import type { Metadata } from "next";
import Link from "@/components/app-link";
import { AccountPageHeader, SectionTitle } from "@/components/account/page-header";
import { ReportControls } from "@/components/admin/controls";
import { AdminPager } from "@/components/admin/pager";
import { db } from "@/lib/db";
import { REPORT_REASON_LABELS, STATUS_LABELS } from "@/lib/domain";
import { checkFairHousing } from "@/lib/fair-housing";
import { formatDate, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Reports" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const PER_PAGE = 20;
const TABS = [
  ["OPEN", "Open"],
  ["RESOLVED", "Resolved"],
  ["DISMISSED", "Dismissed"],
] as const;

export default async function AdminReportsPage({ searchParams }: PageProps) {
  await requireRole(["ADMIN"], "/admin/reports");
  const sp = await searchParams;
  const status = TABS.some(([s]) => s === sp.status) ? (sp.status as (typeof TABS)[number][0]) : "OPEN";
  const page = Math.max(1, Math.min(200, Number.parseInt(typeof sp.page === "string" ? sp.page : "", 10) || 1));
  const since = new Date(Date.now() - 14 * 86_400_000);
  const [counts, total, reports, fsbo] = await Promise.all([
    db.report.groupBy({ by: ["status"], _count: true }),
    db.report.count({ where: { status } }),
    db.report.findMany({
      where: { status },
      orderBy: { createdAt: status === "OPEN" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, reason: true, details: true, email: true, createdAt: true, resolution: true, resolvedAt: true,
        user: { select: { email: true } },
        listing: { select: { id: true, slug: true, streetAddress: true, city: true, state: true, status: true, source: true, _count: { select: { reports: { where: { status: "OPEN" } } } } } },
      },
    }),
    db.listing.findMany({
      where: { source: "FSBO", createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, slug: true, streetAddress: true, city: true, state: true, status: true, createdAt: true, headline: true, description: true, owner: { select: { email: true } }, _count: { select: { media: true } } },
    }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <AccountPageHeader eyebrow="Admin" title="Reports & moderation" description="Shopper reports on listings, oldest first. Scam and discriminatory-language reports should be reviewed the same day." />
      <nav aria-label="Report status" className="mb-5 flex gap-1 rounded-xl bg-muted p-1 sm:inline-flex">
        {TABS.map(([s, label]) => (
          <Link
            key={s}
            href={s === "OPEN" ? "/admin/reports" : `/admin/reports?status=${s}`}
            aria-current={status === s ? "page" : undefined}
            className={cn("flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium", status === s ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            {label} <span className="tabular-nums text-muted-foreground">({countOf(s)})</span>
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <p className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">{status === "OPEN" ? "No open reports. Nice." : "Nothing here yet."}</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="grid gap-4 rounded-3xl border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <p className="font-semibold">
                  {REPORT_REASON_LABELS[r.reason] ?? r.reason}
                  {(r.reason === "SCAM_OR_FRAUD" || r.reason === "DISCRIMINATORY_LANGUAGE") && status === "OPEN" && <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Priority</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  <Link href={`/admin/listings/${r.listing.id}`} className="hover:underline">{r.listing.streetAddress}, {r.listing.city}, {r.listing.state}</Link> · {STATUS_LABELS[r.listing.status]} · {r.listing._count.reports} open report{r.listing._count.reports === 1 ? "" : "s"} · <Link href={`/property/${r.listing.slug}`} className="hover:underline">view listing</Link>
                </p>
                {r.details && <p className="mt-2 max-w-2xl text-sm whitespace-pre-line">{r.details}</p>}
                <p className="mt-2 text-xs text-muted-foreground">Reported {timeAgo(r.createdAt)}{r.user?.email || r.email ? ` by ${r.user?.email ?? r.email}` : " anonymously"}</p>
                {r.resolution && <p className="mt-1 text-xs text-muted-foreground">Resolution{r.resolvedAt ? ` (${formatDate(r.resolvedAt)})` : ""}: {r.resolution}</p>}
              </div>
              {status === "OPEN" && <ReportControls id={r.id} />}
            </li>
          ))}
        </ul>
      )}
      <AdminPager base="/admin/reports" params={{ status: status === "OPEN" ? "" : status }} page={page} pages={pages} />

      <section aria-labelledby="fsbo-review" className="mt-12">
        <SectionTitle id="fsbo-review">New owner listings · last 14 days</SectionTitle>
        <p className="-mt-1 mb-3 text-sm text-muted-foreground">Spot-check owner-posted listings for scams, copied photos and Fair Housing language. Publishing already blocks the clearest violations.</p>
        {fsbo.length === 0 ? (
          <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">No new owner listings.</p>
        ) : (
          <ul className="divide-y rounded-3xl border bg-card">
            {fsbo.map((l) => {
              const warnings = checkFairHousing(`${l.headline ?? ""}\n${l.description}`);
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/listings/${l.id}`} className="font-medium hover:underline">{l.streetAddress}, {l.city}, {l.state}</Link>
                    <p className="text-xs text-muted-foreground">{STATUS_LABELS[l.status]} · {l._count.media} photos · {l.owner?.email ?? "owner removed"} · {timeAgo(l.createdAt)}</p>
                  </div>
                  {warnings.length > 0 ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">{warnings.length} language warning{warnings.length === 1 ? "" : "s"}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No language flags</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
