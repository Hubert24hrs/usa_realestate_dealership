import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert, FileSignature, FileText, KeyRound, Receipt } from "lucide-react";
import { AccountPageHeader, EmptyState, SectionTitle } from "@/components/account/page-header";
import { ApplicationActions, PayRentButton } from "@/components/rent/rental-actions";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth-helpers";
import { confirmCheckout, nextRentDue, periodLabel } from "@/server/rentals";

export const metadata: Metadata = { title: "Rentals" };

const APP_STATUS: Record<string, [string, string]> = {
  DRAFT: ["Draft", "bg-muted"],
  SUBMITTED: ["Submitted", "bg-brand-100 text-brand-800"],
  UNDER_REVIEW: ["Under review", "bg-warning/20 text-warning-foreground dark:text-warning"],
  APPROVED: ["Approved", "bg-success/15 text-success"],
  DENIED: ["Not approved", "bg-destructive/10 text-destructive"],
  WITHDRAWN: ["Withdrawn", "bg-muted text-muted-foreground"],
};

const BANNERS: Record<string, { tone: "ok" | "warn"; text: string }> = {
  paid: { tone: "ok", text: "Payment received — thank you. A receipt is on its way to your inbox." },
  submitted: { tone: "ok", text: "Application submitted. We'll notify you as soon as the property manager decides." },
  signed: { tone: "ok", text: "Lease signed — welcome home! Your rent payments live below." },
  canceled: { tone: "warn", text: "Payment canceled. Nothing was charged — you can try again any time." },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RentalsPage({ searchParams }: PageProps) {
  const user = await requireUser("/account/rentals");
  const sp = await searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  // Returning from Stripe: confirm the session directly so the dashboard never waits on webhooks.
  if (sessionId) await confirmCheckout(sessionId, user.id).catch(() => false);
  const bannerKey = ["paid", "submitted", "signed", "canceled"].find((k) => sp[k] === "1");
  const banner = bannerKey ? BANNERS[bannerKey] : null;

  const [applications, leases] = await Promise.all([
    db.rentalApplication.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { listing: { select: { slug: true, communityName: true, streetAddress: true, city: true, state: true } }, unit: { select: { unitNumber: true, floorPlan: true } }, lease: { select: { id: true, status: true } } },
    }),
    db.lease.findMany({
      where: { tenantId: user.id },
      orderBy: { startDate: "desc" },
      include: {
        listing: { select: { slug: true, communityName: true, streetAddress: true, city: true, state: true } },
        unit: { select: { unitNumber: true } },
        payments: { orderBy: { periodStart: "desc" } },
      },
    }),
  ]);
  const active = leases.find((l) => l.status === "ACTIVE") ?? leases.find((l) => l.status === "PENDING_SIGNATURE");
  const due = active ? nextRentDue(active, active.payments) : null;
  const paymentRows = leases.flatMap((l) => l.payments.filter((p) => p.status !== "PENDING").map((p) => ({ ...p, place: l.listing.communityName ?? l.listing.streetAddress })));

  const Banner = banner && (
    <p role="status" className={cn("mb-6 flex items-start gap-2 rounded-2xl p-4 text-sm", banner.tone === "ok" ? "bg-success/10" : "bg-warning/15")}>
      {banner.tone === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
      {banner.text}
    </p>
  );

  if (!applications.length && !leases.length) {
    return (
      <>
        <AccountPageHeader title="Rentals" description="Applications, leases and rent payments." />
        {Banner}
        <EmptyState icon={KeyRound} title="No rental activity yet" action={<Button asChild><Link href="/apartments-for-rent">Find a rental</Link></Button>}>
          Apply online to any CITI VIEW rental — your applications, lease and rent payments will live here.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <AccountPageHeader title="Rentals" description="Applications, leases and rent payments in one place." />
      {Banner}
      {active && (
        <section aria-labelledby="lease-title" className="mb-8 rounded-3xl border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">{active.status === "ACTIVE" ? "Current lease" : "Lease awaiting your signature"}</p>
              <h2 id="lease-title" className="mt-1 font-display text-xl font-semibold">
                <Link href={`/property/${active.listing.slug}`} className="hover:underline">{active.listing.communityName ?? active.listing.streetAddress}</Link>
                {active.unit && <span className="text-muted-foreground"> · Unit {active.unit.unitNumber}</span>}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm"><Link href={`/account/rentals/lease/${active.id}`}><FileText className="size-4" aria-hidden /> View lease</Link></Button>
              <Button asChild variant="ghost" size="sm"><a href={`/api/rent/leases/${active.id}/pdf`} download>Download PDF</a></Button>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><dt className="text-muted-foreground">Monthly rent</dt><dd className="mt-0.5 font-semibold">{formatMoney(active.monthlyRent)}</dd></div>
            <div><dt className="text-muted-foreground">Lease term</dt><dd className="mt-0.5 font-semibold">{formatDate(active.startDate)} – {formatDate(active.endDate)}</dd></div>
            <div><dt className="text-muted-foreground">Deposit</dt><dd className="mt-0.5 font-semibold">{formatMoney(active.securityDeposit)}</dd></div>
            <div><dt className="text-muted-foreground">Signed</dt><dd className="mt-0.5 font-semibold">{active.signedAt ? formatDate(active.signedAt) : "Not yet"}</dd></div>
          </dl>
          {active.status === "PENDING_SIGNATURE" ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-card p-4">
              <p className="text-sm"><span className="font-semibold">You&apos;re approved!</span> Review and sign the lease to secure the home.</p>
              <Button asChild><Link href={`/account/rentals/lease/${active.id}`}><FileSignature className="size-4" aria-hidden /> Review & sign</Link></Button>
            </div>
          ) : due ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {due.overdue ? "Past due" : "Next payment"} · {periodLabel(due.periodStart)}
                  {due.prorated ? " (prorated)" : ""}
                </p>
                <p className="text-2xl font-semibold tabular-nums">{formatMoney(due.amountCents / 100, true)}</p>
                <p className={cn("text-xs", due.overdue ? "text-destructive" : "text-muted-foreground")}>
                  {due.overdue ? `Was due ${formatDate(due.dueDate)} — pay now to avoid a late fee.` : `Due ${formatDate(due.dueDate)}`}
                </p>
              </div>
              <PayRentButton leaseId={active.id} label={`Pay ${formatMoney(due.amountCents / 100, due.amountCents % 100 !== 0)}`} />
            </div>
          ) : (
            <p className="mt-5 flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm"><CheckCircle2 className="size-4 text-success" aria-hidden /> You&apos;re all paid up.</p>
          )}
        </section>
      )}

      {paymentRows.length > 0 && (
        <section aria-labelledby="payments-title" className="mb-8">
          <SectionTitle id="payments-title">Rent payments</SectionTitle>
          <div className="overflow-x-auto rounded-3xl border bg-surface">
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">Rent payment history</caption>
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr><th scope="col" className="p-3 font-medium">Period</th><th scope="col" className="p-3 font-medium">Amount</th><th scope="col" className="p-3 font-medium">Status</th><th scope="col" className="p-3 font-medium">Paid</th><th scope="col" className="p-3 font-medium">Method</th></tr>
              </thead>
              <tbody className="divide-y">
                {paymentRows.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">{periodLabel(p.periodStart)}</td>
                    <td className="p-3 tabular-nums">{formatMoney(p.amountCents / 100, true)}</td>
                    <td className="p-3"><span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", p.status === "PAID" ? "bg-success/15 text-success" : "bg-muted")}><Receipt className="size-3" aria-hidden /> {p.status === "PAID" ? "Paid" : p.status.toLowerCase()}</span></td>
                    <td className="p-3 text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : "—"}</td>
                    <td className="p-3 text-muted-foreground">{p.method === "demo" ? "Simulated" : p.method === "card" ? "Card" : p.method === "simulated" ? "Demo history" : (p.method ?? "—")}</td>
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
                <li key={a.id} className="rounded-3xl border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <FileText className="size-5 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <Link href={`/property/${a.listing.slug}`} className="block truncate text-sm font-semibold hover:underline">
                        {a.listing.communityName ?? a.listing.streetAddress}{a.unit ? ` · Unit ${a.unit.unitNumber}` : ""}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {a.listing.city}, {a.listing.state}
                        {a.submittedAt ? ` · submitted ${formatDate(a.submittedAt)}` : ` · started ${formatDate(a.createdAt)}`}
                        {a.moveInDate ? ` · move-in ${formatDate(a.moveInDate)}` : ""}
                        {a.feeAmount ? ` · fee ${formatMoney(a.feeAmount)} ${a.feePaid ? "paid" : "unpaid"}` : ""}
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", style)}>{label}</span>
                  </div>
                  {(a.decisionNote || a.status !== "WITHDRAWN") && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <p className="text-xs text-muted-foreground">{a.decisionNote ?? (a.status === "DRAFT" ? "Finish and submit when you're ready." : a.status === "APPROVED" ? "Approved." : "Waiting on the property manager.")}</p>
                      {a.status === "APPROVED" && a.lease ? (
                        <Button asChild size="sm" variant={a.lease.status === "PENDING_SIGNATURE" ? "default" : "outline"}>
                          <Link href={`/account/rentals/lease/${a.lease.id}`}>{a.lease.status === "PENDING_SIGNATURE" ? "Sign lease" : "View lease"}</Link>
                        </Button>
                      ) : (
                        <ApplicationActions id={a.id} status={a.status} slug={a.listing.slug} demoMode={site.demoMode} />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {site.demoMode && <p className="mt-3 text-xs text-muted-foreground">Demo mode: &ldquo;Simulate approval&rdquo; stands in for the property manager so you can try the lease and payment steps.</p>}
        </section>
      )}
    </>
  );
}
