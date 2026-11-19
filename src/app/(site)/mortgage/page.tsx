import type { Metadata } from "next";
import Link from "@/components/app-link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { PostCard } from "@/components/learn/post-card";
import { PageHero, ToolDisclaimer } from "@/components/tools/page-hero";
import { ToolCard } from "@/components/tools/tool-card";
import { TOOLS } from "@/lib/content/tools";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getRates } from "@/server/rates";

export const metadata: Metadata = {
  title: "Mortgage calculators, rates and preapproval",
  description: "Estimate your payment, compare sample mortgage rates, see how much home you can afford, estimate closing costs, compare renting vs. buying and request a preapproval.",
  alternates: { canonical: "/mortgage" },
};

const MORTGAGE_TOOLS = ["mortgage-calculator", "affordability", "rates", "preapproval", "closing-costs", "rent-vs-buy", "down-payment-assistance"];

export default async function MortgageHubPage() {
  const [{ latest, asOf }, guides] = await Promise.all([
    getRates(),
    db.post.findMany({
      where: { status: "PUBLISHED", tags: { hasSome: ["Buying", "Mortgage", "First time buyers"] } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { slug: true, title: true, excerpt: true, type: true, coverColor: true, readingMinutes: true, publishedAt: true },
    }),
  ]);
  const tools = MORTGAGE_TOOLS.map((s) => TOOLS.find((t) => t.slug === s)!).filter(Boolean);

  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Mortgage", href: "/mortgage" }]}
        eyebrow="Mortgage"
        title="Plan the money side of your move"
        description="Run the numbers before you tour: payment, affordability, closing costs and the rent vs. buy breakeven, then connect with a partner lender."
      >
        <div className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-3">
          {latest.slice(0, 3).map((r) => (
            <Link key={r.slug} href="/mortgage/rates" className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-[var(--shadow-card)]">
              <p className="text-xs font-medium text-muted-foreground capitalize">{r.product}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{r.rate.toFixed(3)}%</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                APR {r.apr.toFixed(3)}%
                {r.change != null && r.change !== 0 && (
                  <span className={r.change < 0 ? "inline-flex items-center text-success" : "inline-flex items-center text-destructive"}>
                    {r.change < 0 ? <ArrowDownRight className="size-3.5" aria-hidden /> : <ArrowUpRight className="size-3.5" aria-hidden />}
                    <span className="sr-only">{r.change < 0 ? "down" : "up"}</span>
                    {Math.abs(r.change).toFixed(2)}
                  </span>
                )}
              </p>
            </Link>
          ))}
        </div>
        {asOf && <p className="mt-2 text-xs text-muted-foreground">Sample rates for the week of {formatDate(asOf)}. Not an offer to lend.</p>}
      </PageHero>

      <div className="container-page space-y-12 py-10">
        <section aria-labelledby="tools-title">
          <h2 id="tools-title" className="font-display text-2xl font-semibold tracking-tight">Calculators & tools</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <li key={t.slug}>
                <ToolCard tool={t} />
              </li>
            ))}
          </ul>
        </section>

        {guides.length > 0 && (
          <section aria-labelledby="guides-title">
            <div className="flex items-end justify-between gap-4">
              <h2 id="guides-title" className="font-display text-2xl font-semibold tracking-tight">Buyer guides</h2>
              <Link href="/learn?tag=Buying" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                All buying guides <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {guides.map((p) => (
                <li key={p.slug}>
                  <PostCard post={p} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <ToolDisclaimer>
          CITI VIEW is not a lender and does not make credit decisions. Calculators provide estimates for planning only; your actual rate, payment and costs depend on your credit, the property and the lender. Rates shown are samples.
        </ToolDisclaimer>
      </div>
    </>
  );
}
