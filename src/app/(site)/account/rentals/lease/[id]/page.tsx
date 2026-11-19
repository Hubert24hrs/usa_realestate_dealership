import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";
import { LeaseSignPanel } from "@/components/rent/lease-sign-panel";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { requireUser } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Lease" };

type PageProps = { params: Promise<{ id: string }> };

export default async function LeasePage({ params }: PageProps) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const user = await requireUser(`/account/rentals/lease/${id}`);
  const lease = await db.lease.findUnique({
    where: { id },
    include: {
      listing: { select: { slug: true, communityName: true, streetAddress: true, city: true, state: true } },
      unit: { select: { unitNumber: true } },
      application: { select: { applicant: true } },
    },
  });
  if (!lease || lease.tenantId !== user.id) notFound();
  const a = (lease.application?.applicant ?? {}) as { firstName?: string; lastName?: string };
  const expectedName = [a.firstName, a.lastName].filter(Boolean).join(" ");
  const place = lease.listing.communityName ?? lease.listing.streetAddress;
  const paragraphs = lease.terms.split("\n\n");

  return (
    <>
      <Breadcrumbs items={[{ name: "Account", href: "/account" }, { name: "Rentals", href: "/account/rentals" }, { name: "Lease", href: `/account/rentals/lease/${lease.id}` }]} className="mb-4" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{lease.status === "PENDING_SIGNATURE" ? "Awaiting your signature" : lease.status === "ACTIVE" ? "Signed lease" : lease.status.toLowerCase()}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            <Link href={`/property/${lease.listing.slug}`} className="hover:underline">{place}</Link>
            {lease.unit && <span className="text-muted-foreground"> · Unit {lease.unit.unitNumber}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">{lease.listing.city}, {lease.listing.state}</p>
        </div>
        <Button asChild variant="outline">
          <a href={`/api/rent/leases/${lease.id}/pdf`} download>
            <Download className="size-4" aria-hidden /> Download PDF
          </a>
        </Button>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-3xl border bg-card p-5 text-sm sm:grid-cols-4">
        <div><dt className="text-muted-foreground">Monthly rent</dt><dd className="mt-0.5 font-semibold">{formatMoney(lease.monthlyRent)}</dd></div>
        <div><dt className="text-muted-foreground">Security deposit</dt><dd className="mt-0.5 font-semibold">{formatMoney(lease.securityDeposit)}</dd></div>
        <div><dt className="text-muted-foreground">Starts</dt><dd className="mt-0.5 font-semibold">{formatDate(lease.startDate)}</dd></div>
        <div><dt className="text-muted-foreground">Ends</dt><dd className="mt-0.5 font-semibold">{formatDate(lease.endDate)}</dd></div>
      </dl>

      <article aria-label="Lease terms" tabIndex={0} className="mt-6 max-h-[32rem] space-y-4 overflow-y-auto rounded-3xl border bg-card p-5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6">
        {paragraphs.map((p, i) => (
          <p key={i} className={i === 0 ? "rounded-xl bg-warning/15 p-3 font-medium" : undefined}>{p}</p>
        ))}
      </article>

      <div className="mt-6">
        {lease.status === "PENDING_SIGNATURE" ? (
          <LeaseSignPanel leaseId={lease.id} expectedName={expectedName} />
        ) : lease.signedAt ? (
          <div className="flex items-start gap-3 rounded-3xl border bg-card p-5">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold">Signed electronically by {lease.signatureName}</p>
              <p className="text-muted-foreground">{lease.signedAt.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })} · record {lease.id}</p>
              <Link href="/account/rentals" className="mt-2 inline-block font-medium text-primary hover:underline">Pay rent in your dashboard →</Link>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
