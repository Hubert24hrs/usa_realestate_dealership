import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AccountPageHeader, SectionTitle } from "@/components/account/page-header";
import { DeleteButton } from "@/components/admin/controls";
import { ListingEditor } from "@/components/admin/listing-editor";
import { MediaManager } from "@/components/admin/media-manager";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { REPORT_REASON_LABELS, STATUS_LABELS } from "@/lib/domain";
import { formatDate, formatPrice } from "@/lib/format";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Edit listing" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminListingEditPage({ params }: PageProps) {
  const { id } = await params;
  await requireRole(["ADMIN"], `/admin/listings/${id}`);
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const [listing, agents] = await Promise.all([
    db.listing.findUnique({
      where: { id },
      include: {
        media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, url: true, alt: true, category: true, isPrimary: true, blurDataUrl: true, provider: true } },
        priceHistory: { orderBy: { date: "desc" }, take: 8, select: { id: true, date: true, event: true, price: true, source: true } },
        reports: { where: { status: "OPEN" }, select: { id: true, reason: true } },
        owner: { select: { name: true, email: true } },
        _count: { select: { leads: true, favorites: true, applications: true, leases: true } },
      },
    }),
    db.agent.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!listing) notFound();
  const address = `${listing.streetAddress}${listing.unit ? ` #${listing.unit}` : ""}, ${listing.city}, ${listing.state} ${listing.zip}`;

  return (
    <>
      <Link href="/admin/listings" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> All listings</Link>
      <AccountPageHeader
        eyebrow={`${STATUS_LABELS[listing.status]} · ${listing.source === "FSBO" ? "Owner listing" : listing.source === "SEED" ? "Demo listing" : listing.source === "FEED" ? "MLS feed" : "Staff listing"}`}
        title={address}
        description={`${formatPrice(listing.price)}${listing.transactionType !== "SALE" ? "/mo" : ""} · ${listing._count.leads} leads · ${listing._count.favorites} saves${listing.mlsNumber ? ` · MLS # ${listing.mlsNumber}` : ""}${listing.owner ? ` · Owner: ${listing.owner.name ?? listing.owner.email}` : ""}`}
        actions={
          <>
            {listing.status !== "DRAFT" && <Button asChild variant="outline" size="sm"><Link href={`/property/${listing.slug}`} target="_blank">View live <ExternalLink className="size-3.5" aria-hidden /><span className="sr-only">(opens in a new tab)</span></Link></Button>}
            {!listing._count.applications && !listing._count.leases && <DeleteButton url={`/api/admin/listings/${listing.id}`} what="this listing" redirectTo="/admin/listings" />}
          </>
        }
      />
      {listing.reports.length > 0 && (
        <p className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <strong>{listing.reports.length} open report{listing.reports.length === 1 ? "" : "s"}:</strong> {listing.reports.map((r) => REPORT_REASON_LABELS[r.reason] ?? r.reason).join(", ")}. <Link href="/admin/reports" className="font-medium text-primary hover:underline">Review in the moderation queue</Link>
        </p>
      )}
      {listing.status === "DRAFT" && (
        <p className="mb-6 rounded-2xl border bg-muted/40 p-4 text-sm">This is a <strong>draft</strong> — shoppers can&apos;t see it. Add photos below, then set the status to Active (or Coming soon) and save to publish.</p>
      )}

      <section aria-labelledby="details-title" className="rounded-3xl border bg-card p-5">
        <SectionTitle id="details-title">Details</SectionTitle>
        <ListingEditor
          agents={agents}
          listing={{
            id: listing.id,
            status: listing.status,
            headline: listing.headline ?? "",
            description: listing.description,
            price: listing.price,
            beds: listing.beds,
            baths: listing.baths,
            sqft: listing.sqft,
            lotSqft: listing.lotSqft,
            yearBuilt: listing.yearBuilt,
            hoaFee: listing.hoaFee,
            agentId: listing.agentId,
            rental: listing.transactionType !== "SALE",
            flags: {
              isFeatured: listing.isFeatured,
              isLuxury: listing.isLuxury,
              isNewConstruction: listing.isNewConstruction,
              hideAddress: listing.hideAddress,
              hasPool: listing.hasPool,
              isWaterfront: listing.isWaterfront,
              hasView: listing.hasView,
              petsAllowed: listing.petsAllowed,
              has3dTour: listing.has3dTour,
              hasVideo: listing.hasVideo,
            },
          }}
        />
      </section>

      <section aria-labelledby="photos-title" className="mt-8">
        <SectionTitle id="photos-title">Photos ({listing.media.length})</SectionTitle>
        <MediaManager listingId={listing.id} media={listing.media} />
      </section>

      {listing.priceHistory.length > 0 && (
        <section aria-labelledby="history-title" className="mt-8">
          <SectionTitle id="history-title">Recent history</SectionTitle>
          <ul className="divide-y rounded-3xl border bg-card text-sm">
            {listing.priceHistory.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 p-3">
                <span>{formatDate(h.date)} · {h.event.charAt(0) + h.event.slice(1).toLowerCase().replace("_", " ")}</span>
                <span className="text-muted-foreground">{formatPrice(h.price)}{h.source ? ` · ${h.source}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
