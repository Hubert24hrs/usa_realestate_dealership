import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchExperience } from "@/components/search/search-experience";
import { parseFilters } from "@/lib/search/filters";
import { buildSearchHref, VERTICALS } from "@/lib/search/verticals";
import { site } from "@/lib/site";
import { getSearchProvider } from "@/server/search/provider";
import { resolveRoute, searchHeading } from "@/server/search/route-resolver";

type PageProps = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = await resolveRoute(slug);
  if (!route) notFound();
  const sp = await searchParams;
  const heading = searchHeading(route);
  const page = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1;
  const canonicalPath = `/${slug.join("/")}${page > 1 ? `?page=${page}` : ""}`;
  const hasFilters = Object.keys(sp).some((k) => k !== "page");
  const where = route.place ? route.place.label : "the USA";
  return {
    title: `${heading.charAt(0).toUpperCase()}${heading.slice(1)}${page > 1 ? ` — page ${page}` : ""}`,
    description: `Browse ${route.vertical.title.toLowerCase()} in ${where} on CITI VIEW with photos, maps, schools, price history and market data. Demo listings.`,
    alternates: { canonical: canonicalPath },
    // Filtered permutations stay crawlable but defer ranking to the canonical page.
    robots: hasFilters ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title: heading, url: `${site.url}${canonicalPath}`, type: "website" },
  };
}

export default async function SearchPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const route = await resolveRoute(slug);
  if (!route) notFound();
  const sp = await searchParams;
  const filters = parseFilters(sp, route.base);
  const provider = await getSearchProvider();
  const initialResult = await provider.search(filters);
  const heading = searchHeading(route);
  const related = VERTICALS.filter((v) => v.mode === route.vertical.mode && v.slug !== route.vertical.slug).slice(0, 6);

  return (
    <SearchExperience
      key={slug.join("/")}
      vertical={route.vertical.slug}
      initialFilters={filters}
      initialResult={initialResult}
      heading={heading.charAt(0).toUpperCase() + heading.slice(1)}
      placeLabel={route.place?.label ?? null}
      placeBoundary={route.place?.boundary ?? null}
    >
      <aside className="mt-6 rounded-2xl border bg-surface p-5 text-sm" aria-label="Related searches">
        <h2 className="font-semibold">Related searches{route.place ? ` in ${route.place.shortLabel}` : ""}</h2>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {related.map((v) => (
            <li key={v.slug}>
              <Link className="text-primary hover:underline" href={buildSearchHref({ ...parseFilters({}, { ...(v.preset ?? {}), mode: v.mode }), place: route.place?.slug }, v.slug)}>
                {v.title}{route.place ? ` in ${route.place.shortLabel}` : ""}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">Listing data is demo data provided for the CITI VIEW platform and is deemed reliable but not guaranteed. See the IDX disclaimer below.</p>
      </aside>
    </SearchExperience>
  );
}
