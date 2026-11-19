import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FlaskConical, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { completeDemoPayment } from "@/server/actions/payments";
import { requireUser } from "@/server/auth-helpers";
import { PAYMENT_KINDS, type PaymentKind, stripeEnabled } from "@/server/payments";
import { periodLabel } from "@/server/rentals";

export const metadata: Metadata = { title: "Simulated checkout", robots: { index: false, follow: false } };

type PageProps = { params: Promise<{ kind: string; id: string }> };

export default async function DemoCheckoutPage({ params }: PageProps) {
  const { kind, id } = await params;
  // Real payments go through Stripe whenever it's configured — never offer the simulator then.
  if (stripeEnabled() || !PAYMENT_KINDS.includes(kind as PaymentKind) || !/^[a-z0-9]{10,40}$/i.test(id)) notFound();
  const user = await requireUser(`/pay/demo/${kind}/${id}`);

  let item: { title: string; detail: string; amountCents: number; back: string } | null = null;
  if (kind === "rent") {
    const p = await db.rentPayment.findUnique({ where: { id }, include: { lease: { select: { listing: { select: { communityName: true, streetAddress: true, city: true, state: true } } } } } });
    if (!p || p.userId !== user.id) notFound();
    if (p.status === "PAID") redirect("/account/rentals?paid=1");
    const l = p.lease.listing;
    item = { title: `Rent for ${periodLabel(p.periodStart)}`, detail: `${l.communityName ?? l.streetAddress}, ${l.city}, ${l.state}`, amountCents: p.amountCents, back: "/account/rentals?canceled=1" };
  } else {
    const a = await db.rentalApplication.findUnique({ where: { id }, include: { listing: { select: { slug: true, communityName: true, streetAddress: true, city: true, state: true } } } });
    if (!a || a.userId !== user.id) notFound();
    if (a.feePaid || a.status !== "DRAFT") redirect("/account/rentals?submitted=1");
    const l = a.listing;
    item = { title: "Rental application fee", detail: `${l.communityName ?? l.streetAddress}, ${l.city}, ${l.state}`, amountCents: (a.feeAmount ?? 0) * 100, back: `/rent/apply/${l.slug}?app=${a.id}&canceled=1` };
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-[var(--shadow-raised)] sm:p-8">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground dark:text-warning">
          <FlaskConical className="size-3.5" aria-hidden /> Simulated checkout · demo mode
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold">{item.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
        <dl className="mt-6 flex items-baseline justify-between border-y py-4">
          <dt className="text-sm text-muted-foreground">Amount</dt>
          <dd className="text-3xl font-semibold tabular-nums">{formatMoney(item.amountCents / 100, true)}</dd>
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">
          Payments aren&apos;t connected in this environment, so no card is needed and no money moves. With Stripe keys configured, this step opens Stripe&apos;s secure checkout instead.
        </p>
        <form action={completeDemoPayment} className="mt-6 space-y-3">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <Button type="submit" size="lg" className="w-full">
            <Lock className="size-4" aria-hidden /> Complete simulated payment
          </Button>
          <Button asChild variant="ghost" className="w-full"><Link href={item.back}>Cancel</Link></Button>
        </form>
      </div>
    </div>
  );
}
