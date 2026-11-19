import type { Metadata } from "next";
import { GlossaryBrowser } from "@/components/learn/glossary-browser";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/tools/page-hero";
import { GLOSSARY } from "@/lib/content/glossary";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Real estate glossary: plain-English definitions",
  description: "From APR and appraisal gaps to zoning and triple-net leases — clear definitions of the real estate and mortgage terms you'll hear while buying, selling or renting.",
  alternates: { canonical: "/learn/glossary" },
};

export default function GlossaryPage() {
  const terms = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, "en"));
  const ld = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: `${site.name} real estate glossary`,
    url: `${site.url}/learn/glossary`,
    hasDefinedTerm: terms.map((t) => ({ "@type": "DefinedTerm", name: t.term, description: t.definition, url: `${site.url}/learn/glossary#${t.slug}` })),
  };
  return (
    <>
      <JsonLd data={ld} />
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Learn", href: "/learn" }, { name: "Glossary", href: "/learn/glossary" }]}
        eyebrow="Learn"
        title="Real estate glossary"
        description={`${terms.length} terms you'll hear from agents, lenders and landlords — explained in plain English.`}
      />
      <div className="container-page py-10">
        <GlossaryBrowser terms={terms} />
        <p className="mt-6 max-w-3xl text-xs text-muted-foreground">Definitions are general and educational, not legal or financial advice. Rules vary by state and loan program.</p>
      </div>
    </>
  );
}
