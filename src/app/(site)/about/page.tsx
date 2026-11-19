import type { Metadata } from "next";
import Link from "@/components/app-link";
import { Building2, Eye, Scale, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/tools/page-hero";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About CITI VIEW",
  description: "CITI VIEW helps people search homes, rentals, new construction, commercial property and land across the USA, with complete listing data and tools for planning a move.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  { icon: Eye, title: "Full listing history", body: "Every price change, days on market, taxes, HOA dues, environmental risk and the full range of each estimate." },
  { icon: Scale, title: "Fair housing first", body: "Listing language checks, factual neighborhood data instead of demographics, and lead routing that never looks at who's asking." },
  { icon: ShieldCheck, title: "Private by default", body: "We don't sell personal information. Your request goes to the professional you contacted and nobody else." },
  { icon: Building2, title: "All property types", body: "Homes, apartments, new construction, offices, warehouses, ranches and timberland in one search." },
];

export default async function AboutPage() {
  const { brokerage } = await getSettings();
  const org = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: site.legalName,
    alternateName: site.name,
    url: site.url,
    description: site.description,
    email: site.supportEmail,
    ...(brokerage.phone ? { telephone: brokerage.phone } : {}),
    ...(brokerage.address ? { address: brokerage.address } : {}),
  };
  return (
    <>
      <JsonLd data={org} />
      <PageHero crumbs={[{ name: "Home", href: "/" }, { name: "About", href: "/about" }]} eyebrow="About us" title="About CITI VIEW" description={`${site.name} is a real estate marketplace for buying, renting, selling and investing across the United States.`} />
      <div className="container-page py-12">
        <section aria-labelledby="principles" className="max-w-5xl">
          <h2 id="principles" className="font-display text-2xl font-semibold">What we stand for</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-3xl border bg-card p-5">
                <Icon className="size-6 text-primary" aria-hidden />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="business" className="prose-cv mt-12 max-w-3xl">
          <h2 id="business">How {site.name} makes money</h2>
          <p>Searching, saving homes, alerts and our calculators are free. We earn revenue in ways we tell you about up front:</p>
          <ul>
            <li><strong>Agent plans.</strong> Agents can subscribe to Pro or Premier for more lead routing priority and a featured profile. Paid placement is always labelled “Featured”.</li>
            <li><strong>Rental payments and fees.</strong> Property managers use {site.name} to collect applications and rent; application fees are set by the property.</li>
            <li><strong>Lending partner.</strong> If you ask to get preapproved, we introduce you to a partner lender. You&apos;re never required to use them.</li>
          </ul>
          <p>We don&apos;t sell personal information. Read the <Link href="/legal/privacy">privacy policy</Link> for the details.</p>

          <h2 id="brokerage">Brokerage of record</h2>
          <p>
            Brokerage services are provided by {brokerage.name}
            {brokerage.address ? `, ${brokerage.address}` : ""}
            {brokerage.licenses.length ? ` (${brokerage.licenses.join("; ")})` : ""}. {site.name} supports the principles of the Fair Housing Act and the Equal Opportunity
            Act. See our <Link href="/legal/fair-housing">fair housing policy</Link>.
          </p>
          {site.demoMode && (
            <p>
              <strong>Sample data:</strong> listings, agents, reviews and market figures on this site are fictional and show how the platform works.
            </p>
          )}
        </section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild><Link href="/homes-for-sale">Start a search</Link></Button>
          <Button asChild variant="outline"><a href={`mailto:${site.supportEmail}`}>Contact us</a></Button>
        </div>
      </div>
    </>
  );
}
