import { PROPERTY_TYPE_LABELS } from "@/lib/domain";
import { daysSince, formatAcres, formatBaths, formatCompactPrice, formatDate, formatNumber, formatPrice, formatTime, formatWeekday } from "@/lib/format";
import type { ListingCardData } from "@/lib/search/types";

type PriceInput = Pick<ListingCardData, "transactionType" | "status" | "price" | "priceMax" | "soldPrice" | "leaseRate" | "category">;

/** Headline price as shown on cards: $725,000 · $1,850/mo · $1,450–$3,200/mo · $32/SF/yr · Sold $705,000 */
export function displayPrice(l: PriceInput, compact = false): string {
  const fmt = compact ? formatCompactPrice : formatPrice;
  if (l.status === "SOLD" && l.soldPrice) return `${fmt(l.soldPrice)}`;
  if (l.transactionType === "LEASE" && l.leaseRate) return `$${l.leaseRate.toFixed(2).replace(/\.00$/, "")}/SF/yr`;
  if (l.transactionType === "RENT") {
    if (l.priceMax && l.priceMax !== l.price) return `${formatPrice(l.price)} to ${formatPrice(l.priceMax)}/mo`;
    return `${formatPrice(l.price)}/mo`;
  }
  return fmt(l.price);
}

export function factsLine(l: ListingCardData): string[] {
  if (l.category === "LAND") {
    return [formatAcres(l.lotAcres), l.pricePerAcre ? `${formatCompactPrice(l.pricePerAcre)}/acre` : "", PROPERTY_TYPE_LABELS[l.propertyType]].filter(Boolean);
  }
  if (l.category === "COMMERCIAL") {
    return [
      l.availableSqft ? `${formatNumber(l.availableSqft)} SF avail.` : l.sqft ? `${formatNumber(l.sqft)} SF` : "",
      PROPERTY_TYPE_LABELS[l.propertyType],
      l.capRate ? `${l.capRate.toFixed(2)}% cap` : "",
    ].filter(Boolean);
  }
  if (l.isCommunity) {
    const min = l.beds ?? 0;
    const max = l.bedsMax ?? min;
    const label = (b: number) => (b === 0 ? "Studio" : `${b} bd`);
    return [min === max ? label(min) : `${label(min)} to ${max} bd`, "Apartment community"];
  }
  return [
    l.beds != null ? `${l.beds === 0 ? "Studio" : `${l.beds} bd`}` : "",
    l.baths != null ? `${formatBaths(l.baths)} ba` : "",
    l.sqft ? `${formatNumber(l.sqft)} sqft` : "",
  ].filter(Boolean);
}

export function listingTitle(l: Pick<ListingCardData, "isCommunity" | "communityName" | "streetAddress" | "unit">): string {
  if (l.isCommunity && l.communityName) return l.communityName;
  return `${l.streetAddress}${l.unit ? ` ${l.unit}` : ""}`;
}

export function daysOnMarketLabel(l: Pick<ListingCardData, "status" | "listDate" | "soldDate">): string {
  if (l.status === "SOLD" && l.soldDate) {
    const d = new Date(l.soldDate);
    return `Sold ${formatDate(d)}`;
  }
  if (l.status === "COMING_SOON") return "Coming soon";
  const days = daysSince(l.listDate);
  if (days <= 0) return "Listed today";
  return days === 1 ? "1 day on CITI VIEW" : `${days} days on CITI VIEW`;
}

export interface Badge {
  label: string;
  tone: "brand" | "copper" | "success" | "neutral" | "warning" | "ink";
}

export function listingBadges(l: ListingCardData, now = new Date()): Badge[] {
  const badges: Badge[] = [];
  const days = daysSince(l.listDate, now);
  if (l.status === "PENDING") badges.push({ label: "Pending", tone: "warning" });
  if (l.status === "COMING_SOON") badges.push({ label: "Coming soon", tone: "copper" });
  if (l.status === "SOLD") badges.push({ label: "Sold", tone: "ink" });
  if (l.status === "ACTIVE" && days <= 7) badges.push({ label: "New", tone: "brand" });
  if (l.priceReduction && l.status === "ACTIVE") badges.push({ label: `Price cut ${formatCompactPrice(l.priceReduction)}`, tone: "success" });
  if (l.openHouse) {
    const d = new Date(l.openHouse.startsAt);
    badges.push({ label: `Open ${formatWeekday(d)} ${formatTime(d)}`, tone: "neutral" });
  }
  if (l.isNewConstruction) badges.push({ label: "New construction", tone: "brand" });
  if (l.isForeclosure) badges.push({ label: "Foreclosure", tone: "warning" });
  if (l.isFsbo) badges.push({ label: "By owner", tone: "neutral" });
  if (l.moveInSpecial) badges.push({ label: "Special", tone: "copper" });
  if (l.has3dTour) badges.push({ label: "3D tour", tone: "neutral" });
  return badges.slice(0, 3);
}

export function attribution(l: Pick<ListingCardData, "isFsbo" | "brokerageName" | "listingAgentName">): string {
  if (l.isFsbo) return "Listed by owner";
  if (l.brokerageName) return `Listing courtesy of ${l.brokerageName}`;
  return "Listed on the MLS";
}
