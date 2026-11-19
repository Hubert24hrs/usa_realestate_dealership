const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return usd0.format(value);
}

export function formatMoney(value: number | null | undefined, cents = false): string {
  if (value == null || Number.isNaN(value)) return "—";
  return cents ? usd2.format(value) : usd0.format(value);
}

/** $1.25M · $850K · $2,450 */
export function formatCompactPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m >= 10 ? m.toFixed(1).replace(/\.0$/, "") : m.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}M`;
  }
  if (abs >= 10_000) return `$${Math.round(value / 1000)}K`;
  return usd0.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return int.format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatBaths(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatAcres(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value >= 10 ? Math.round(value).toLocaleString("en-US") : value.toFixed(2).replace(/0$/, "")} acres`;
}

export function formatLot(lotSqft: number | null | undefined, lotAcres?: number | null): string {
  if (lotAcres && lotAcres >= 0.5) return formatAcres(lotAcres);
  if (lotSqft) return `${formatNumber(lotSqft)} sqft lot`;
  return "—";
}

export function daysSince(date: Date | string | null | undefined, now: Date = new Date()): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86_400_000));
}

export function formatDaysOnMarket(days: number): string {
  if (days <= 0) return "New today";
  if (days === 1) return "1 day on market";
  return `${days} days on market`;
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return dateFmt.format(typeof date === "string" ? new Date(date) : date);
}

export function formatShortDate(date: Date | string): string {
  return shortDateFmt.format(typeof date === "string" ? new Date(date) : date);
}

export function formatTime(date: Date | string): string {
  return timeFmt.format(typeof date === "string" ? new Date(date) : date);
}

export function formatWeekday(date: Date | string): string {
  return weekdayFmt.format(typeof date === "string" ? new Date(date) : date);
}

export function formatAddressLine(l: {
  streetAddress: string;
  unit?: string | null;
  city: string;
  state: string;
  zip: string;
  /** Seller/MLS asked for the street address to be withheld (e.g. IDX InternetAddressDisplayYN = false). */
  hideAddress?: boolean | null;
}): string {
  if (l.hideAddress) return `${l.city}, ${l.state} ${l.zip}`;
  return `${l.streetAddress}${l.unit ? ` ${l.unit}` : ""}, ${l.city}, ${l.state} ${l.zip}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

const relativeFmt = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday" — falls back to a date beyond a week. */
export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = (d.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return relativeFmt.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relativeFmt.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return relativeFmt.format(Math.round(seconds / 86_400), "day");
  return formatDate(d);
}
