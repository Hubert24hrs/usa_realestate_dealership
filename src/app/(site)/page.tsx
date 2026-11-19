import Link from "next/link";
import { ArrowRight, BadgePercent, Building2, Calculator, Home, KeyRound, Landmark, Star, Trees } from "lucide-react";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { SkylineBackdrop } from "@/components/brand/skyline";
import { PostCard } from "@/components/learn/post-card";
import { ListingImage } from "@/components/media/listing-image";
import { MarketSnapshot } from "@/components/home/market-snapshot";
import { PersonalRails } from "@/components/home/personal-rails";
import { ListingRail } from "@/components/home/rail";
import { HeroSearch } from "@/components/search/hero-search";
import { Button } from "@/components/ui/button";
import { formatCompactPrice } from "@/lib/format";
import { POPULAR_MARKETS, site } from "@/lib/site";
import { getHomeData } from "@/server/home";

export const revalidate = 300;

const BROWSE = [
  { label: "Homes for sale", href: "/homes-for-sale", icon: Home, key: "RESIDENTIAL" },
  { label: "Apartments for rent", href: "/apartments-for-rent", icon: KeyRound, key: "RENTAL" },
  { label: "Commercial", href: "/commercial-real-estate", icon: Building2, key: "COMMERCIAL" },
  { label: "Land & ranches", href: "/land-for-sale", icon: Trees, key: "LAND" },
];

export default async function HomePage() {
  const data = await getHomeData();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CITI VIEW Real Estate",
    url: site.url,
    potentialAction: { "@type": "SearchAction", target: `${site.url}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-950 via-brand-900 to-brand-800 text-white dark:from-[#0b0d1d] dark:via-[#121530] dark:to-[#1b1f45]">
        <div className="pointer-events-none absolute -top-40 right-[-10%] size-[38rem] rounded-full bg-copper-500/25 blur-3xl" aria-hidden />
        <SkylineBackdrop className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full text-brand-300/70 sm:h-64" />
        <div className="container-page relative pt-16 pb-28 sm:pt-24 sm:pb-36">
          <p className="text-xs font-semibold tracking-[0.18em] text-copper-300 uppercase">Buy · Rent · New builds · Commercial · Land</p>
          <h1 className="mt-4 max-w-3xl font-display text-display-xl font-semibold tracking-tight text-balance">Find the place that fits your next chapter.</h1>
          <p className="mt-5 max-w-2xl text-lg text-white/75">Search every home, rental, building and acre on one map — with schools, commute, price history and the tools to make a confident move.</p>
          <div className="mt-8 text-foreground">
            <HeroSearch />
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/70" aria-label="Popular searches">
            {POPULAR_MARKETS.slice(0, 6).map((m) => (
              <li key={m.slug}>
                <Link href={`/homes-for-sale/${m.slug}`} className="underline-offset-4 hover:text-white hover:underline">
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Browse by type */}
      <section aria-label="Browse by property type" className="container-page -mt-10 relative z-10">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {BROWSE.map(({ label, href, icon: Icon, key }) => (
            <li key={href}>
              <Link href={href} className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-raised)] transition-transform hover:-translate-y-0.5">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-primary dark:bg-brand-100"><Icon className="size-5" aria-hidden /></span>
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted-foreground">{(data.counts[key] ?? 0).toLocaleString("en-US")} demo listings</span>
                </span>
                <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="pt-6">
        <ListingRail id="new" title="New to market" subtitle="The freshest listings across CITI VIEW" href="/homes-for-sale?sort=newest" listings={data.rails.newest} />
        <PersonalRails fallback={data.rails.luxury.slice(0, 8)} />
        <ListingRail id="drops" title="Price drops" subtitle="Sellers who just cut their asking price" href="/price-reduced-homes" listings={data.rails.drops} />
        <ListingRail id="open" title="Open houses this weekend" subtitle="Tour in person or join a virtual open house" href="/open-houses" listings={data.rails.openHouses} />
        <ListingRail id="luxury" title="Luxury collection" subtitle="Estates, penthouses and design-forward homes" href="/luxury-homes" listings={data.rails.luxury} />
        <ListingRail id="rentals" title="Featured rentals" subtitle="Apartment communities with live availability and online applications" href="/apartments-for-rent" listings={data.rails.rentals} />
      </div>

      <MarketSnapshot markets={data.markets} />

      {/* Neighborhood guides */}
      <section aria-labelledby="hoods-title" className="container-page py-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Neighborhood guides</p>
            <h2 id="hoods-title" className="mt-1 font-display text-[1.75rem] font-semibold tracking-tight">Get to know the neighborhood</h2>
          </div>
          <Link href="/learn?type=GUIDE" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">All guides</Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.hoods.map((h) => (
            <li key={`${h.city.slug}-${h.slug}`}>
              <Link href={`/${h.city.slug}/${h.slug}`} className="group block overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-card)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  {h.photo && <ListingImage src={h.photo.url} alt="" blurDataUrl={h.photo.blurDataUrl} color={h.photo.color} fill sizes="(min-width:1024px) 25vw, 50vw" className="transition-transform duration-500 group-hover:scale-105" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="text-lg font-semibold">{h.name}</p>
                    <p className="text-xs text-white/80">{h.city.name}, {h.city.stateCode}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 text-xs text-muted-foreground">
                  <span>{h.highlights.slice(0, 2).join(" · ")}</span>
                  {h.medianPrice && <span className="font-medium text-foreground">{formatCompactPrice(h.medianPrice)}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Agents + mortgage */}
      <section className="container-page grid gap-6 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div aria-labelledby="agents-title" className="rounded-3xl border bg-surface p-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="eyebrow">Featured agents</p>
              <h2 id="agents-title" className="mt-1 font-display text-[1.6rem] font-semibold tracking-tight">Local experts, reviewed by clients</h2>
            </div>
            <Link href="/agents" className="text-sm font-semibold text-primary hover:underline">Find an agent</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.agents.slice(0, 6).map((a) => (
              <li key={a.slug}>
                <Link href={`/agents/${a.slug}`} className="flex items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:border-primary/50">
                  <AgentAvatar name={a.name} color={a.brandColor} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.organization?.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs">
                      <Star className="size-3.5 fill-copper-400 text-copper-400" aria-hidden />
                      <span className="font-medium">{a.rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({a.reviewCount} reviews) · {a.salesLast12Months} sales</span>
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div aria-labelledby="mortgage-title" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-950 p-6 text-white dark:from-[#1b1f45] dark:to-[#0b0d1d]">
          <BadgePercent className="absolute -right-6 -bottom-6 size-40 text-white/5" aria-hidden />
          <p className="text-xs font-semibold tracking-[0.18em] text-copper-300 uppercase">Mortgage</p>
          <h2 id="mortgage-title" className="mt-1 font-display text-[1.6rem] font-semibold">Know your numbers before you tour</h2>
          {data.thirtyRate && (
            <p className="mt-4 text-sm text-white/80">
              Today&apos;s sample 30-year fixed rate is <strong className="text-white">{data.thirtyRate.toFixed(2)}%</strong>. On a $400K loan that&apos;s about{" "}
              <strong className="text-white">${data.examplePayment?.toLocaleString("en-US")}/mo</strong> in principal and interest.
            </p>
          )}
          <p className="mt-1 text-xs text-white/60">Sample rates for demonstration only — not an offer of credit.</p>
          <div className="mt-6 grid gap-2">
            <Button asChild size="lg" className="h-11 bg-white text-brand-900 hover:bg-white/90 dark:text-brand-50"><Link href="/mortgage/preapproval"><Landmark className="size-4" aria-hidden /> Get pre-approved</Link></Button>
            <Button asChild size="lg" variant="outline" className="h-11 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"><Link href="/mortgage/calculator"><Calculator className="size-4" aria-hidden /> Mortgage calculator</Link></Button>
            <Link href="/mortgage/rates" className="mt-1 text-center text-sm text-white/80 underline-offset-4 hover:underline">Compare today&apos;s rates</Link>
          </div>
        </div>
      </section>

      {/* Learn */}
      <section aria-labelledby="learn-title" className="container-page py-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="eyebrow">News & learn</p>
            <h2 id="learn-title" className="mt-1 font-display text-[1.75rem] font-semibold tracking-tight">Guides for every step</h2>
          </div>
          <Link href="/learn" className="text-sm font-semibold text-primary hover:underline">All articles</Link>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {data.posts.slice(0, 3).map((p) => (
            <li key={p.slug}>
              <PostCard post={p} />
            </li>
          ))}
        </ul>
      </section>

      {/* SEO browse */}
      <section aria-labelledby="browse-title" className="container-page pb-4">
        <h2 id="browse-title" className="mb-3 text-lg font-semibold">Browse real estate by market</h2>
        <div className="grid gap-6 rounded-2xl border bg-surface p-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Homes for sale", "homes-for-sale"],
            ["Apartments for rent", "apartments-for-rent"],
            ["New construction", "new-construction"],
            ["Commercial real estate", "commercial-real-estate"],
          ].map(([label, vertical]) => (
            <div key={vertical}>
              <h3 className="mb-2 font-semibold">{label}</h3>
              <ul className="space-y-1.5">
                {POPULAR_MARKETS.slice(0, 8).map((m) => (
                  <li key={m.slug}><Link href={`/${vertical}/${m.slug}`} className="text-muted-foreground hover:text-foreground">{m.name}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
