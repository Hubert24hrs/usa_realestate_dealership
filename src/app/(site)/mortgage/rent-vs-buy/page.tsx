import type { Metadata } from "next";
import { RentVsBuyCalculator } from "@/components/mortgage/rent-vs-buy-calculator";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { db } from "@/lib/db";
import { defaultRate } from "@/server/rates";

export const metadata: Metadata = {
  title: "Rent vs. buy calculator: find your break-even year",
  description: "Compare the long-run cost of renting and buying — including appreciation, maintenance, selling costs and investment returns — and see when buying pays off.",
  alternates: { canonical: "/mortgage/rent-vs-buy" },
};

export default async function RentVsBuyPage() {
  const [rate, cities] = await Promise.all([defaultRate(), db.city.findMany({ where: { isRural: false }, select: { medianRent: true, medianHomeValue: true } })]);
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)]! : 0;
  };
  const rent = Math.round((median(cities.map((c) => c.medianRent ?? 0).filter(Boolean)) || 2_100) / 50) * 50;
  const price = Math.round((median(cities.map((c) => c.medianHomeValue ?? 0).filter(Boolean)) || 450_000) / 5_000) * 5_000;
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Mortgage", href: "/mortgage" }, { name: "Rent vs. buy", href: "/mortgage/rent-vs-buy" }]}
        eyebrow="Rent vs. buy"
        title="Should I rent or buy?"
        description="Buying builds equity but costs more upfront; renting keeps cash free to invest. See which leaves you with more after the years you expect to stay."
      />
      <div className="container-page py-10">
        <RentVsBuyCalculator defaultRate={rate} defaultRent={rent} defaultPrice={price} />
        <ToolDisclaimer>
          A planning model, not financial advice. Defaults use median demo prices and rents across CITI VIEW markets. Home prices, rents and investment returns are uncertain — try a few scenarios, including flat or falling prices.
        </ToolDisclaimer>
      </div>
    </>
  );
}
