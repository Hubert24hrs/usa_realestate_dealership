import type { Metadata } from "next";
import Link from "@/components/app-link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { RatesChart } from "@/components/mortgage/rates-chart";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { Button } from "@/components/ui/button";
import { monthlyPayment } from "@/lib/finance/mortgage";
import { formatDate, formatMoney } from "@/lib/format";
import { getRates } from "@/server/rates";

export const metadata: Metadata = {
  title: "Today's sample mortgage rates: 30 year, 15 year, ARM, FHA, VA and jumbo",
  description: "Compare sample mortgage rates and APRs by loan type, see the 12 week trend and what a rate means for your monthly payment.",
  alternates: { canonical: "/mortgage/rates" },
};

const LOAN = 400_000;
const TERM: Record<string, number> = { "15-year-fixed": 15 };

const FACTORS = [
  ["Credit score", "Higher scores qualify for lower rates and cheaper mortgage insurance. Pricing often steps at 20 point bands."],
  ["Down payment", "More equity (a lower loan to value) lowers lender risk, and at 20% down conventional loans drop PMI."],
  ["Loan type & term", "15 year loans and ARMs usually price below 30 year fixed; FHA, VA and jumbo loans have their own pricing."],
  ["Points", "Paying discount points upfront buys a lower rate, which pays off if you keep the loan long enough to recoup the cost."],
  ["Lock period", "Longer rate locks (for new construction, say) cost a little more than a standard 30 to 45 day lock."],
  ["Property & occupancy", "Primary homes price best; second homes, investment properties and some condos cost more."],
] as const;

export default async function RatesPage() {
  const { latest, history, asOf } = await getRates();
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Mortgage", href: "/mortgage" }, { name: "Rates", href: "/mortgage/rates" }]}
        eyebrow="Mortgage rates"
        title="Today's sample mortgage rates"
        description={asOf ? `Sample rates for the week of ${formatDate(asOf)}, for illustration only. Not an offer to lend or a rate lock.` : "Sample rates for illustration only. Not an offer to lend."}
      />
      <div className="container-page space-y-10 py-10">
        <section aria-labelledby="rates-table-title" className="overflow-hidden rounded-3xl border bg-card">
          <h2 id="rates-table-title" className="sr-only">Rates by loan type</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Sample rates, APRs, points, weekly change and the monthly principal and interest on a $400,000 loan</caption>
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Loan type</th>
                  <th scope="col" className="px-4 py-3 font-medium">Rate</th>
                  <th scope="col" className="px-4 py-3 font-medium">APR</th>
                  <th scope="col" className="px-4 py-3 font-medium">Points</th>
                  <th scope="col" className="px-4 py-3 font-medium">1 week change</th>
                  <th scope="col" className="px-4 py-3 font-medium">P&amp;I on {formatMoney(LOAN)}</th>
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {latest.map((r) => (
                  <tr key={r.slug}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold capitalize">{r.product}</th>
                    <td className="px-4 py-3 text-base font-semibold">{r.rate.toFixed(3)}%</td>
                    <td className="px-4 py-3">{r.apr.toFixed(3)}%</td>
                    <td className="px-4 py-3">{r.points.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      {r.change == null || r.change === 0 ? (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="size-3.5" aria-hidden /> No change</span>
                      ) : (
                        <span className={r.change < 0 ? "inline-flex items-center gap-1 text-success" : "inline-flex items-center gap-1 text-destructive"}>
                          {r.change < 0 ? <ArrowDownRight className="size-3.5" aria-hidden /> : <ArrowUpRight className="size-3.5" aria-hidden />}
                          {r.change < 0 ? "Down" : "Up"} {Math.abs(r.change).toFixed(3)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatMoney(monthlyPayment(LOAN, r.rate, TERM[r.slug] ?? 30))}/mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="trend-title" className="rounded-3xl border bg-card p-5 sm:p-6">
          <h2 id="trend-title" className="font-semibold">12 week trend</h2>
          <p className="text-sm text-muted-foreground">Weekly sample rates for the four most common loan types.</p>
          <div className="mt-4">
            <RatesChart history={history} />
          </div>
        </section>

        <section aria-labelledby="factors-title">
          <h2 id="factors-title" className="font-display text-2xl font-semibold tracking-tight">What moves your rate</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FACTORS.map(([t, d]) => (
              <div key={t} className="rounded-2xl border bg-card p-4">
                <dt className="font-semibold">{t}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-primary/20 bg-primary/5 p-6">
          <div>
            <p className="font-semibold">Get a rate quote based on your profile</p>
            <p className="text-sm text-muted-foreground">A partner lender follows up with a personalized rate and preapproval.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link href="/mortgage/preapproval">Get preapproved</Link></Button>
            <Button asChild variant="outline"><Link href="/mortgage/calculator">Calculate a payment</Link></Button>
          </div>
        </div>
        <ToolDisclaimer>
          Rates, APRs and points are sample values for a well qualified borrower buying a primary residence and are not quotes. APR includes estimated lender fees. Payment examples show principal and interest only (30 year terms unless noted).
        </ToolDisclaimer>
      </div>
    </>
  );
}
