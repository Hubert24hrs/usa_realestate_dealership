import type { Metadata } from "next";
import Link from "@/components/app-link";
import { ArrowRight, Building2, Home, KeyRound, PawPrint } from "lucide-react";
import { ScamCallout } from "@/components/rent/scam-callout";
import { PostCard } from "@/components/learn/post-card";
import { PageHero } from "@/components/tools/page-hero";
import { ToolCard } from "@/components/tools/tool-card";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/content/tools";
import { db } from "@/lib/db";
import { POPULAR_MARKETS } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Renting: apartments, houses for rent and renter tools",
  description: "Find apartments and houses for rent, check what rent fits your budget, compare cost of living and rent trends, apply online and pay rent.",
  alternates: { canonical: "/rent" },
};

const RENT_TOOLS = ["rent-affordability", "cost-of-living", "rent-trends", "rent-vs-buy"];
const SEARCHES = [
  { href: "/apartments-for-rent", label: "Apartments for rent", icon: Building2 },
  { href: "/houses-for-rent", label: "Houses for rent", icon: Home },
  { href: "/pet-friendly-rentals", label: "Pet friendly rentals", icon: PawPrint },
  { href: "/account/rentals", label: "Renter dashboard", icon: KeyRound },
];

export default async function RentHubPage() {
  const guides = await db.post.findMany({
    where: { status: "PUBLISHED", tags: { has: "Renting" } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { slug: true, title: true, excerpt: true, type: true, coverColor: true, readingMinutes: true, publishedAt: true },
  });
  const tools = RENT_TOOLS.map((s) => TOOLS.find((t) => t.slug === s)!).filter(Boolean);

  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Rent", href: "/rent" }]}
        eyebrow="Rent"
        title="Apartments and houses for rent"
        description="Search verified rentals, see what fits your budget, apply once and pay rent online. No deposits before you've toured and signed."
      >
        <ul className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
          {SEARCHES.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} className="flex items-center gap-3 rounded-2xl border bg-card p-4 font-medium transition-shadow hover:shadow-[var(--shadow-card)]">
                <Icon className="size-5 text-primary" aria-hidden />
                {label}
                <ArrowRight className="ml-auto size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </PageHero>

      <div className="container-page space-y-12 py-10">
        <section aria-labelledby="markets-title">
          <h2 id="markets-title" className="font-display text-2xl font-semibold tracking-tight">Rentals in popular cities</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {POPULAR_MARKETS.map((m) => (
              <li key={m.slug}>
                <Link href={`/apartments-for-rent/${m.slug}`} className="inline-flex rounded-full border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40 hover:bg-muted/50">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tools-title">
          <h2 id="tools-title" className="font-display text-2xl font-semibold tracking-tight">Renter tools</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((t) => (
              <li key={t.slug}>
                <ToolCard tool={t} />
              </li>
            ))}
          </ul>
        </section>

        <ScamCallout />

        {guides.length > 0 && (
          <section aria-labelledby="guides-title">
            <div className="flex items-end justify-between gap-4">
              <h2 id="guides-title" className="font-display text-2xl font-semibold tracking-tight">Renter guides</h2>
              <Link href="/learn?tag=Renting" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                All renting guides <ArrowRight className="size-4" aria-hidden />
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

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm"><span className="font-semibold">Own a rental?</span> List it free, screen applicants with one application and collect rent online.</p>
          <Button asChild><Link href="/sell/post">Post a rental</Link></Button>
        </div>
      </div>
    </>
  );
}
