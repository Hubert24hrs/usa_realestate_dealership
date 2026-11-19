import type { Metadata } from "next";
import Link from "@/components/app-link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { RentTrendsChart } from "@/components/rent/rent-trends-chart";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { ResultStat } from "@/components/tools/fields";
import { formatMoney } from "@/lib/format";
import { getCityMarkets } from "@/server/markets";

export const metadata: Metadata = {
  title: "Rent trends by city: median rent and year over year change",
  description: "Track median rent by city over the last two years, compare markets side by side and see where rents are rising or falling.",
  alternates: { canonical: "/rent/trends" },
};

const pct = (v: number | null) => (v == null ? "N/A" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1)}%`);

function Change({ v }: { v: number | null }) {
  if (v == null || v === 0) return <span className="text-muted-foreground">{pct(v)}</span>;
  // Rising rent is bad news for renters: warm for up, cool for down — plus an arrow and sign, never color alone.
  return (
    <span className={v > 0 ? "inline-flex items-center gap-0.5 text-destructive" : "inline-flex items-center gap-0.5 text-success"}>
      {v > 0 ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
      {pct(v)}
    </span>
  );
}

export default async function RentTrendsPage() {
  const markets = (await getCityMarkets()).filter((m) => m.months.length > 0);
  const byYoY = [...markets].sort((a, b) => (b.rentYoY ?? -Infinity) - (a.rentYoY ?? -Infinity));
  const byRent = [...markets].sort((a, b) => b.medianRent - a.medianRent);
  const initial = markets.filter((m) => !m.isRural).slice(0, 4).map((m) => m.slug);
  const latest = markets[0]?.months[markets[0].months.length - 1]?.label;

  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Rent", href: "/apartments-for-rent" }, { name: "Rent trends", href: "/rent/trends" }]}
        eyebrow="Rent trends"
        title="Where rents are heading"
        description={`Median asking rent by city${latest ? ` through ${latest}` : ""}, with year over year and three month change.`}
      />
      <div className="container-page space-y-10 py-10">
        {byYoY.length > 1 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResultStat label="Fastest rising rent" value={byYoY[0]!.name} sub={`${pct(byYoY[0]!.rentYoY)} year over year`} />
            <ResultStat label="Biggest cooldown" value={byYoY[byYoY.length - 1]!.name} sub={`${pct(byYoY[byYoY.length - 1]!.rentYoY)} year over year`} />
            <ResultStat label="Highest median rent" value={byRent[0]!.name} sub={`${formatMoney(byRent[0]!.medianRent)}/mo`} />
            <ResultStat label="Most affordable" value={byRent[byRent.length - 1]!.name} sub={`${formatMoney(byRent[byRent.length - 1]!.medianRent)}/mo`} />
          </div>
        )}

        <section aria-labelledby="compare-title" className="rounded-3xl border bg-card p-5 sm:p-6">
          <h2 id="compare-title" className="font-semibold">Compare cities</h2>
          <p className="mb-4 text-sm text-muted-foreground">Pick up to four markets.</p>
          <RentTrendsChart cities={markets.map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode, months: m.months }))} initial={initial} />
        </section>

        <section aria-labelledby="table-title">
          <h2 id="table-title" className="font-display text-2xl font-semibold tracking-tight">All markets</h2>
          <div className="mt-4 overflow-x-auto rounded-3xl border bg-card">
            <table className="w-full min-w-[620px] text-sm">
              <caption className="sr-only">Median rent and change by city, sorted by year over year change</caption>
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">City</th>
                  <th scope="col" className="px-4 py-3 font-medium">Median rent</th>
                  <th scope="col" className="px-4 py-3 font-medium">1 year change</th>
                  <th scope="col" className="px-4 py-3 font-medium">3 month change</th>
                  <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Rentals</span></th>
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {byYoY.map((m) => (
                  <tr key={m.slug}>
                    <th scope="row" className="px-4 py-3 text-left font-semibold">{m.name}, {m.stateCode}</th>
                    <td className="px-4 py-3">{formatMoney(m.medianRent)}/mo</td>
                    <td className="px-4 py-3"><Change v={m.rentYoY} /></td>
                    <td className="px-4 py-3"><Change v={m.rent3m} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/apartments-for-rent/${m.slug}`} className="text-sm font-medium text-primary hover:underline">Rentals<span className="sr-only"> in {m.name}</span></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <ToolDisclaimer>Median asking rents for all unit types, from CITI VIEW market data. Real rents vary by neighborhood, unit size and season.</ToolDisclaimer>
      </div>
    </>
  );
}
