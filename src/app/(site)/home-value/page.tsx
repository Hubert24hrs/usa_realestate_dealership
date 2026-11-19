import type { Metadata } from "next";
import { HomeValueTool } from "@/components/sell/home-value-tool";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { getCityMarkets } from "@/server/markets";

export const metadata: Metadata = {
  title: "What's my home worth? Free home value estimate",
  description: "Get a free estimate of your home's value from comparable sales, with a likely range, the sales behind it and local market trends.",
  alternates: { canonical: "/home-value" },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function HomeValuePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const cities = (await getCityMarkets()).map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode })).sort((a, b) => a.name.localeCompare(b.name));
  const requested = Array.isArray(sp.city) ? sp.city[0] : sp.city;
  const initialCity = cities.find((c) => c.slug === requested)?.slug ?? cities.find((c) => c.slug === "austin-tx")?.slug ?? cities[0]?.slug ?? "";
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Sell", href: "/sell" }, { name: "Home value", href: "/home-value" }]}
        eyebrow="Home value"
        title="What's my home worth?"
        description="An estimate from comparable sales: we compare your home with similar nearby sales and listings, adjust for the differences and show our work."
      />
      <div className="container-page py-10">
        <HomeValueTool cities={cities} initialCity={initialCity} />
        <ToolDisclaimer>
          An automated estimate based on recent sales data on CITI VIEW. It is not an appraisal or broker price opinion. Upgrades, condition, views and lot details can move value significantly; a local agent or licensed appraiser can give you a precise figure.
        </ToolDisclaimer>
      </div>
    </>
  );
}
