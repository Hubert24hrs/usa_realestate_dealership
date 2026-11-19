import type { Metadata } from "next";
import Link from "@/components/app-link";
import { Search } from "lucide-react";
import { AgentCard } from "@/components/agents/agent-card";
import { AutoSubmitForm } from "@/components/agents/filter-form";
import { PageHero } from "@/components/tools/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AGENT_SORTS, getAgentFacets, LISTING_SPECIALTY, parseAgentFilters, searchAgents } from "@/server/agents";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const selectCls = "h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const f = parseAgentFilters(await searchParams);
  const facets = await getAgentFacets();
  const city = facets.cities.find((c) => c.slug === f.city);
  const filtered = Boolean(f.q || f.specialty || f.language || f.minRating || f.sort !== "recommended" || f.page > 1);
  return {
    title: city ? `Real estate agents in ${city.name}, ${city.stateCode}` : "Find a real estate agent",
    description: `Compare ${city ? `${city.name} ` : ""}real estate agents by reviews, recent sales, specialties and languages, then contact them directly.`,
    alternates: { canonical: city ? `/agents?city=${city.slug}` : "/agents" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function AgentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const f = parseAgentFilters(sp);
  const [facets, result] = await Promise.all([getAgentFacets(), searchAgents(f)]);
  const cityNames = new Map(facets.cities.map((c) => [c.slug, c.name]));
  const pageHref = (page: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v && k !== "page") q.set(k, v);
    if (page > 1) q.set("page", String(page));
    const s = q.toString();
    return s ? `/agents?${s}` : "/agents";
  };
  const city = facets.cities.find((c) => c.slug === f.city);

  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Agents", href: "/agents" }]}
        eyebrow="Agents"
        title={city ? `Real estate agents in ${city.name}` : "Find the right agent"}
        description="Compare local agents by reviews, recent sales and specialties. Contact them directly, or invite one to shop alongside you."
      >
        <AutoSubmitForm action="/agents" className="mt-6 grid gap-3 rounded-3xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))_auto] lg:items-end">
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label htmlFor="ag-q" className="text-xs font-medium">Name or brokerage</label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="ag-q" name="q" defaultValue={f.q} placeholder="Search agents" className="pl-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ag-city" className="text-xs font-medium">Market</label>
            <select id="ag-city" name="city" defaultValue={f.city ?? ""} className={selectCls}>
              <option value="">All markets</option>
              {facets.cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}, {c.stateCode}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ag-spec" className="text-xs font-medium">Specialty</label>
            <select id="ag-spec" name="specialty" defaultValue={f.specialty ?? ""} className={selectCls}>
              <option value="">Any</option>
              <option value={LISTING_SPECIALTY}>Listing agents (sellers)</option>
              {facets.specialties.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ag-lang" className="text-xs font-medium">Language</label>
            <select id="ag-lang" name="language" defaultValue={f.language ?? ""} className={selectCls}>
              <option value="">Any</option>
              {facets.languages.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ag-rating" className="text-xs font-medium">Rating</label>
            <select id="ag-rating" name="rating" defaultValue={f.minRating ? String(f.minRating) : ""} className={selectCls}>
              <option value="">Any</option>
              <option value="4.5">4.5+ stars</option>
              <option value="4">4+ stars</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ag-sort" className="text-xs font-medium">Sort</label>
            <select id="ag-sort" name="sort" defaultValue={f.sort} className={selectCls}>
              {Object.entries(AGENT_SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <Button type="submit">Search</Button>
        </AutoSubmitForm>
      </PageHero>

      <div className="container-page py-10">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <p role="status" className="text-sm text-muted-foreground">
            {result.total} agent{result.total === 1 ? "" : "s"}
            {f.specialty === LISTING_SPECIALTY ? " who list homes for sellers" : f.specialty ? ` specializing in ${f.specialty}` : ""}
            {city ? ` in ${city.name}` : ""}
          </p>
          {(f.q || f.city || f.specialty || f.language || f.minRating) && <Link href="/agents" className="text-sm font-medium text-primary hover:underline">Clear filters</Link>}
        </div>
        {result.agents.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.agents.map((a) => (
              <li key={a.id}>
                <AgentCard agent={a} cityNames={cityNames} headingLevel="h2" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-3xl border border-dashed p-10 text-center">
            <p className="font-semibold">No agents match those filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different market or specialty.</p>
            <Button asChild variant="outline" className="mt-4"><Link href="/agents">See all agents</Link></Button>
          </div>
        )}
        {result.pages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
            {f.page > 1 && <Button asChild variant="outline" size="sm"><Link href={pageHref(f.page - 1)} rel="prev">Previous</Link></Button>}
            <span className="text-sm text-muted-foreground">Page {f.page} of {result.pages}</span>
            {f.page < result.pages && <Button asChild variant="outline" size="sm"><Link href={pageHref(f.page + 1)} rel="next">Next</Link></Button>}
          </nav>
        )}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border bg-surface p-5">
            <p className="font-semibold">Selling? Start with a pricing conversation</p>
            <p className="mt-1 text-sm text-muted-foreground">Listing agents can walk you through pricing, prep and marketing.</p>
            <Link href="/sell#agent" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">Get matched with a listing agent →</Link>
          </div>
          <div className="rounded-3xl border bg-surface p-5">
            <p className="font-semibold">Are you an agent?</p>
            <p className="mt-1 text-sm text-muted-foreground">Claim your profile, get leads and track your listings with CITI VIEW Pro.</p>
            <Link href="/pro" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">See plans for agents →</Link>
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          &ldquo;Featured&rdquo; agents are paid Premier members and appear first in the recommended sort. Ratings and reviews are never paid for. All agents, brokerages and reviews on this site are fictional samples.
        </p>
      </div>
    </>
  );
}
