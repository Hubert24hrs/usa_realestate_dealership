import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Handshake, Home, Upload } from "lucide-react";
import { NetProceedsCalculator } from "@/components/sell/net-proceeds";
import { SellerConsultForm } from "@/components/sell/seller-consult-form";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { getCityMarkets } from "@/server/markets";

export const metadata: Metadata = {
  title: "Sell your home: agent, FSBO or get a value estimate",
  description: "Compare ways to sell — with a listing agent or by owner — estimate your home's value and your net proceeds, and get matched with a local listing agent.",
  alternates: { canonical: "/sell" },
};

const PATHS = [
  { icon: Handshake, title: "Sell with a listing agent", body: "Pricing strategy, staging advice, professional photos, MLS exposure and negotiation — for a commission you agree on.", href: "#agent", cta: "Match with an agent" },
  { icon: Upload, title: "Sell it yourself (FSBO)", body: "List for free on CITI VIEW with photos, pricing guidance and Fair Housing checks. You handle showings and offers.", href: "/sell/post", cta: "Post a listing" },
  { icon: Home, title: "Know your number first", body: "See a comps-based value estimate with a likely range and the sales behind it.", href: "/home-value", cta: "Estimate my home's value" },
];

const STEPS = [
  ["Prepare", "Declutter, fix the small things buyers notice and plan any upgrades worth their cost."],
  ["Price", "Use recent comparable sales — overpricing usually means more days on market and a lower final price."],
  ["List & market", "Great photos and an accurate description; decide how you'll handle showings."],
  ["Review offers", "Compare price, financing, contingencies and closing date — not just the headline number."],
  ["Inspection & appraisal", "Expect repair requests; negotiate credits or fixes."],
  ["Close", "Sign, hand over keys and receive your proceeds, typically by wire."],
];

export default async function SellPage() {
  const markets = await getCityMarkets();
  const cities = markets.map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode })).sort((a, b) => a.name.localeCompare(b.name));
  const medianValue = [...markets].map((m) => m.medianHomeValue).sort((a, b) => a - b)[Math.floor(markets.length / 2)] ?? 450_000;
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Sell", href: "/sell" }]}
        eyebrow="Sell"
        title="Sell your home your way"
        description="Work with a listing agent, sell it yourself, or start by finding out what it's worth — every path starts here."
      />
      <div className="container-page space-y-14 py-10">
        <ul className="grid gap-4 md:grid-cols-3">
          {PATHS.map(({ icon: Icon, title, body, href, cta }) => (
            <li key={title} className="flex flex-col rounded-3xl border bg-card p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="size-5" aria-hidden /></span>
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{body}</p>
              <Link href={href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">{cta} <ArrowRight className="size-4" aria-hidden /></Link>
            </li>
          ))}
        </ul>

        <section aria-labelledby="net-title">
          <div className="mb-5 flex items-center gap-2">
            <BadgeDollarSign className="size-6 text-primary" aria-hidden />
            <h2 id="net-title" className="font-display text-2xl font-semibold tracking-tight">What will I walk away with?</h2>
          </div>
          <NetProceedsCalculator defaultPrice={Math.round(medianValue / 5_000) * 5_000} />
        </section>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title" className="font-display text-2xl font-semibold tracking-tight">How selling works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="rounded-2xl border bg-card p-4">
                <p className="text-xs font-semibold text-copper-700 dark:text-copper-500">Step {i + 1}</p>
                <p className="mt-1 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
          <Link href="/learn/selling-your-home" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Read the full seller&apos;s guide <ArrowRight className="size-4" aria-hidden /></Link>
        </section>

        <section id="agent" aria-labelledby="agent-title" className="scroll-mt-28 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <div>
            <h2 id="agent-title" className="font-display text-2xl font-semibold tracking-tight">Find a listing agent</h2>
            <p className="mt-2 text-muted-foreground">Tell us about your home and we&apos;ll match you with a top-rated agent who sells in your area. Free, no obligation.</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>• Interview more than one agent and compare their pricing plans</li>
              <li>• Ask for recent sales near you and their average days on market</li>
              <li>• Commission is negotiable — get it in writing in the listing agreement</li>
            </ul>
            <Link href="/agents?specialty=listing" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Browse listing agents <ArrowRight className="size-4" aria-hidden /></Link>
          </div>
          <SellerConsultForm cities={cities} />
        </section>
        <ToolDisclaimer>Estimates are for planning only. CITI VIEW agents in this demo are fictional; requests are routed to demo agent accounts.</ToolDisclaimer>
      </div>
    </>
  );
}
