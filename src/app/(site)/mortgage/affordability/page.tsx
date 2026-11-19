import type { Metadata } from "next";
import { AffordabilityCalculator } from "@/components/mortgage/affordability-calculator";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { defaultRate } from "@/server/rates";

export const metadata: Metadata = {
  title: "How much house can I afford? Home affordability calculator",
  description: "Find the home price your income supports using lender style debt to income limits, with the full monthly payment broken down.",
  alternates: { canonical: "/mortgage/affordability" },
};

export default async function AffordabilityPage() {
  const rate = await defaultRate();
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Mortgage", href: "/mortgage" }, { name: "Affordability", href: "/mortgage/affordability" }]}
        eyebrow="Affordability"
        title="How much home can I afford?"
        description="Lenders compare your housing payment and total debts to your gross income. Pick a comfort level and see the price that fits."
      />
      <div className="container-page py-10">
        <AffordabilityCalculator defaultRate={rate} />
        <ToolDisclaimer>
          Estimates only. Lenders also weigh credit, reserves, employment history and the property; automated underwriting can approve higher ratios than shown. Being approved for an amount doesn&apos;t mean it fits your budget. Leave room for savings, maintenance and everything else.
        </ToolDisclaimer>
      </div>
    </>
  );
}
