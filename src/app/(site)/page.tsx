import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/compliance/demo-banner";
import { ListingImage } from "@/components/media/listing-image";
import { db } from "@/lib/db";
import { formatBaths, formatCompactPrice, formatNumber } from "@/lib/format";

export const revalidate = 300;

// Temporary Phase 1 home: validates the design system, seed data and imagery.
// Replaced by the full search-led home page in Phase 2.
export default async function HomePage() {
  const listings = await db.listing.findMany({
    where: { status: "ACTIVE", transactionType: "SALE", category: "RESIDENTIAL" },
    orderBy: [{ isFeatured: "desc" }, { listDate: "desc" }],
    take: 8,
    include: { media: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  return (
    <div>
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-brand-50 to-background">
        <div className="container-page py-20 sm:py-28">
          <p className="eyebrow">Homes · Rentals · New builds · Commercial · Land</p>
          <h1 className="mt-4 max-w-3xl font-display text-display-xl font-semibold tracking-tight text-foreground">See every home, city and acre clearly.</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">CITI VIEW brings listings, maps, schools and market data into one calm, trustworthy place to plan your next move.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-11 px-5 text-base">
              <Link href="/homes-for-sale">Browse homes <ArrowRight className="size-4" aria-hidden /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-5 text-base">
              <Link href="/styleguide">View design system</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="container-page py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-display-md font-semibold">Featured homes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Every property has its own 8–12 image gallery.</p>
          </div>
          <DemoBadge />
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((l, i) => {
            const photo = l.media[0];
            return (
              <li key={l.id} className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
                <div className="relative aspect-[3/2]">
                  {photo && (
                    <ListingImage src={photo.url} alt={photo.alt} blurDataUrl={photo.blurDataUrl} color={photo.color} fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" priority={i < 4} />
                  )}
                </div>
                <div className="space-y-1 p-4">
                  <p className="text-xl font-semibold">{formatCompactPrice(l.price)}</p>
                  <p className="text-sm text-muted-foreground">
                    {l.beds} bd · {formatBaths(l.baths)} ba · {formatNumber(l.sqft)} sqft
                  </p>
                  <p className="truncate text-sm">{l.streetAddress}, {l.city}, {l.state}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
