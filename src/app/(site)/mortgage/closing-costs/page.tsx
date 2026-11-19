import type { Metadata } from "next";
import Link from "@/components/app-link";
import { ClosingCostCalculator } from "@/components/mortgage/closing-cost-calculator";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { STATE_PROFILES } from "@/lib/finance/closing-costs";
import { defaultRate } from "@/server/rates";

export const metadata: Metadata = {
  title: "Closing cost calculator: estimate your cash to close",
  description: "Estimate buyer closing costs (lender fees, title and settlement, transfer taxes, prepaid interest and escrow deposits) and your total cash to close, by state.",
  alternates: { canonical: "/mortgage/closing-costs" },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ClosingCostsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const requested = (Array.isArray(sp.state) ? sp.state[0] : sp.state)?.toUpperCase();
  const initialState = STATE_PROFILES.some((s) => s.code === requested) ? requested! : "US";
  const rate = await defaultRate();
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Mortgage", href: "/mortgage" }, { name: "Closing costs", href: "/mortgage/closing-costs" }]}
        eyebrow="Closing costs"
        title="How much cash will I need to close?"
        description="Buyers typically pay 2 to 5% of the price in closing costs on top of the down payment. Estimate yours line by line."
      />
      <div className="container-page py-10">
        <ClosingCostCalculator defaultRate={rate} initialState={initialState} />
        <ToolDisclaimer>
          Illustrative estimates using typical costs and local customs; actual fees vary by lender, title company, county and contract. Your Loan Estimate (within three business days of applying) and Closing Disclosure (at least three business days before closing) show your real numbers. New to the terms? Read{" "}
          <Link href="/learn/closing-costs-explained" className="font-medium text-primary hover:underline">closing costs, explained</Link>.
        </ToolDisclaimer>
      </div>
    </>
  );
}
