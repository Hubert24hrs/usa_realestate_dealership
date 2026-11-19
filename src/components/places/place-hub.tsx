import Link from "@/components/app-link";
import { ArrowRight, Footprints, GraduationCap, Train, Bike } from "lucide-react";
import { ListingRail } from "@/components/home/rail";
import { StaticListingRail } from "@/components/home/static-rail";
import { PostCard } from "@/components/learn/post-card";
import { DeferUntilVisible } from "@/components/perf/defer-until-visible";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/tools/page-hero";
import { ResultStat } from "@/components/tools/fields";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPrice } from "@/lib/format";
import { site } from "@/lib/site";
import type { PlaceHubData } from "@/server/place-hub";
import type { ResolvedPlace } from "@/server/search/places";

const LEVEL: Record<string, string> = { ELEMENTARY: "Elementary", MIDDLE: "Middle", HIGH: "High" };
const TYPE: Record<string, string> = { PUBLIC: "Public", CHARTER: "Charter", PRIVATE: "Private" };

function listSentence(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Plain-language answers generated from the hub's own numbers (also emitted as FAQPage JSON-LD). */
export function hubFaq(place: ResolvedPlace, d: PlaceHubData) {
  const where = place.label;
  const short = place.shortLabel;
  const rentals = d.counts.find((c) => c.mode === "rent")?.count ?? 0;
  const faq: Array<{ q: string; a: string }> = [];
  if (d.stats.forSale) {
    faq.push({
      q: `How many homes are for sale in ${short}?`,
      a: `There are ${formatNumber(d.stats.forSale)} homes for sale in ${where} on ${site.name} right now${d.stats.newThisWeek ? `, including ${d.stats.newThisWeek} listed in the last 7 days` : ""}.`,
    });
  }
  if (d.stats.medianPrice) {
    faq.push({
      q: `What is the median home price in ${short}?`,
      a: `The median list price of homes for sale in ${where} is ${formatPrice(d.stats.medianPrice)}${d.stats.medianPpsf ? `, about ${formatPrice(d.stats.medianPpsf)} per square foot` : ""}.`,
    });
  }
  if (d.stats.medianRent && rentals) {
    faq.push({ q: `How much is rent in ${short}?`, a: `The median asking rent across ${formatNumber(rentals)} rentals listed in ${where} is ${formatPrice(d.stats.medianRent)} a month.` });
  }
  if (d.stats.medianDom) {
    faq.push({ q: `How long are homes on the market in ${short}?`, a: `Homes for sale in ${where} have been listed for a median of ${d.stats.medianDom} days.` });
  }
  const named = d.areas.filter((a) => a.count > 0).slice(0, 6).map((a) => a.name);
  if (named.length >= 2) {
    faq.push(
      place.type === "state"
        ? { q: `Which cities in ${short} have homes for sale?`, a: `${site.name} lists homes for sale in ${listSentence(named)}, among other ${short} cities.` }
        : place.type === "neighborhood"
          ? { q: `What other neighborhoods in ${place.cityName} have homes for sale?`, a: `Nearby neighborhoods with homes for sale include ${listSentence(named)}.` }
          : { q: `Which ${short} neighborhoods have homes for sale?`, a: `Neighborhoods in ${short} with homes for sale include ${listSentence(named)}.` },
    );
  }
  return faq;
}

export function PlaceHub({ place, data }: { place: ResolvedPlace; data: PlaceHubData }) {
  const short = place.shortLabel;
  const forSale = data.counts.find((c) => c.mode === "buy")!;
  const rent = data.counts.find((c) => c.mode === "rent")!;
  const crumbs = [
    { name: "Home", href: "/" },
    ...(place.type !== "state" && place.stateSlug && place.stateName ? [{ name: place.stateName, href: `/${place.stateSlug}` }] : []),
    ...(place.type === "neighborhood" && place.citySlug && place.cityName ? [{ name: place.cityName, href: `/${place.citySlug}` }] : []),
    { name: place.type === "state" ? place.label : short, href: `/${place.slug}` },
  ];
  const faq = hubFaq(place, data);
  const summary = [
    data.stats.forSale ? `${formatNumber(data.stats.forSale)} homes for sale${data.stats.medianPrice ? ` at a median ${formatPrice(data.stats.medianPrice)}` : ""}` : null,
    rent.count ? `${formatNumber(rent.count)} rentals${data.stats.medianRent ? ` from a median ${formatPrice(data.stats.medianRent)}/mo` : ""}` : null,
  ].filter(Boolean);
  const placeLd = {
    "@context": "https://schema.org",
    "@type": place.type === "state" ? "State" : place.type === "city" ? "City" : "Place",
    name: place.label,
    url: `${site.url}/${place.slug}`,
    geo: { "@type": "GeoCoordinates", latitude: place.center.lat, longitude: place.center.lng },
    ...(place.type !== "state" && place.stateName ? { containedInPlace: { "@type": "State", name: place.stateName } } : {}),
  };
  const faqLd = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  const areaTitle = place.type === "state" ? `Cities in ${short}` : place.type === "neighborhood" ? `Other neighborhoods in ${place.cityName}` : `${short} neighborhoods`;

  return (
    <>
      <JsonLd data={placeLd} />
      {faqLd && <JsonLd data={faqLd} />}
      <PageHero
        crumbs={crumbs}
        eyebrow="Real estate market"
        title={`${place.label} real estate`}
        description={summary.length ? `${summary.join(" and ")} on ${site.name}.` : `Explore listings and local market data for ${place.label}.`}
      >
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild><Link href={`/${forSale.vertical}/${place.slug}`}>Homes for sale{forSale.count ? ` (${formatNumber(forSale.count)})` : ""}</Link></Button>
          {rent.count > 0 && <Button asChild variant="outline"><Link href={`/${rent.vertical}/${place.slug}`}>Rentals ({formatNumber(rent.count)})</Link></Button>}
          <Button asChild variant="ghost"><Link href="/home-value">What&apos;s my home worth?</Link></Button>
        </div>
      </PageHero>

      <section aria-labelledby="market-title" className="container-page pt-8">
        <h2 id="market-title" className="sr-only">Market summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.stats.medianPrice != null && <ResultStat label="Median list price" value={formatPrice(data.stats.medianPrice)} sub={data.stats.medianPpsf ? `${formatPrice(data.stats.medianPpsf)} per sq ft` : undefined} />}
          {data.stats.medianRent != null && <ResultStat label="Median rent" value={`${formatPrice(data.stats.medianRent)}/mo`} sub={data.city?.rentYoY != null ? `${data.city.rentYoY >= 0 ? "+" : ""}${(data.city.rentYoY * 100).toFixed(1)}% vs. last year` : undefined} />}
          {data.stats.medianDom != null && <ResultStat label="Median days listed" value={data.stats.medianDom} sub={`${data.stats.newThisWeek} new this week`} />}
          <ResultStat label="Price cuts · 30 days" value={data.stats.priceCuts} sub={<Link href={`/price-reduced-homes/${place.slug}`} className="text-primary hover:underline">See price reduced homes</Link>} />
        </div>
      </section>

      <nav aria-label={`Browse ${short}`} className="container-page pt-8">
        <ul className="flex flex-wrap gap-2">
          {data.counts
            .filter((c) => c.count > 0)
            .map((c) => (
              <li key={c.mode}>
                <Link href={`/${c.vertical}/${place.slug}`} className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium hover:border-primary/40 hover:bg-muted/50">
                  {c.title} <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{formatNumber(c.count)}</span>
                </Link>
              </li>
            ))}
        </ul>
      </nav>

      <StaticListingRail id="hub-sale" title={`Homes for sale in ${short}`} subtitle="Featured and newest listings" href={`/${forSale.vertical}/${place.slug}`} listings={data.featured} />
      {data.rentals.length > 0 && (
        <DeferUntilVisible fallback={<ListingRail id="hub-rent" title={`Rentals in ${short}`} subtitle="Recently listed apartments and houses" listings={[]} loading />}>
          <StaticListingRail id="hub-rent" title={`Rentals in ${short}`} subtitle="Recently listed apartments and houses" href={`/${rent.vertical}/${place.slug}`} listings={data.rentals} />
        </DeferUntilVisible>
      )}

      <div className="container-page grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          {(data.hood?.description || data.city?.description) && (
            <section aria-labelledby="about-title">
              <h2 id="about-title" className="font-display text-2xl font-semibold">About {short}</h2>
              <p className="mt-3 max-w-3xl text-[0.975rem] leading-7 text-foreground/90">{data.hood?.description ?? data.city?.description}</p>
              {data.hood && data.hood.highlights.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {data.hood.highlights.map((h) => <li key={h} className="rounded-full bg-muted px-3 py-1 text-sm">{h}</li>)}
                </ul>
              )}
              {data.hood && (
                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {data.hood.walkScore != null && <div className="flex items-center gap-1.5"><Footprints className="size-4 text-muted-foreground" aria-hidden /><dt>Walk Score®</dt><dd className="font-semibold">{data.hood.walkScore}</dd></div>}
                  {data.hood.transitScore != null && <div className="flex items-center gap-1.5"><Train className="size-4 text-muted-foreground" aria-hidden /><dt>Transit Score®</dt><dd className="font-semibold">{data.hood.transitScore}</dd></div>}
                  {data.hood.bikeScore != null && <div className="flex items-center gap-1.5"><Bike className="size-4 text-muted-foreground" aria-hidden /><dt>Bike Score®</dt><dd className="font-semibold">{data.hood.bikeScore}</dd></div>}
                </dl>
              )}
              {data.city && (data.city.population || data.city.colIndex) && place.type === "city" && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {data.city.population ? `Population ${formatNumber(data.city.population)}. ` : ""}
                  {data.city.colIndex ? (
                    <>
                      Cost of living index {Math.round(data.city.colIndex)} (U.S. average 100) ·{" "}
                      <Link href="/rent/cost-of-living" className="text-primary underline underline-offset-4">compare cities</Link>
                    </>
                  ) : null}
                </p>
              )}
              {data.hood && <p className="mt-3 text-sm"><Link href={data.hood.cityHref} className="font-medium text-primary hover:underline">More about {place.cityName}</Link></p>}
            </section>
          )}

          {data.areas.length > 0 && (
            <section aria-labelledby="areas-title">
              <h2 id="areas-title" className="font-display text-2xl font-semibold">{areaTitle}</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.areas.map((a) => (
                  <li key={a.href}>
                    <Link href={a.href} className="flex h-full flex-col rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
                      <span className="font-semibold">{a.name}</span>
                      <span className="mt-1 text-sm text-muted-foreground">
                        {a.count ? `${formatNumber(a.count)} for sale` : "No homes for sale right now"}
                        {a.medianPrice ? ` · median ${formatPrice(a.medianPrice)}` : ""}
                      </span>
                      {a.detail && <span className="mt-0.5 text-xs text-muted-foreground">{a.detail}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {faq.length > 0 && (
            <section aria-labelledby="faq-title">
              <h2 id="faq-title" className="font-display text-2xl font-semibold">{short} real estate FAQ</h2>
              <div className="mt-4 divide-y rounded-2xl border bg-card">
                {faq.map((f) => (
                  <details key={f.q} className="group p-4">
                    <summary className="cursor-pointer font-medium marker:text-muted-foreground">{f.q}</summary>
                    <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Figures update as listings change. They describe listings on {site.name}, not every home in the area.</p>
            </section>
          )}
        </div>

        <aside className="space-y-8">
          {data.schools.length > 0 && (
            <section aria-labelledby="schools-title" className="rounded-2xl border bg-card p-5">
              <h2 id="schools-title" className="flex items-center gap-2 font-semibold"><GraduationCap className="size-5 text-muted-foreground" aria-hidden /> Top rated schools</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {data.schools.map((s) => (
                  <li key={s.name} className="flex items-start justify-between gap-3">
                    <span>
                      <span className="font-medium">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{TYPE[s.type] ?? s.type} · {LEVEL[s.level] ?? s.level} · Grades {s.grades}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums" aria-label={`Rating ${s.rating} out of 10`}>{s.rating}/10</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">Ratings are a guide only. Confirm school assignments with the district.</p>
            </section>
          )}
          {data.stateNotice && (
            <section aria-labelledby="notice-title" className="rounded-2xl border bg-card p-5 text-sm">
              <h2 id="notice-title" className="font-semibold">{short} consumer notice</h2>
              <p className="mt-2 text-muted-foreground">{data.stateNotice}</p>
            </section>
          )}
          <section aria-labelledby="tools-title" className="rounded-2xl border bg-card p-5 text-sm">
            <h2 id="tools-title" className="font-semibold">Plan your move</h2>
            <ul className="mt-3 space-y-2">
              {[
                ["Mortgage calculator", "/mortgage/calculator"],
                ["How much home can I afford?", "/mortgage/affordability"],
                ["Rent vs. buy", "/mortgage/rent-vs-buy"],
                ["Find a local agent", place.citySlug ? `/agents?city=${place.citySlug}` : "/agents"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href!} className="inline-flex items-center gap-1 text-primary hover:underline">{label} <ArrowRight className="size-3.5" aria-hidden /></Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {data.posts.length > 0 && (
        <section aria-labelledby="guides-title" className="container-page pb-12">
          <h2 id="guides-title" className="font-display text-2xl font-semibold">Guides for {short} buyers and renters</h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.posts.map((p) => <li key={p.slug}><PostCard post={p} /></li>)}
          </ul>
        </section>
      )}
    </>
  );
}
