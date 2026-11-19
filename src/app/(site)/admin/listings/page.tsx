import type { Metadata } from "next";
import Link from "@/components/app-link";
import type { Prisma } from "@prisma/client";
import { Plus, Search, Upload } from "lucide-react";
import { AccountPageHeader } from "@/components/account/page-header";
import { FeatureToggle } from "@/components/admin/controls";
import { AdminPager } from "@/components/admin/pager";
import { AutoSubmitForm } from "@/components/agents/filter-form";
import { ListingImage } from "@/components/media/listing-image";
import { ListingControls } from "@/components/pro/controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { STATUS_LABELS } from "@/lib/domain";
import { formatPrice, timeAgo } from "@/lib/format";
import { CATEGORIES, LISTING_STATUSES } from "@/lib/validation/admin";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Listings" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const PER_PAGE = 25;
const SOURCES = ["SEED", "FEED", "FSBO", "AGENT", "ADMIN"] as const;
const SOURCE_LABEL: Record<string, string> = { SEED: "Sample data", FEED: "MLS feed", FSBO: "Owner (FSBO)", AGENT: "Agent", ADMIN: "Staff" };
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

export default async function AdminListingsPage({ searchParams }: PageProps) {
  await requireRole(["ADMIN"], "/admin/listings");
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const status = (LISTING_STATUSES as readonly string[]).includes(one(sp.status)) ? one(sp.status) : "";
  const category = (CATEGORIES as readonly string[]).includes(one(sp.category)) ? one(sp.category) : "";
  const source = (SOURCES as readonly string[]).includes(one(sp.source)) ? one(sp.source) : "";
  const featured = one(sp.featured) === "1";
  const page = Math.max(1, Math.min(400, Number.parseInt(one(sp.page), 10) || 1));

  const where: Prisma.ListingWhereInput = {
    ...(status ? { status: status as never } : {}),
    ...(category ? { category: category as never } : {}),
    ...(source ? { source: source as never } : {}),
    ...(featured ? { isFeatured: true } : {}),
    ...(q
      ? {
          OR: [
            { streetAddress: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            { zip: q },
            { mlsNumber: { equals: q, mode: "insensitive" } },
            { slug: { contains: q.toLowerCase() } },
          ],
        }
      : {}),
  };
  const [total, listings] = await Promise.all([
    db.listing.count({ where }),
    db.listing.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, slug: true, streetAddress: true, unit: true, city: true, state: true, status: true, price: true, transactionType: true, source: true, isFeatured: true, updatedAt: true,
        agent: { select: { name: true } },
        media: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, blurDataUrl: true } },
        _count: { select: { media: true, reports: { where: { status: "OPEN" } } } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const params = { q, status, category, source, featured: featured ? "1" : "" };

  return (
    <>
      <AccountPageHeader
        eyebrow="Admin"
        title="Listings"
        description={`${total.toLocaleString("en-US")} listing${total === 1 ? "" : "s"} match. Drafts stay hidden from shoppers until they have photos and are published.`}
        actions={
          <>
            <Button asChild variant="outline"><Link href="/admin/import"><Upload className="size-4" aria-hidden /> Import CSV</Link></Button>
            <Button asChild><Link href="/admin/listings/new"><Plus className="size-4" aria-hidden /> New listing</Link></Button>
          </>
        }
      />
      <AutoSubmitForm action="/admin/listings" className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border bg-card p-3">
        <div className="relative min-w-56 flex-1">
          <label htmlFor="admin-q" className="sr-only">Search address, city, ZIP or MLS #</label>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="admin-q" name="q" defaultValue={q} placeholder="Address, city, ZIP or MLS #" className="h-9 pl-8" />
        </div>
        <label className="sr-only" htmlFor="admin-status">Status</label>
        <select id="admin-status" name="status" defaultValue={status} className={selectCls}>
          <option value="">Any status</option>
          {LISTING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <label className="sr-only" htmlFor="admin-category">Category</label>
        <select id="admin-category" name="category" defaultValue={category} className={selectCls}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
        </select>
        <label className="sr-only" htmlFor="admin-source">Source</label>
        <select id="admin-source" name="source" defaultValue={source} className={selectCls}>
          <option value="">Any source</option>
          {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
        <label className="sr-only" htmlFor="admin-featured">Featured</label>
        <select id="admin-featured" name="featured" defaultValue={featured ? "1" : ""} className={selectCls}>
          <option value="">Featured or not</option>
          <option value="1">Featured only</option>
        </select>
        <Button type="submit" variant="outline" className="h-9">Apply</Button>
      </AutoSubmitForm>

      {listings.length === 0 ? (
        <p className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">No listings match these filters.</p>
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-3">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                {l.media[0] && <ListingImage src={l.media[0].url} alt="" blurDataUrl={l.media[0].blurDataUrl} fill sizes="96px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/listings/${l.id}`} className="block truncate font-semibold hover:underline">{l.streetAddress}{l.unit ? ` #${l.unit}` : ""}, {l.city}, {l.state}</Link>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(l.price)}{l.transactionType !== "SALE" ? "/mo" : ""} · {SOURCE_LABEL[l.source]} · {l.agent?.name ?? "No agent"} · {l._count.media} photo{l._count.media === 1 ? "" : "s"} · updated {timeAgo(l.updatedAt)}
                </p>
                {(l.status === "DRAFT" || l._count.reports > 0) && (
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {l.status === "DRAFT" && <span className="rounded-full bg-muted px-2 py-0.5 font-medium">Draft</span>}
                    {l._count.reports > 0 && <Link href="/admin/reports" className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive hover:underline">{l._count.reports} open report{l._count.reports === 1 ? "" : "s"}</Link>}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {l.status !== "DRAFT" && <ListingControls id={l.id} status={l.status} price={l.price} rental={l.transactionType !== "SALE"} />}
                <FeatureToggle id={l.id} featured={l.isFeatured} />
                <Button asChild size="sm" variant="outline"><Link href={`/admin/listings/${l.id}`}>Edit<span className="sr-only"> {l.streetAddress}</span></Link></Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AdminPager base="/admin/listings" params={params} page={page} pages={pages} />
    </>
  );
}
