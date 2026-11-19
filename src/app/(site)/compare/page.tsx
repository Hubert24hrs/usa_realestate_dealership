import type { Metadata } from "next";
import Link from "@/components/app-link";
import { Scale } from "lucide-react";
import { ListingImage } from "@/components/media/listing-image";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { PROPERTY_TYPE_LABELS } from "@/lib/domain";
import { daysSince, formatAcres, formatBaths, formatMoney, formatNumber, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Compare homes", robots: { index: false, follow: true } };

type Props = { searchParams: Promise<{ ids?: string }> };

export default async function ComparePage({ searchParams }: Props) {
  const { ids = "" } = await searchParams;
  const list = ids.split(",").filter((id) => /^[a-z0-9]{10,40}$/i.test(id)).slice(0, 4);
  const rows = list.length
    ? await db.listing.findMany({
        where: { id: { in: list } },
        include: { media: { orderBy: { sortOrder: "asc" }, take: 1 }, schools: { include: { school: true }, orderBy: { distanceMiles: "asc" }, take: 1 } },
      })
    : [];
  const listings = list.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as typeof rows;

  if (listings.length < 2) {
    return (
      <div className="container-page grid place-items-center py-24 text-center">
        <Scale className="size-10 text-muted-foreground" aria-hidden />
        <h1 className="mt-3 font-display text-2xl font-semibold">Compare homes side by side</h1>
        <p className="mt-2 max-w-md text-muted-foreground">Tick “Compare” on two to four listing cards, then open the compare tray.</p>
        <Button asChild className="mt-5"><Link href="/homes-for-sale">Browse homes</Link></Button>
      </div>
    );
  }

  const facts: Array<[string, (l: (typeof listings)[number]) => string]> = [
    ["Price", (l) => (l.transactionType === "RENT" ? `${formatPrice(l.price)}/mo` : formatPrice(l.status === "SOLD" ? l.soldPrice ?? l.price : l.price))],
    ["Type", (l) => PROPERTY_TYPE_LABELS[l.propertyType]],
    ["Beds", (l) => (l.beds == null ? "—" : l.beds === 0 ? "Studio" : String(l.beds))],
    ["Baths", (l) => formatBaths(l.baths)],
    ["Square feet", (l) => formatNumber(l.sqft)],
    ["Price / sqft", (l) => (l.pricePerSqft ? `$${formatNumber(l.pricePerSqft)}` : "—")],
    ["Lot", (l) => (l.lotAcres ? formatAcres(l.lotAcres) : l.lotSqft ? `${formatNumber(l.lotSqft)} sqft` : "—")],
    ["Year built", (l) => (l.yearBuilt ? String(l.yearBuilt) : "—")],
    ["HOA", (l) => (l.hoaFee ? `${formatMoney(l.hoaFee)}/mo` : "None")],
    ["Property tax", (l) => (l.propertyTaxAnnual ? `${formatPrice(l.propertyTaxAnnual)}/yr` : "—")],
    ["Garage", (l) => (l.garageSpaces ? `${l.garageSpaces} spaces` : "—")],
    ["Pool", (l) => (l.hasPool ? "Yes" : "No")],
    ["Nearest school", (l) => (l.schools[0] ? `${l.schools[0].school.name} (${l.schools[0].school.rating}/10)` : "—")],
    ["Walkability", (l) => (l.walkScore != null ? `${l.walkScore}/100` : "—")],
    ["Flood risk", (l) => (l.floodRisk != null ? `${l.floodRisk}/10` : "—")],
    ["Days on market", (l) => (l.status === "SOLD" ? "Sold" : String(daysSince(l.listDate)))],
  ];

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-display-md font-semibold">Compare {listings.length} homes</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">Side-by-side comparison</caption>
          <thead>
            <tr>
              <th scope="col" className="w-40 bg-muted/50 p-3 text-left text-xs font-medium text-muted-foreground">Home</th>
              {listings.map((l) => (
                <th key={l.id} scope="col" className="p-3 text-left align-top font-normal">
                  <Link href={`/property/${l.slug}`} className="group block">
                    <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-muted">
                      {l.media[0] && <ListingImage src={l.media[0].url} alt={l.media[0].alt} blurDataUrl={l.media[0].blurDataUrl} color={l.media[0].color} fill sizes="25vw" />}
                    </div>
                    <p className="mt-2 font-semibold group-hover:text-primary">{l.communityName ?? l.streetAddress}</p>
                    <p className="text-xs text-muted-foreground">{l.city}, {l.state} {l.zip}</p>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {facts.map(([label, get]) => (
              <tr key={label} className="border-t">
                <th scope="row" className="bg-muted/50 p-3 text-left text-xs font-medium text-muted-foreground">{label}</th>
                {listings.map((l) => <td key={l.id} className="p-3">{get(l)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Demo listing data — verify details with the listing agent.</p>
    </div>
  );
}
