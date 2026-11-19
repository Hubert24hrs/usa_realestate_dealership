import type { Metadata } from "next";
import { MortgageCalculator } from "@/components/mortgage/mortgage-calculator";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { defaultRate } from "@/server/rates";

export const metadata: Metadata = {
  title: "Mortgage calculator with taxes, insurance, HOA and PMI",
  description: "Estimate your monthly mortgage payment including property taxes, homeowners insurance, HOA dues and PMI, see your amortization schedule and how extra payments shorten your loan.",
  alternates: { canonical: "/mortgage/calculator" },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const num = (v: string | string[] | undefined, fallback: number, min: number, max: number) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && v !== undefined && v !== "" ? Math.min(max, Math.max(min, n)) : fallback;
};

export default async function MortgageCalculatorPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const rate = await defaultRate();
  const price = num(sp.price, 450_000, 10_000, 100_000_000);
  const term = [10, 15, 20, 30].includes(num(sp.term, 30, 10, 30)) ? num(sp.term, 30, 10, 30) : 30;
  const initial = {
    price,
    downPct: num(sp.down, 20, 0, 60),
    rate: num(sp.rate, rate, 0, 20),
    term,
    taxAnnual: num(sp.tax, Math.round(price * 0.011), 0, 1_000_000),
    insuranceAnnual: num(sp.ins, Math.round(price * 0.0035), 0, 500_000),
    hoa: num(sp.hoa, 0, 0, 50_000),
    extra: num(sp.extra, 0, 0, 100_000),
  };

  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Mortgage", href: "/mortgage" }, { name: "Mortgage calculator", href: "/mortgage/calculator" }]}
        eyebrow="Mortgage calculator"
        title="What will my monthly payment be?"
        description="Your full payment (principal, interest, taxes, insurance, HOA and PMI) plus how your balance falls over time. Share the page link to save your numbers."
      />
      <div className="container-page py-10">
        <MortgageCalculator initial={initial} />
        <ToolDisclaimer>
          Estimates only, not a loan offer. PMI is estimated at 0.6% of the loan per year while the loan is above 80% of the price. Taxes, insurance and HOA dues vary by property; your lender&apos;s Loan Estimate shows your actual terms.
        </ToolDisclaimer>
      </div>
    </>
  );
}
