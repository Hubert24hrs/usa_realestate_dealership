import type { LeaseStatus, PaymentStatus } from "@prisma/client";

// ───────────────────────── Rent periods ─────────────────────────
// Periods are the 1st of a month at 00:00 UTC. Some rows sit at local midnight (seeded) and
// form dates are stored at 12:00 UTC, so shift by +11h before reading the calendar day: that
// maps UTC midnight, noon UTC and local midnight in UTC−11…+11 all to the intended day.
const norm = (d: Date) => new Date(d.getTime() + 11 * 3_600_000);
export const monthStart = (d: Date) => {
  const n = norm(d);
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1));
};
export const addMonths = (d: Date, months: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
export const periodKey = (d: Date) => monthStart(d).toISOString().slice(0, 7);
export const periodLabel = (d: Date) => monthStart(d).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
/** Calendar day (UTC midnight) of a stored date, tolerant of local-midnight / noon storage. */
export const dayOf = (d: Date) => {
  const n = norm(d);
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};
export const DAY_MS = 86_400_000;

export interface RentDue {
  periodStart: Date;
  amountCents: number;
  /** Day the payment is due: the 1st, or the move-in day for a partial first month. */
  dueDate: Date;
  prorated: boolean;
  overdue: boolean;
}

/**
 * Earliest unpaid month of an active lease (payable up to one month ahead). A partial first or
 * last month is prorated by day; a partial first month is due on the move-in day.
 */
export function nextRentDue(
  lease: { status: LeaseStatus; startDate: Date; endDate: Date; monthlyRent: number },
  payments: Array<{ periodStart: Date; status: PaymentStatus }>,
  now = new Date(),
): RentDue | null {
  if (lease.status !== "ACTIVE") return null;
  const paid = new Set(payments.filter((p) => p.status === "PAID").map((p) => periodKey(p.periodStart)));
  const start = dayOf(lease.startDate);
  const end = dayOf(lease.endDate);
  const current = monthStart(now);
  const limit = addMonths(current, 1);
  for (let p = monthStart(start); p <= monthStart(end) && p <= limit; p = addMonths(p, 1)) {
    if (paid.has(periodKey(p))) continue;
    const next = addMonths(p, 1);
    const daysInMonth = Math.round((+next - +p) / DAY_MS);
    const from = start > p ? start : p;
    const to = end < next ? new Date(+end + DAY_MS) : next;
    const covered = Math.max(0, Math.round((+to - +from) / DAY_MS));
    const dueDate = from;
    const overdue = +now > +dueDate + 5 * DAY_MS;
    return { periodStart: p, amountCents: Math.round((lease.monthlyRent * 100 * covered) / daysInMonth), dueDate, prorated: covered < daysInMonth, overdue };
  }
  return null;
}
