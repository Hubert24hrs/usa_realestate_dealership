import "server-only";
import type { ApplicationStatus, LeaseStatus, PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { site } from "@/lib/site";
import { emailLayout, sendEmail } from "./email";
import { type PaymentKind, paidSession } from "./payments";
import { pushToUser } from "./push";

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
const DAY_MS = 86_400_000;

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

// ───────────────────────── Lease document ─────────────────────────
export interface LeaseTermsInput {
  property: string;
  unitNumber?: string | null;
  cityLine: string;
  landlordName: string;
  tenantName: string;
  occupants: number;
  start: Date;
  end: Date;
  monthlyRent: number;
  deposit: number;
  utilitiesIncluded: string[];
  hasPets: boolean;
  petDetails?: string | null;
}

export function leaseTerms(i: LeaseTermsInput): string {
  const premises = `${i.property}${i.unitNumber ? `, Unit ${i.unitNumber}` : ""}, ${i.cityLine}`;
  const late = Math.max(50, Math.round(i.monthlyRent * 0.05));
  const sections = [
    `DEMO LEASE — sample terms generated for the ${site.name} demo. This is not a legal document and creates no tenancy.`,
    `1. PARTIES. This Residential Lease is between ${i.landlordName} ("Landlord") and ${i.tenantName} ("Tenant").`,
    `2. PREMISES. Landlord leases to Tenant the residence at ${premises} (the "Premises").`,
    `3. TERM. The lease begins ${formatDate(i.start)} and ends ${formatDate(i.end)}.`,
    `4. RENT. Rent is ${formatMoney(i.monthlyRent)} per month, due on the 1st of each month and paid through the ${site.name} renter dashboard. Rent for a partial first or last month is prorated by day; a partial first month is due on the start date. Rent received more than five days late incurs a late fee of ${formatMoney(late)}.`,
    `5. SECURITY DEPOSIT. Tenant pays a security deposit of ${formatMoney(i.deposit)}, held and returned as required by state law, less lawful deductions for unpaid rent or damage beyond normal wear and tear.`,
    `6. UTILITIES. ${i.utilitiesIncluded.length ? `Landlord provides: ${i.utilitiesIncluded.join(", ")}. ` : ""}Tenant pays all other utilities and services.`,
    `7. OCCUPANCY. The Premises may be occupied by the ${i.occupants} occupant${i.occupants === 1 ? "" : "s"} listed in Tenant's application. Guests may stay up to 14 consecutive days.`,
    `8. PETS AND ANIMALS. ${i.hasPets ? `Pets approved with the application: ${i.petDetails || "as disclosed"}. ` : "No pets without Landlord's written approval. "}Assistance animals are not pets and are not subject to pet rules, deposits or fees.`,
    `9. MAINTENANCE. Tenant keeps the Premises clean and reports needed repairs promptly. Landlord keeps the Premises in safe, habitable condition and makes repairs within a reasonable time.`,
    `10. ENTRY. Except in an emergency, Landlord gives at least 24 hours' notice (or more if state law requires) before entering.`,
    `11. RENEWAL AND NOTICE. Either party may end the tenancy at the end of the term with at least 60 days' written notice. Otherwise the lease continues month to month on the same terms.`,
    `12. FAIR HOUSING. Landlord complies with all federal, state and local fair housing laws.`,
    `13. ELECTRONIC SIGNATURES. The parties agree that this lease may be signed electronically and that electronic signatures have the same effect as handwritten ones.`,
  ];
  return sections.join("\n\n");
}

/** Typed name must match the applicant's name, ignoring case, punctuation and extra spaces. */
export const namesMatch = (typed: string, expected: string) => {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z\s'-]/g, "").replace(/\s+/g, " ").trim();
  return clean(typed).length > 2 && clean(typed) === clean(expected);
};

// ───────────────────────── Notifications ─────────────────────────
async function notify(userId: string, title: string, body: string, url: string) {
  await db.notification.create({ data: { userId, type: "APPLICATION_UPDATE", title, body, url } });
  await pushToUser(userId, { title, body, url }).catch(() => undefined);
}

const placeOf = (l: { communityName: string | null; streetAddress: string; city: string; state: string }) => `${l.communityName ?? l.streetAddress}, ${l.city}, ${l.state}`;

// ───────────────────────── Applications ─────────────────────────
type Applicant = { firstName?: string; lastName?: string; email?: string };

/** Sections still missing before an application can be submitted. */
export function missingSections(app: { moveInDate: Date | null; leaseTermMonths: number | null; applicant: unknown; employment: unknown }): string[] {
  const a = (app.applicant ?? {}) as Applicant;
  const missing: string[] = [];
  if (!app.moveInDate || !app.leaseTermMonths) missing.push("Home & move-in");
  if (!a.firstName || !a.lastName || !a.email) missing.push("About you");
  if (!app.employment) missing.push("Income");
  return missing;
}

/** Marks an application submitted (after the fee is paid, or when there is no fee). */
export async function markSubmitted(applicationId: string, opts: { feePaid?: boolean; sessionId?: string | null } = {}) {
  const app = await db.rentalApplication.findUnique({
    where: { id: applicationId },
    include: { listing: { select: { slug: true, communityName: true, streetAddress: true, city: true, state: true, agent: { select: { userId: true } } } }, user: { select: { id: true, email: true } } },
  });
  if (!app) return null;
  if (app.status !== "DRAFT") {
    // Already submitted: just record a late fee confirmation.
    if (opts.feePaid && !app.feePaid) await db.rentalApplication.update({ where: { id: app.id }, data: { feePaid: true, feeSessionId: opts.sessionId ?? app.feeSessionId } });
    return app;
  }
  const updated = await db.rentalApplication.update({
    where: { id: app.id },
    data: { status: "SUBMITTED", submittedAt: new Date(), ...(opts.feePaid ? { feePaid: true, feeSessionId: opts.sessionId ?? app.feeSessionId } : {}) },
  });
  const where = placeOf(app.listing);
  await notify(app.userId, "Application submitted", `${where} — we'll let you know when there's a decision.`, "/account/rentals");
  if (app.listing.agent?.userId) {
    await db.notification.create({ data: { userId: app.listing.agent.userId, type: "APPLICATION_UPDATE", title: "New rental application", body: where, url: "/agent" } });
  }
  if (app.user.email) {
    await sendEmail({
      to: app.user.email,
      subject: `Application received — ${where}`,
      html: emailLayout({
        title: "Your application is in",
        intro: `Thanks for applying to ${where}. The property manager typically responds within two business days.`,
        rows: [["Status", "Submitted"], ...(app.feeAmount ? ([["Application fee", `${formatMoney(app.feeAmount)} ${opts.feePaid || app.feePaid ? "paid" : "—"}`]] as Array<[string, string]>) : [])],
        cta: { label: "Track your application", url: `${site.url}/account/rentals` },
      }),
    });
  }
  return updated;
}

/** Approve or deny. Approval creates a lease awaiting the tenant's signature. */
export async function decideApplication(applicationId: string, decision: Extract<ApplicationStatus, "APPROVED" | "DENIED">, note?: string) {
  const app = await db.rentalApplication.findUnique({
    where: { id: applicationId },
    include: {
      listing: { select: { id: true, communityName: true, streetAddress: true, unit: true, city: true, state: true, zip: true, price: true, securityDeposit: true, utilitiesIncluded: true, brokerageName: true, organization: { select: { name: true } } } },
      unit: true,
      lease: { select: { id: true } },
      user: { select: { email: true } },
    },
  });
  if (!app || !["SUBMITTED", "UNDER_REVIEW"].includes(app.status)) return null;
  const where = placeOf(app.listing);
  await db.rentalApplication.update({ where: { id: app.id }, data: { status: decision, decidedAt: new Date(), decisionNote: note ?? (decision === "APPROVED" ? "Approved — welcome home!" : null) } });

  if (decision === "DENIED") {
    await notify(app.userId, "Application update", `${where}: the property manager couldn't approve this application.`, "/account/rentals");
    return { leaseId: null };
  }

  let leaseId = app.lease?.id ?? null;
  if (!leaseId) {
    const a = (app.applicant ?? {}) as Applicant;
    const tenantName = [a.firstName, a.lastName].filter(Boolean).join(" ") || "Tenant";
    // The lease runs from the move-in day (or the 1st of next month if that day has passed)
    // to the day before its anniversary, e.g. Dec 29 → Dec 28.
    const today = dayOf(new Date());
    const start = app.moveInDate && dayOf(app.moveInDate) >= today ? dayOf(app.moveInDate) : addMonths(monthStart(today), 1);
    const months = app.leaseTermMonths ?? 12;
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()) - DAY_MS);
    const rent = app.unit?.rent ?? app.listing.price;
    const deposit = app.unit?.deposit ?? app.listing.securityDeposit ?? rent;
    const landlordName = app.listing.organization?.name ?? app.listing.brokerageName ?? "CITI VIEW Property Management (demo)";
    const lease = await db.lease.create({
      data: {
        applicationId: app.id,
        listingId: app.listing.id,
        unitId: app.unitId,
        tenantId: app.userId,
        startDate: start,
        endDate: end,
        monthlyRent: rent,
        securityDeposit: deposit,
        status: "PENDING_SIGNATURE",
        landlordName,
        terms: leaseTerms({
          property: app.listing.communityName ?? app.listing.streetAddress,
          unitNumber: app.unit?.unitNumber ?? app.listing.unit,
          cityLine: `${app.listing.city}, ${app.listing.state} ${app.listing.zip}`,
          landlordName,
          tenantName,
          occupants: app.occupants,
          start,
          end,
          monthlyRent: rent,
          deposit,
          utilitiesIncluded: app.listing.utilitiesIncluded,
          hasPets: app.hasPets,
          petDetails: app.petDetails,
        }),
      },
    });
    leaseId = lease.id;
  }
  await notify(app.userId, "You're approved!", `${where} — review and sign your lease.`, `/account/rentals/lease/${leaseId}`);
  if (app.user.email) {
    await sendEmail({
      to: app.user.email,
      subject: `Approved — sign your lease for ${where}`,
      html: emailLayout({ title: "Congratulations — you're approved", intro: `Your application for ${where} was approved. Review the lease and sign it online to lock in your home.`, cta: { label: "Review & sign the lease", url: `${site.url}/account/rentals/lease/${leaseId}` } }),
    });
  }
  return { leaseId };
}

// ───────────────────────── Leases ─────────────────────────
export async function signLease(leaseId: string, tenantId: string, signatureName: string, ipHash: string) {
  const lease = await db.lease.findUnique({ where: { id: leaseId }, include: { application: { select: { applicant: true } }, listing: { select: { communityName: true, streetAddress: true, city: true, state: true } } } });
  if (!lease || lease.tenantId !== tenantId) return { ok: false as const, status: 404, error: "Lease not found" };
  if (lease.status !== "PENDING_SIGNATURE") return { ok: false as const, status: 409, error: "This lease has already been signed or is no longer open." };
  const a = (lease.application?.applicant ?? {}) as Applicant;
  const expected = [a.firstName, a.lastName].filter(Boolean).join(" ");
  if (expected && !namesMatch(signatureName, expected)) return { ok: false as const, status: 400, error: `Type your full name exactly as it appears on your application (${expected}).` };

  await db.$transaction([
    db.lease.update({ where: { id: lease.id }, data: { status: "ACTIVE", signatureName: signatureName.trim().replace(/\s+/g, " "), signedAt: new Date(), signatureIpHash: ipHash } }),
    ...(lease.unitId ? [db.rentalUnit.update({ where: { id: lease.unitId }, data: { isAvailable: false } })] : []),
  ]);
  await notify(tenantId, "Lease signed", `${placeOf(lease.listing)} — your first rent payment is ready in your dashboard.`, "/account/rentals");
  return { ok: true as const };
}

// ───────────────────────── Payments ─────────────────────────
/** Who a payment reference belongs to (for ownership checks). */
export async function paymentOwner(kind: PaymentKind, referenceId: string): Promise<string | null> {
  if (kind === "rent") return (await db.rentPayment.findUnique({ where: { id: referenceId }, select: { userId: true } }))?.userId ?? null;
  return (await db.rentalApplication.findUnique({ where: { id: referenceId }, select: { userId: true } }))?.userId ?? null;
}

/** On the Stripe success redirect: verify the paid session belongs to this user, then fulfil. */
export async function confirmCheckout(sessionId: string, userId: string): Promise<boolean> {
  const s = await paidSession(sessionId).catch(() => null);
  if (!s || (await paymentOwner(s.kind, s.referenceId)) !== userId) return false;
  await fulfillPayment(s.kind, s.referenceId, { method: "card", sessionId: s.sessionId });
  return true;
}

/** Idempotent: safe to call from the webhook, the success redirect and the simulated checkout. */
export async function fulfillPayment(kind: PaymentKind, referenceId: string, opts: { method: string; sessionId?: string | null }) {
  if (kind === "application_fee") {
    await markSubmitted(referenceId, { feePaid: true, sessionId: opts.sessionId });
    return;
  }
  const payment = await db.rentPayment.findUnique({
    where: { id: referenceId },
    include: { user: { select: { email: true } }, lease: { select: { listing: { select: { communityName: true, streetAddress: true, city: true, state: true } } } } },
  });
  if (!payment || payment.status === "PAID") return;
  const paidAt = new Date();
  await db.rentPayment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt, method: opts.method, ...(opts.sessionId ? { stripeSessionId: opts.sessionId } : {}) } });
  const where = placeOf(payment.lease.listing);
  const amount = formatMoney(payment.amountCents / 100, true);
  await notify(payment.userId, "Rent payment received", `${amount} for ${periodLabel(payment.periodStart)} — ${where}`, "/account/rentals");
  if (payment.user.email) {
    await sendEmail({
      to: payment.user.email,
      subject: `Receipt: ${periodLabel(payment.periodStart)} rent`,
      html: emailLayout({
        title: "Payment received — thank you",
        rows: [["Property", where], ["Period", periodLabel(payment.periodStart)], ["Amount", amount], ["Paid", formatDate(paidAt)], ["Method", opts.method === "demo" ? "Simulated (demo)" : "Card via Stripe"], ["Reference", payment.id]],
        cta: { label: "View your rent history", url: `${site.url}/account/rentals` },
      }),
    });
  }
}
