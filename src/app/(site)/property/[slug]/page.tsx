import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, Gift, PawPrint } from "lucide-react";
import { HeroGallery } from "@/components/gallery/hero-gallery";
import type { GalleryItem } from "@/components/gallery/types";
import { ListingRail } from "@/components/home/rail";
import { AffordabilityCheck } from "@/components/listing/affordability-check";
import { CommercialDocuments } from "@/components/listing/commercial-documents";
import { CommuteCalculator } from "@/components/listing/commute-calculator";
import { ContactCard } from "@/components/listing/contact-card";
import { ListingActions, ViewTracker } from "@/components/listing/listing-actions";
import { PaymentCalculator } from "@/components/listing/payment-calculator";
import { RentalUnits } from "@/components/listing/rental-units";
import { scoreDescriptor, ScoreMeter } from "@/components/listing/score-meter";
import { EstimatePanel, FactGrid, FeatureList, ListingDisclaimers, PriceHistoryTable, RiskPanel, SchoolList, Section, TaxHistoryTable } from "@/components/listing/sections";
import { CompareProvider } from "@/components/listing/compare";
import { PriceHistoryChart } from "@/components/charts/price-history-chart";
import { PlaceMap, type PlaceMarker } from "@/components/map/place-map";
import { db } from "@/lib/db";
import { PROPERTY_TYPE_LABELS, STATUS_LABELS, type ListingStatusKey, type MediaCategoryKey, type MediaProviderKey } from "@/lib/domain";
import { paymentBreakdown } from "@/lib/finance/mortgage";
import { daysSince, formatAcres, formatAddressLine, formatBaths, formatDate, formatMoney, formatNumber, formatPrice, formatTime } from "@/lib/format";
import type { LngLat } from "@/lib/geo";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { getListingBySlug, getListingContext, type ListingDetail } from "@/server/listing";
import { ndaCookieName, ndaToken } from "@/server/nda";
import { getSettings } from "@/server/settings";

type Props = { params: Promise<{ slug: string }> };

function titleOf(l: ListingDetail) {
  return l.isCommunity && l.communityName ? l.communityName : `${l.streetAddress}${l.unit ? ` ${l.unit}` : ""}`;
}

function priceLabel(l: ListingDetail) {
  if (l.status === "SOLD" && l.soldPrice) return formatPrice(l.soldPrice);
  if (l.transactionType === "LEASE" && l.leaseRate) return `$${l.leaseRate.toFixed(2)}/SF/yr`;
  if (l.transactionType === "RENT") return l.priceMax && l.priceMax !== l.price ? `${formatPrice(l.price)}–${formatPrice(l.priceMax)}/mo` : `${formatPrice(l.price)}/mo`;
  return formatPrice(l.price);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const l = await getListingBySlug(slug);
  if (!l) notFound();
  const unitBeds = l.units.map((u) => u.beds);
  const facts =
    l.category === "LAND"
      ? formatAcres(l.lotAcres)
      : l.category === "COMMERCIAL"
        ? `${formatNumber(l.sqft)} SF ${PROPERTY_TYPE_LABELS[l.propertyType]}`
        : l.isCommunity && unitBeds.length
          ? `${Math.min(...unitBeds) === 0 ? "Studio" : `${Math.min(...unitBeds)} bd`}–${Math.max(...unitBeds)} bd apartments`
          : `${l.beds === 0 ? "Studio" : `${l.beds} bd`}, ${formatBaths(l.baths)} ba${l.sqft ? `, ${formatNumber(l.sqft)} sqft` : ""}`;
  const title = `${formatAddressLine(l)} | ${priceLabel(l)} | ${facts}`;
  const photo = l.media.find((m) => !m.url.includes(".svg"));
  return {
    title,
    description: `${l.headline ?? ""}. ${l.description}`.slice(0, 158),
    alternates: { canonical: `/property/${l.slug}` },
    openGraph: { title, type: "website", url: `${site.url}/property/${l.slug}`, images: photo ? [{ url: photo.url, width: photo.width ?? undefined, height: photo.height ?? undefined, alt: photo.alt }] : undefined },
  };
}

export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const l = await getListingBySlug(slug);
  if (!l) notFound();
  const [context, settings, rate, jar] = await Promise.all([getListingContext(l), getSettings(), db.mortgageRate.findFirst({ where: { slug: "30-year-fixed" }, orderBy: { date: "desc" } }), cookies()]);
  const thirty = rate?.rate ?? 6.25;
  const variant = l.category === "RENTAL" ? "rent" : l.category === "COMMERCIAL" ? "commercial" : l.category === "LAND" ? "land" : l.status === "SOLD" ? "sold" : "sale";
  const title = titleOf(l);
  const city = l.cityRef;
  const hood = l.neighborhood;
  const dom = daysSince(l.listDate);
  const galleryItems: GalleryItem[] = l.media.map((m) => ({ id: m.id, url: m.url, alt: m.alt, category: m.category as MediaCategoryKey, width: m.width, height: m.height, blurDataUrl: m.blurDataUrl, color: m.color, provider: m.provider as MediaProviderKey, photographer: m.photographer, photographerUrl: m.photographerUrl, sourceUrl: m.sourceUrl }));
  const ndaCookie = jar.get(ndaCookieName(l.id))?.value?.split("|");
  const ndaUnlocked = Boolean(ndaCookie?.[0] && ndaCookie[1] === ndaToken(l.id, ndaCookie[0]));
  const est = variant === "sale" ? paymentBreakdown({ price: l.price, downPayment: l.price * 0.2, ratePct: thirty, termYears: 30, propertyTaxAnnual: l.propertyTaxAnnual ?? l.price * 0.011, insuranceAnnual: l.price * 0.0035, hoaMonthly: l.hoaFee ?? 0 }).total : null;
  const schools = l.schools.map((s) => ({ id: s.school.id, name: s.school.name, rating: s.school.rating, level: s.school.level, type: s.school.type, grades: s.school.grades, distanceMiles: s.distanceMiles, isAssigned: s.isAssigned, district: s.school.district?.name ?? null }));

  const markers: PlaceMarker[] = [
    { id: "home", lat: l.lat, lng: l.lng, label: title, kind: "home" },
    ...context.amenities.slice(0, 12).map((a) => ({ id: a.id, lat: a.lat, lng: a.lng, label: `${a.name} · ${a.miles.toFixed(1)} mi`, kind: "amenity" as const, type: a.type })),
  ];
  const destinations = [
    ...(city ? [{ id: "downtown", label: `Downtown ${city.name}`, lat: city.lat, lng: city.lng }] : []),
    ...context.amenities.filter((a) => ["TRANSIT", "HOSPITAL", "SHOPPING", "PARK"].includes(a.type)).slice(0, 5).map((a) => ({ id: a.id, label: `${a.name} (${a.type.toLowerCase()})`, lat: a.lat, lng: a.lng })),
    ...l.schools.slice(0, 3).map((s) => ({ id: s.school.id, label: s.school.name, lat: s.school.lat, lng: s.school.lng })),
  ];
  const parcel: LngLat[] | null = l.category === "LAND" && l.lotAcres ? (() => {
    const side = Math.sqrt(l.lotAcres! * 4046.86);
    const dLat = side / 2 / 111_320;
    const dLng = side / 2 / (111_320 * Math.cos((l.lat * Math.PI) / 180));
    return [[l.lng - dLng, l.lat - dLat], [l.lng + dLng * 1.08, l.lat - dLat * 0.9], [l.lng + dLng, l.lat + dLat], [l.lng - dLng * 0.94, l.lat + dLat * 1.05]];
  })() : null;

  const statusBadge = l.status !== "ACTIVE" ? STATUS_LABELS[l.status as ListingStatusKey] : variant === "rent" ? "For rent" : variant === "commercial" ? (l.transactionType === "LEASE" ? "For lease" : "For sale") : "For sale";
  const breadcrumbs = [
    { name: "Home", href: "/" },
    ...(city ? [{ name: city.state.name, href: `/${city.state.slug}` }, { name: city.name, href: `/${city.slug}` }] : []),
    ...(hood && city && !city.isRural ? [{ name: hood.name, href: `/${city.slug}/${hood.slug}` }] : []),
    { name: title, href: `/property/${l.slug}` },
  ];
  const schemaType = l.propertyType === "SINGLE_FAMILY" ? "SingleFamilyResidence" : l.propertyType === "CONDO" || l.propertyType === "APARTMENT" ? "Apartment" : l.category === "RESIDENTIAL" || l.category === "RENTAL" ? "House" : "Place";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: `${title}, ${l.city}, ${l.state}`,
      url: `${site.url}/property/${l.slug}`,
      datePosted: l.listDate.toISOString(),
      description: l.description,
      image: l.media.filter((m) => !m.url.includes(".svg")).slice(0, 6).map((m) => m.url),
      offers: {
        "@type": "Offer",
        price: l.status === "SOLD" ? l.soldPrice ?? l.price : l.price,
        priceCurrency: "USD",
        availability: l.status === "SOLD" || l.status === "RENTED" ? "https://schema.org/SoldOut" : l.status === "PENDING" ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
        businessFunction: l.transactionType === "SALE" ? "https://purl.org/goodrelations/v1#Sell" : "https://purl.org/goodrelations/v1#LeaseOut",
      },
      mainEntity: {
        "@type": schemaType,
        address: { "@type": "PostalAddress", streetAddress: l.streetAddress, addressLocality: l.city, addressRegion: l.state, postalCode: l.zip, addressCountry: "US" },
        geo: { "@type": "GeoCoordinates", latitude: l.lat, longitude: l.lng },
        ...(l.beds != null ? { numberOfRooms: l.beds } : {}),
        ...(l.sqft ? { floorSize: { "@type": "QuantitativeValue", value: l.sqft, unitCode: "FTK" } } : {}),
        ...(hood ? { containedInPlace: { "@type": "Place", name: `${hood.name}, ${l.city}, ${l.state}` } } : {}),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, item: `${site.url}${b.href}` })),
    },
  ];

  const facts: Array<[string, React.ReactNode | null | undefined]> =
    variant === "commercial"
      ? [
          ["Property type", PROPERTY_TYPE_LABELS[l.propertyType]],
          ["Building size", l.buildingSqft ? `${formatNumber(l.buildingSqft)} SF` : null],
          ["Available", l.availableSqft ? `${formatNumber(l.availableSqft)} SF` : null],
          ["Building class", l.buildingClass ? `Class ${l.buildingClass}` : null],
          ["Year built", l.yearBuilt],
          ["Stories", l.stories],
          ["Lot size", formatAcres(l.lotAcres)],
          ["Zoning", l.zoning],
          ["Occupancy", l.occupancyPct != null ? `${l.occupancyPct}%` : null],
          ["Parking", l.parkingSpaces ? `${l.parkingSpaces} spaces${l.parkingRatio ? ` (${l.parkingRatio}/1,000 SF)` : ""}` : null],
          ["Clear height", l.ceilingHeight ? `${l.ceilingHeight} ft` : null],
          ["Loading docks", l.loadingDocks || null],
          ["Tenancy", l.tenancy],
          ["Lease type", l.leaseType],
          ["Days on market", dom],
        ]
      : variant === "land"
        ? [
            ["Acreage", formatAcres(l.lotAcres)],
            ["Price per acre", l.pricePerAcre ? formatPrice(l.pricePerAcre) : null],
            ["Land type", l.landTypes.join(", ")],
            ["Topography", l.topography],
            ["Soil", l.soilType],
            ["Road frontage", l.roadFrontageFt ? `${formatNumber(l.roadFrontageFt)} ft` : null],
            ["Water rights", l.hasWaterRights ? "Included" : "Not included"],
            ["Mineral rights", l.hasMineralRights ? "Included" : "Not included"],
            ["Timber", l.hasTimber ? "Yes" : "No"],
            ["Fencing", l.fencing],
            ["Irrigation", l.irrigation],
            ["County", l.county],
          ]
        : [
            ["Home type", PROPERTY_TYPE_LABELS[l.propertyType]],
            ["Year built", l.yearBuilt],
            ["Lot", l.lotSqft ? (l.lotAcres && l.lotAcres >= 0.5 ? formatAcres(l.lotAcres) : `${formatNumber(l.lotSqft)} sqft`) : null],
            ["Price per sqft", l.pricePerSqft ? `$${formatNumber(l.pricePerSqft)}` : null],
            ["HOA", l.hoaFee ? `${formatMoney(l.hoaFee)}/mo` : "None"],
            ["Parking", l.parkingType ? `${l.parkingType}${l.garageSpaces ? ` · ${l.garageSpaces} garage` : ""}` : null],
            ["Stories", l.stories],
            ["Heating", l.heating],
            ["Cooling", l.cooling],
            ["Laundry", l.laundry],
            ["Days on market", l.status === "SOLD" ? null : dom],
            ["MLS #", l.mlsNumber],
          ];

  const nav = [
    ["overview", "Overview"],
    ["facts", "Facts & features"],
    ...(variant === "rent" ? [["units", l.isCommunity ? "Units & pricing" : "Rental details"]] : []),
    ...(variant === "commercial" ? [["investment", "Investment"], ["documents", "Documents"]] : []),
    ...(variant === "land" ? [["land", "Land details"]] : []),
    ...(variant === "sale" || variant === "sold" ? [["history", "Price history"]] : []),
    ...(variant === "sale" ? [["payment", "Payment"]] : []),
    ["neighborhood", "Neighborhood"],
  ] as const;

  return (
    <CompareProvider>
      <ViewTracker entry={{ id: l.id, citySlug: city?.slug ?? null, price: l.price, beds: l.beds, mode: variant === "rent" ? "rent" : variant === "commercial" ? "commercial" : variant === "land" ? "land" : variant === "sold" ? "sold" : l.isNewConstruction ? "new" : "buy" }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-page pt-4 pb-16">
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted-foreground print:hidden">
          <ol className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((b, i) => (
              <li key={b.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" aria-hidden />}
                {i === breadcrumbs.length - 1 ? <span aria-current="page" className="max-w-48 truncate text-foreground">{b.name}</span> : <Link href={b.href} className="hover:text-foreground hover:underline">{b.name}</Link>}
              </li>
            ))}
          </ol>
        </nav>

        <HeroGallery items={galleryItems} extras={{ tourUrl: l.has3dTour ? (l.virtualTourUrl?.startsWith("https://") ? l.virtualTourUrl : "demo:3d") : null, videoUrl: l.hasVideo ? (l.videoUrl?.startsWith("https://") ? l.videoUrl : "demo:video") : null, title }} />

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", l.status === "SOLD" ? "bg-ink text-background" : l.status === "PENDING" ? "bg-warning text-warning-foreground" : l.status === "COMING_SOON" ? "bg-copper-500 text-white" : "bg-success text-success-foreground")}>{statusBadge}</span>
                {l.isNewConstruction && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-100 dark:text-brand-900">New construction{l.builderName ? ` · ${l.builderName}` : ""}</span>}
                {l.isForeclosure && <span className="rounded-full bg-warning/20 px-2.5 py-1 text-xs font-semibold">Foreclosure · sold as-is</span>}
                {l.isFsbo && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">For sale by owner</span>}
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[2.1rem] leading-none font-semibold tracking-tight">{priceLabel(l)}</p>
                  {l.priceReduction && l.status === "ACTIVE" && <p className="mt-1.5 text-sm font-medium text-success">↓ Price cut {formatPrice(l.priceReduction)} on {formatDate(l.priceReducedAt)}</p>}
                  {l.status === "SOLD" && <p className="mt-1.5 text-sm text-muted-foreground">Sold {formatDate(l.soldDate)} · listed at {formatPrice(l.price)}</p>}
                  {est && <a href="#payment" className="mt-1.5 inline-block text-sm text-muted-foreground hover:text-primary hover:underline">Est. {formatMoney(est)}/mo</a>}
                </div>
                <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-label="Key facts">
                  {variant === "land" ? (
                    <><li><strong className="text-lg">{formatAcres(l.lotAcres)}</strong></li>{l.pricePerAcre && <li><strong className="text-lg">{formatPrice(l.pricePerAcre)}</strong> /acre</li>}</>
                  ) : variant === "commercial" ? (
                    <><li><strong className="text-lg">{formatNumber(l.buildingSqft)}</strong> SF</li>{l.capRate && <li><strong className="text-lg">{l.capRate.toFixed(2)}%</strong> cap rate</li>}<li><strong className="text-lg">{PROPERTY_TYPE_LABELS[l.propertyType]}</strong></li></>
                  ) : l.isCommunity ? (
                    <><li><strong className="text-lg">{l.units.length}</strong> floor plans</li><li><strong className="text-lg">{Math.min(...l.units.map((u) => u.beds)) === 0 ? "Studio" : Math.min(...l.units.map((u) => u.beds))}–{Math.max(...l.units.map((u) => u.beds))}</strong> bd</li></>
                  ) : (
                    <><li><strong className="text-lg">{l.beds}</strong> bd</li><li><strong className="text-lg">{formatBaths(l.baths)}</strong> ba</li><li><strong className="text-lg">{formatNumber(l.sqft)}</strong> sqft</li></>
                  )}
                </ul>
              </div>
              <h1 className="text-lg font-medium">{title}<span className="block text-base font-normal text-muted-foreground">{l.city}, {l.state} {l.zip}{hood ? ` · ${hood.name}` : ""}</span></h1>
              <ListingActions listingId={l.id} title={title} />
            </header>

            <nav aria-label="On this page" className="sticky top-16 z-20 -mx-4 mt-6 overflow-x-auto border-b bg-background/95 px-4 backdrop-blur scrollbar-none print:hidden">
              <ul className="flex gap-1 py-2">
                {nav.map(([id, label]) => <li key={id}><a href={`#${id}`} className="block rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-foreground">{label}</a></li>)}
              </ul>
            </nav>

            {l.moveInSpecial && (
              <p className="mt-6 flex items-center gap-2 rounded-2xl border border-copper-300 bg-copper-50 p-4 text-sm font-medium text-copper-800 dark:bg-copper-50/10 dark:text-copper-700"><Gift className="size-5 shrink-0" aria-hidden /> Move-in special: {l.moveInSpecial}</p>
            )}

            <Section id="overview" title={l.headline ?? "Overview"}>
              <p className="prose-cv max-w-none whitespace-pre-line">{l.description}</p>
              {l.openHouses.length > 0 && (
                <div className="mt-6 rounded-2xl border bg-surface p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-primary" aria-hidden /> Open houses</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {l.openHouses.map((o) => (
                      <li key={o.id} className="rounded-xl border bg-card p-3 text-sm">
                        <p className="font-medium">{o.startsAt.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
                        <p className="text-muted-foreground">{formatTime(o.startsAt)} – {formatTime(o.endsAt)} · {o.type === "VIRTUAL" ? "Virtual" : "In person"}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>

            <Section id="facts" title="Facts & features">
              <FactGrid facts={facts} />
              <div className="mt-6">
                <FeatureList
                  groups={
                    variant === "commercial"
                      ? [["Investment highlights", l.investmentHighlights], ["Utilities", l.utilities]]
                      : variant === "land"
                        ? [["Activities", l.activities], ["Water", l.waterFeatures], ["Improvements", l.improvements], ["Utilities", l.utilities]]
                        : [["Interior", l.interiorFeatures], ["Exterior", l.exteriorFeatures], ["Appliances", l.appliances], ["Community", l.communityFeatures], ["Flooring", l.flooring], ["Utilities", l.utilities]]
                  }
                />
              </div>
            </Section>

            {variant === "rent" && (
              <Section id="units" title={l.isCommunity ? "Units & pricing" : "Rental details"} subtitle={l.isCommunity ? "Live availability · prices include base rent only" : undefined}>
                {l.isCommunity && l.units.length > 0 && (
                  <RentalUnits applyBase={`/rent/apply/${l.slug}`} units={l.units.map((u) => ({ id: u.id, unitNumber: u.unitNumber, floorPlan: u.floorPlan, beds: u.beds, baths: u.baths, sqft: u.sqft, rent: u.rent, deposit: u.deposit, availableDate: u.availableDate?.toISOString() ?? null, isAvailable: u.isAvailable, floor: u.floor, features: u.features }))} />
                )}
                <div className={cn(l.isCommunity && "mt-6")}>
                  <FactGrid facts={[["Available", l.availableDate ? (l.availableDate <= new Date() ? "Now" : formatDate(l.availableDate)) : null], ["Lease term", l.leaseTermMonths ? `${l.leaseTermMonths} months` : null], ["Security deposit", l.securityDeposit ? formatPrice(l.securityDeposit) : null], ["Application fee", l.applicationFee ? formatPrice(l.applicationFee) : null], ["Furnished", l.furnished ? "Yes" : "No"], ["Utilities included", l.utilitiesIncluded.join(", ") || "None"]]} />
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border p-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold"><PawPrint className="size-4 text-primary" aria-hidden /> Pet policy</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{l.petPolicy ?? "Contact the property for pet policy."}</p>
                    {(l.petDeposit || l.petRent) && <p className="mt-2 text-sm">{l.petDeposit ? `Deposit ${formatPrice(l.petDeposit)}` : ""}{l.petDeposit && l.petRent ? " · " : ""}{l.petRent ? `Pet rent ${formatPrice(l.petRent)}/mo` : ""}</p>}
                  </div>
                  <div className="rounded-2xl border p-4">
                    <h3 className="text-sm font-semibold">Fees</h3>
                    <ul className="mt-2 space-y-1 text-sm">
                      {((l.fees as Array<{ label: string; amount: number; frequency: string }> | null) ?? []).filter((f) => f.amount > 0).map((f) => (
                        <li key={f.label} className="flex justify-between gap-2"><span className="text-muted-foreground">{f.label}</span><span className="font-medium">{formatPrice(f.amount)} <span className="text-xs font-normal text-muted-foreground">{f.frequency}</span></span></li>
                      ))}
                    </ul>
                  </div>
                </div>
                {l.rentalAmenities.length > 0 && (
                  <div className="mt-6"><FeatureList groups={[["Amenities", l.rentalAmenities]]} /></div>
                )}
                <p className="mt-6 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">Never send money before touring and signing a lease through a verified platform. <Link href="/learn/avoid-rental-scams" className="font-medium text-primary hover:underline">How to spot rental scams</Link>.</p>
              </Section>
            )}

            {variant === "commercial" && (
              <>
                <Section id="investment" title={l.transactionType === "LEASE" ? "Lease terms & availability" : "Investment summary"}>
                  {l.transactionType === "SALE" ? (
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[["Asking price", formatPrice(l.price)], ["Cap rate", l.capRate ? `${l.capRate.toFixed(2)}%` : "—"], ["NOI", formatPrice(l.noi)], ["Price / SF", l.pricePerSqft ? `$${l.pricePerSqft}` : "—"]].map(([k, v]) => (
                        <div key={k} className="rounded-2xl border bg-surface p-4"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 text-xl font-semibold">{v}</dd></div>
                      ))}
                    </dl>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border">
                      <table className="w-full min-w-[640px] text-sm">
                        <caption className="sr-only">Available spaces</caption>
                        <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr>{["Space", "Use", "Size", "Rate", "Lease type", "Term", "Condition", "Available"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
                        <tbody className="tabular-nums">
                          {l.spaces.map((s) => (
                            <tr key={s.id} className="border-t">
                              <th scope="row" className="px-3 py-2 text-left font-semibold">{s.suite}</th>
                              <td className="px-3 py-2">{s.spaceUse}</td>
                              <td className="px-3 py-2">{formatNumber(s.sqft)} SF</td>
                              <td className="px-3 py-2 font-medium">{s.rate ? `$${s.rate.toFixed(2)}${s.rateType ?? ""}` : "Negotiable"}</td>
                              <td className="px-3 py-2">{s.leaseType}</td>
                              <td className="px-3 py-2">{s.term}</td>
                              <td className="px-3 py-2">{s.condition}</td>
                              <td className="px-3 py-2">{s.availableDate && s.availableDate > new Date() ? formatDate(s.availableDate) : "Now"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Section>
                <Section id="documents" title="Documents" subtitle={l.ndaRequired ? "Confidential materials require a signed confidentiality agreement." : undefined}>
                  <CommercialDocuments listingId={l.id} initiallyUnlocked={ndaUnlocked} documents={l.documents.map((d) => ({ id: d.id, name: d.name, kind: d.kind, requiresNda: d.requiresNda, pages: d.pages, sizeKb: d.sizeKb }))} />
                </Section>
              </>
            )}

            {variant === "land" && (
              <Section id="land" title="Land details" subtitle="Topography, soil and county records">
                <PlaceMap center={{ lat: l.lat, lng: l.lng }} zoom={l.lotAcres && l.lotAcres > 200 ? 13 : 14} markers={[markers[0]!]} parcel={parcel} terrainControls height={420} label="Parcel map with topography and soil layers" />
                {l.countyData && (
                  <div className="mt-6 overflow-x-auto rounded-2xl border">
                    <table className="w-full text-sm">
                      <caption className="px-3 pt-3 text-left text-sm font-semibold">County data (demo)</caption>
                      <tbody>
                        {Object.entries(l.countyData as Record<string, unknown>).map(([k, v]) => (
                          <tr key={k} className="border-t">
                            <th scope="row" className="px-3 py-2 text-left font-normal text-muted-foreground">{k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace("Apn", "APN")}</th>
                            <td className="px-3 py-2 font-medium">{typeof v === "boolean" ? (v ? "Yes" : "No") : typeof v === "number" ? (k.toLowerCase().includes("tax") ? formatPrice(v) : formatNumber(v)) : String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {l.timberDescription && <p className="mt-4 text-sm"><span className="font-semibold">Timber:</span> <span className="text-muted-foreground">{l.timberDescription}</span></p>}
              </Section>
            )}

            {(variant === "sale" || variant === "sold") && (
              <Section id="history" title="Price & tax history">
                <PriceHistoryChart points={l.priceHistory.map((p) => ({ date: p.date.toISOString(), price: p.price, event: p.event }))} />
                <div className="mt-5 space-y-5">
                  <PriceHistoryTable rows={l.priceHistory} />
                  <TaxHistoryTable rows={l.taxHistory} />
                </div>
              </Section>
            )}

            {l.estimatedValue && l.estimateLow && l.estimateHigh && (
              <Section id="estimate" title="Estimated value" subtitle="How this home compares with the CITI VIEW Estimate">
                <EstimatePanel estimate={l.estimatedValue} low={l.estimateLow} high={l.estimateHigh} listPrice={l.status === "SOLD" && l.soldPrice ? l.soldPrice : l.price} rentEstimate={l.rentEstimate} />
              </Section>
            )}

            {variant === "sale" && (
              <>
                <Section id="payment" title="Monthly payment" subtitle={`Based on a ${thirty.toFixed(2)}% sample 30-year fixed rate`}>
                  <PaymentCalculator price={l.price} taxAnnual={l.propertyTaxAnnual} hoaMonthly={l.hoaFee} defaultRate={thirty} />
                </Section>
                <Section id="afford" title="Can I afford this home?">
                  <AffordabilityCheck price={l.price} taxAnnual={l.propertyTaxAnnual} hoaMonthly={l.hoaFee} defaultRate={thirty} />
                </Section>
              </>
            )}

            <Section id="neighborhood" title={`About ${hood?.name ?? l.city}`} subtitle={hood?.description ?? city?.description ?? undefined}>
              <div className="grid gap-5 sm:grid-cols-3">
                <ScoreMeter label="Walkability" value={l.walkScore} descriptor={scoreDescriptor(l.walkScore)} />
                <ScoreMeter label="Transit" value={l.transitScore} descriptor={scoreDescriptor(l.transitScore)} />
                <ScoreMeter label="Bikeability" value={l.bikeScore} descriptor={scoreDescriptor(l.bikeScore)} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">CITI VIEW demo mobility scores (0–100).</p>
              <div className="mt-8 grid gap-8 2xl:grid-cols-2">
                <div>
                  <h3 className="mb-3 font-semibold">Nearby amenities</h3>
                  <PlaceMap center={{ lat: l.lat, lng: l.lng }} markers={markers} height={320} label={`Map of amenities near ${title}`} />
                  <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    {context.amenities.slice(0, 8).map((a) => (
                      <li key={a.id} className="flex justify-between gap-2"><span className="truncate">{a.name}</span><span className="shrink-0 text-muted-foreground">{a.miles.toFixed(1)} mi</span></li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 font-semibold">Commute</h3>
                  <CommuteCalculator origin={{ lat: l.lat, lng: l.lng }} destinations={destinations} />
                </div>
              </div>
              {variant !== "commercial" && variant !== "land" && (
                <div className="mt-8">
                  <h3 className="mb-3 font-semibold">Schools</h3>
                  <SchoolList schools={schools} />
                  <p className="mt-2 text-xs text-muted-foreground">School names, ratings and assignments are demo data. Always confirm enrollment boundaries with the school district.</p>
                </div>
              )}
              <div className="mt-8">
                <h3 className="mb-4 font-semibold">Climate & environmental risk</h3>
                <RiskPanel risks={{ flood: l.floodRisk, fire: l.fireRisk, heat: l.heatRisk, wind: l.windRisk, air: l.airQuality, crime: l.crimeIndex, noise: l.noiseLevel }} />
              </div>
            </Section>

            <ListingDisclaimers listingDisclaimer={settings.listingDisclaimer} idxDisclaimer={settings.idxDisclaimer} fairHousing={settings.fairHousing} attribution={l.isFsbo ? "Listed by owner (FSBO)" : `Listing courtesy of ${l.brokerageName ?? "Demo Brokerage"}`} mlsNumber={l.mlsNumber} updatedAt={l.updatedAt} />
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start print:hidden">
            <ContactCard
              listingId={l.id}
              listingTitle={title}
              price={l.price}
              isFsbo={l.isFsbo}
              variant={variant}
              applyHref={variant === "rent" ? `/rent/apply/${l.slug}` : undefined}
              agent={l.agent ? { name: l.agent.name, slug: l.agent.slug, title: l.agent.title, phone: l.agent.phone, brandColor: l.agent.brandColor, organization: l.agent.organization?.name ?? null, licenseNumber: l.agent.licenseNumber, rating: l.agent.rating, reviewCount: l.agent.reviewCount } : null}
            />
          </div>
        </div>
      </div>

      <ListingRail id="similar" title={variant === "rent" ? "Similar rentals" : "Similar homes"} subtitle={`Nearby ${variant === "commercial" ? "commercial listings" : variant === "land" ? "land" : "listings"} at a similar price`} listings={context.similar} />
      {context.comps.length > 0 && <ListingRail id="comps" title="Nearby recently sold" subtitle="Comparable sales in the area" listings={context.comps.map((c) => c.card)} href={city ? `/sold-homes/${city.slug}` : "/sold-homes"} />}
    </CompareProvider>
  );
}
