import type { Metadata } from "next";
import { CostOfLivingCalculator } from "@/components/rent/cost-of-living-calculator";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { getCityMarkets } from "@/server/markets";

export const metadata: Metadata = {
  title: "Cost of living calculator: compare cities",
  description: "Compare the cost of living between cities — housing, groceries, transportation, utilities, healthcare and childcare — and the salary you'd need to keep your lifestyle.",
  alternates: { canonical: "/rent/cost-of-living" },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CostOfLivingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const markets = await getCityMarkets();
  const cities = markets.map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode, colIndex: m.colIndex, col: m.col, medianRent: m.medianRent, medianHomeValue: m.medianHomeValue }));
  const has = (s?: string) => (s && cities.some((c) => c.slug === s) ? s : undefined);
  const from = has(first(sp.from)) ?? has("chicago-il") ?? cities[0]?.slug ?? "";
  const to = has(first(sp.to)) ?? has("austin-tx") ?? cities[1]?.slug ?? from;
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Rent", href: "/apartments-for-rent" }, { name: "Cost of living", href: "/rent/cost-of-living" }]}
        eyebrow="Cost of living"
        title="What does it cost to live there?"
        description="Compare everyday costs between cities and see the salary you'd need to keep the same standard of living."
      />
      <div className="container-page py-10">
        {cities.length >= 2 ? <CostOfLivingCalculator cities={cities} initialFrom={from} initialTo={to} /> : <p>Market data is not available yet.</p>}
        <ToolDisclaimer>
          Cost-of-living indexes, rents and home values are illustrative demo data (U.S. average = 100) and don&apos;t include income taxes, which vary by state. Use them to compare cities, not to budget to the dollar.
        </ToolDisclaimer>
      </div>
    </>
  );
}
