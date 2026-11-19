// Hand-rolled en-US number formatting. The first Intl.NumberFormat on a page costs ~80 ms on a
// throttled phone (ICU start-up), and these helpers run during hydration almost everywhere.
// Output matches Intl's en-US formatting ("$1,234", "-$5", "$1,234.50", "12,345").
const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
/** Round half away from zero, as Intl does. */
const roundAway = (n: number, decimals = 0) => {
  const f = 10 ** decimals;
  return (Math.sign(n) * Math.round(Math.abs(n) * f)) / f;
};
function usd(value: number, decimals: 0 | 2): string {
  const r = roundAway(value, decimals);
  const sign = value < 0 ? "-" : ""; // like Intl, a negative that rounds to 0 keeps its sign
  if (decimals === 0) return `${sign}$${group(String(Math.abs(r)))}`;
  const [whole, frac] = Math.abs(r).toFixed(2).split(".");
  return `${sign}$${group(whole!)}.${frac}`;
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return usd(value, 0);
}

export function formatMoney(value: number | null | undefined, cents = false): string {
  if (value == null || Number.isNaN(value)) return "—";
  return usd(value, cents ? 2 : 0);
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
  return usd(value, 0);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const r = roundAway(value);
  return `${value < 0 ? "-" : ""}${group(String(Math.abs(r)))}`;
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
  return `${value >= 10 ? group(String(Math.round(value))) : value.toFixed(2).replace(/0$/, "")} acres`;
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

/** Build an Intl formatter on first use, so pages that never format dates don't pay ICU start-up. */
const lazy = <T,>(make: () => T) => {
  let value: T | undefined;
  return () => (value ??= make());
};
const dateFmt = lazy(() => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }));
const shortDateFmt = lazy(() => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }));
const timeFmt = lazy(() => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }));
const weekdayFmt = lazy(() => new Intl.DateTimeFormat("en-US", { weekday: "short" }));

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return dateFmt().format(typeof date === "string" ? new Date(date) : date);
}

export function formatShortDate(date: Date | string): string {
  return shortDateFmt().format(typeof date === "string" ? new Date(date) : date);
}

export function formatTime(date: Date | string): string {
  return timeFmt().format(typeof date === "string" ? new Date(date) : date);
}

export function formatWeekday(date: Date | string): string {
  return weekdayFmt().format(typeof date === "string" ? new Date(date) : date);
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

const relativeFmt = lazy(() => new Intl.RelativeTimeFormat("en-US", { numeric: "auto" }));

/** "just now", "5 minutes ago", "yesterday" — falls back to a date beyond a week. */
export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = (d.getTime() - now.getTime()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 45) return "just now";
  if (abs < 3600) return relativeFmt().format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relativeFmt().format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return relativeFmt().format(Math.round(seconds / 86_400), "day");
  return formatDate(d);
}
