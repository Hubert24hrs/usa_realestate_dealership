import type { Metadata } from "next";
import { RentAffordabilityCalculator } from "@/components/rent/rent-affordability-calculator";
import { ScamCallout } from "@/components/rent/scam-callout";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { getCityMarkets } from "@/server/markets";

export const metadata: Metadata = {
  title: "Rent affordability calculator: how much rent can I afford?",
  description: "See what rent fits your income using the 30% rule, landlord income screening and your debts, plus the cash you'll need to move in.",
  alternates: { canonical: "/rent/affordability" },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RentAffordabilityPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const markets = await getCityMarkets();
  const cities = markets.filter((m) => !m.isRural).map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode, medianRent: m.medianRent }));
  const requested = Array.isArray(sp.city) ? sp.city[0] : sp.city;
  const initialCity = cities.find((c) => c.slug === requested)?.slug ?? cities.find((c) => c.slug === "austin-tx")?.slug ?? cities[0]?.slug ?? "";
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Rent", href: "/apartments-for-rent" }, { name: "Rent affordability", href: "/rent/affordability" }]}
        eyebrow="Rent affordability"
        title="How much rent can I afford?"
        description="Property managers screen on income, and your budget needs room for everything else. Find a rent that clears both."
      />
      <div className="container-page space-y-8 py-10">
        <RentAffordabilityCalculator cities={cities} initialCity={initialCity} />
        <ScamCallout />
        <ToolDisclaimer>
          Estimates only. Screening rules vary. Some managers use 3× monthly rent, consider cosigners, or count savings. Median rents come from CITI VIEW market data.
        </ToolDisclaimer>
      </div>
    </>
  );
}
