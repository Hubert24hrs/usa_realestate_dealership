import type { Metadata } from "next";
import Link from "next/link";
import { Home, Mail } from "lucide-react";
import { AccountPageHeader, EmptyState, SectionTitle } from "@/components/account/page-header";
import { ListingImage } from "@/components/media/listing-image";
import { ListingControls } from "@/components/pro/controls";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { LEAD_TYPE_LABELS } from "@/lib/domain";
import { formatPrice, timeAgo } from "@/lib/format";
import { requireUser } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "My listings" };

/** For-sale-by-owner / for-rent-by-owner listings the signed-in user posted. */
export default async function MyListingsPage() {
  const user = await requireUser("/account/listings");
  const since = new Date(Date.now() - 30 * 86_400_000);
  const listings = await db.listing.findMany({
    where: { ownerId: user.id },
    orderBy: { listDate: "desc" },
    select: {
      id: true, slug: true, streetAddress: true, unit: true, city: true, state: true, status: true, price: true, transactionType: true, saveCount: true, listDate: true,
      media: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true, blurDataUrl: true } },
      _count: { select: { leads: true } },
    },
  });
  const ids = listings.map((l) => l.id);
  const [views, leads] = ids.length
    ? await Promise.all([
        db.analyticsEvent.groupBy({ by: ["listingId"], where: { type: "listing_view", listingId: { in: ids }, createdAt: { gte: since } }, _count: true }),
        db.lead.findMany({ where: { listingId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, name: true, email: true, phone: true, message: true, createdAt: true, listing: { select: { streetAddress: true } } } }),
      ])
    : [[], []];
  const viewsOf = new Map(views.map((v) => [v.listingId, v._count]));
  const now = new Date();

  if (!listings.length) {
    return (
      <>
        <AccountPageHeader title="My listings" description="Homes you've posted for sale or rent by owner." />
        <EmptyState icon={Home} title="You haven't posted a listing" action={<Button asChild><Link href="/sell/post">Post a listing</Link></Button>}>
          Sell or rent your home yourself — add photos, set a price and publish in minutes.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <AccountPageHeader title="My listings" description="Update status and price, and follow up on inquiries from buyers and renters." />
      <ul className="space-y-3">
        {listings.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-3xl border bg-surface p-3">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
              {l.media[0] && <ListingImage src={l.media[0].url} alt="" blurDataUrl={l.media[0].blurDataUrl} fill sizes="96px" className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              {l.status === "DRAFT" ? (
                <p className="truncate font-semibold">{l.streetAddress}{l.unit ? ` #${l.unit}` : ""}, {l.city}</p>
              ) : (
                <Link href={`/property/${l.slug}`} className="block truncate font-semibold hover:underline">{l.streetAddress}{l.unit ? ` #${l.unit}` : ""}, {l.city}</Link>
              )}
              <p className="text-sm text-muted-foreground">
                {formatPrice(l.price)}{l.transactionType !== "SALE" ? "/mo" : ""} · {(viewsOf.get(l.id) ?? 0).toLocaleString("en-US")} views (30d) · {l.saveCount} saves · {l._count.leads} inquiries
              </p>
            </div>
            <ListingControls id={l.id} status={l.status} price={l.price} rental={l.transactionType !== "SALE"} />
          </li>
        ))}
      </ul>

      <section aria-labelledby="inquiries" className="mt-8">
        <SectionTitle id="inquiries">Recent inquiries</SectionTitle>
        {leads.length ? (
          <ul className="space-y-3">
            {leads.map((q) => (
              <li key={q.id} className="rounded-3xl border bg-surface p-4 text-sm">
                <p className="font-medium">
                  {q.name} · <span className="text-muted-foreground">{LEAD_TYPE_LABELS[q.type] ?? q.type} about {q.listing?.streetAddress ?? "your listing"} · {timeAgo(q.createdAt, now)}</span>
                </p>
                {q.message && <p className="mt-1">{q.message}</p>}
                <p className="mt-1 flex flex-wrap gap-x-4">
                  <a href={`mailto:${q.email}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Mail className="size-3.5" aria-hidden /> {q.email}</a>
                  {q.phone && <a href={`tel:${q.phone.replace(/[^\d+]/g, "")}`} className="text-primary hover:underline">{q.phone}</a>}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">No inquiries yet. Signed-in buyers can also message you directly — those conversations appear in Messages.</p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Respond to every inquiry the same way, regardless of who is asking — fair housing law applies to owners too.</p>
      </section>
    </>
  );
}
