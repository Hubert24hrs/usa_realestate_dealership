import type { Metadata } from "next";
import Link from "next/link";
import { Home } from "lucide-react";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { ListingImage } from "@/components/media/listing-image";
import { ListingControls } from "@/components/pro/controls";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PRO_ROLES } from "@/server/api";
import { requireRole } from "@/server/auth-helpers";
import { getProScope, listingScope } from "@/server/pro";

export const metadata: Metadata = { title: "Listings" };

export default async function AgentListingsPage() {
  const user = await requireRole(PRO_ROLES, "/agent/listings");
  const scope = await getProScope(user);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const listings = await db.listing.findMany({
    where: listingScope(scope),
    orderBy: [{ status: "asc" }, { listDate: "desc" }],
    take: 200,
    select: {
      id: true, slug: true, streetAddress: true, unit: true, city: true, state: true, status: true, price: true, transactionType: true, category: true, saveCount: true, listDate: true,
      media: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, alt: true, blurDataUrl: true } },
      _count: { select: { leads: true, tours: true } },
    },
  });
  const views = listings.length
    ? await db.analyticsEvent.groupBy({ by: ["listingId"], where: { type: "listing_view", listingId: { in: listings.map((l) => l.id) }, createdAt: { gte: since } }, _count: true })
    : [];
  const viewsOf = new Map(views.map((v) => [v.listingId, v._count]));

  return (
    <>
      <AccountPageHeader title="Listings" description="Update status and price; changes publish immediately and price drops alert shoppers who saved the home." />
      {listings.length === 0 ? (
        <EmptyState icon={Home} title="No listings yet">Listings assigned to you or your company will appear here.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-3xl border bg-card p-3">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                {l.media[0] && <ListingImage src={l.media[0].url} alt="" blurDataUrl={l.media[0].blurDataUrl} fill sizes="96px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/property/${l.slug}`} className="block truncate font-semibold hover:underline">{l.streetAddress}{l.unit ? ` #${l.unit}` : ""}, {l.city}</Link>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(l.price)}{l.transactionType !== "SALE" ? "/mo" : ""} · {(viewsOf.get(l.id) ?? 0).toLocaleString("en-US")} views (30d) · {l.saveCount} saves · {l._count.leads} leads · {l._count.tours} tours
                </p>
              </div>
              <ListingControls id={l.id} status={l.status} price={l.price} rental={l.transactionType !== "SALE"} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
