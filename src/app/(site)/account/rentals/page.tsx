import type { Metadata } from "next";
import Link from "next/link";
import { FileText, KeyRound, Receipt } from "lucide-react";
import { AccountPageHeader, EmptyState, SectionTitle } from "@/components/account/page-header";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Rentals" };

const APP_STATUS: Record<string, [string, string]> = {
  DRAFT: ["Draft", "bg-muted"],
  SUBMITTED: ["Submitted", "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200"],
  UNDER_REVIEW: ["Under review", "bg-warning/20 text-warning-foreground dark:text-warning"],
  APPROVED: ["Approved", "bg-success/15 text-success"],
  DENIED: ["Not approved", "bg-destructive/10 text-destructive"],
  WITHDRAWN: ["Withdrawn", "bg-muted text-muted-foreground"],
};

export default async function RentalsPage() {
  const user = await requireUser("/account/rentals");
  const [applications, leases] = await Promise.all([
    db.rentalApplication.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { listing: { select: { slug: true, communityName: true, streetAddress: true, city: true, state: true } }, unit: { select: { unitNumber: true, floorPlan: true } } },
    }),
    db.lease.findMany({
      where: { tenantId: user.id },
      orderBy: { startDate: "desc" },
      include: {
        listing: { select: { slug: true, communityName: true, streetAddress: true, city: true, state: true } },
        unit: { select: { unitNumber: true } },
        payments: { orderBy: { periodStart: "desc" }, take: 12 },
      },
    }),
  ]);
  const active = leases.find((l) => l.status === "ACTIVE" || l.status === "PENDING_SIGNATURE");

  if (!applications.length && !leases.length) {
    return (
      <>
        <AccountPageHeader title="Rentals" description="Applications, leases and rent payments." />
        <EmptyState icon={KeyRound} title="No rental activity yet" action={<Button asChild><Link href="/apartments-for-rent">Find a rental</Link></Button>}>
          Apply online to any CITI VIEW rental — your applications, lease and rent payments will live here.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <AccountPageHeader title="Rentals" description="Applications, leases and rent payments in one place." />
      {active && (
        <section aria-labelledby="lease-title" className="mb-8 rounded-3xl border bg-surface p-5 sm:p-6">
          <p className="eyebrow">{active.status === "ACTIVE" ? "Current lease" : "Lease awaiting signature"}</p>
          <h2 id="lease-title" className="mt-1 font-display text-xl font-semibold">
            <Link href={`/property/${active.listing.slug}`} className="hover:underline">{active.listing.communityName ?? active.listing.streetAddress}</Link>
            {active.unit && <span className="text-muted-foreground"> · Unit {active.unit.unitNumber}</span>}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-muted-foreground">Monthly rent</dt><dd className="mt-0.5 font-semibold">{formatMoney(active.monthlyRent)}</dd></div>
            <div><dt className="text-muted-foreground">Lease term</dt><dd className="mt-0.5 font-semibold">{formatDate(active.startDate)} – {formatDate(active.endDate)}</dd></div>
            <div><dt className="text-muted-foreground">Deposit</dt><dd className="mt-0.5 font-semibold">{formatMoney(active.securityDeposit)}</dd></div>
            <div><dt className="text-muted-foreground">Signed</dt><dd className="mt-0.5 font-semibold">{active.signedAt ? formatDate(active.signedAt) : "Not yet"}</dd></div>
          </dl>
        </section>
      )}

      {leases.some((l) => l.payments.length) && (
        <section aria-labelledby="payments-title" className="mb-8">
          <SectionTitle id="payments-title">Rent payments</SectionTitle>
          <div className="overflow-x-auto rounded-3xl border bg-surface">
            <table className="w-full min-w-[520px] text-sm">
              <caption className="sr-only">Rent payment history</caption>
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr><th scope="col" className="p-3 font-medium">Period</th><th scope="col" className="p-3 font-medium">Amount</th><th scope="col" className="p-3 font-medium">Status</th><th scope="col" className="p-3 font-medium">Paid</th></tr>
              </thead>
              <tbody className="divide-y">
                {leases.flatMap((l) => l.payments).map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">{p.periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</td>
                    <td className="p-3 tabular-nums">{formatMoney(p.amountCents / 100, true)}</td>
                    <td className="p-3"><span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", p.status === "PAID" ? "bg-success/15 text-success" : "bg-muted")}><Receipt className="size-3" aria-hidden /> {p.status === "PAID" ? "Paid" : p.status.toLowerCase()}</span></td>
                    <td className="p-3 text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {applications.length > 0 && (
        <section aria-labelledby="apps-title">
          <SectionTitle id="apps-title">Applications</SectionTitle>
          <ul className="space-y-3">
            {applications.map((a) => {
              const [label, style] = APP_STATUS[a.status] ?? [a.status, "bg-muted"];
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-4 rounded-3xl border bg-surface p-4">
                  <FileText className="size-5 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <Link href={`/property/${a.listing.slug}`} className="block truncate text-sm font-semibold hover:underline">
                      {a.listing.communityName ?? a.listing.streetAddress}{a.unit ? ` · Unit ${a.unit.unitNumber}` : ""}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {a.listing.city}, {a.listing.state}
                      {a.submittedAt ? ` · submitted ${formatDate(a.submittedAt)}` : ` · started ${formatDate(a.createdAt)}`}
                      {a.moveInDate ? ` · move-in ${formatDate(a.moveInDate)}` : ""}
                    </p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", style)}>{label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
