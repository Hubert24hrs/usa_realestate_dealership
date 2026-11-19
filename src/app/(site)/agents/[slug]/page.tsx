import type { Metadata } from "next";
import Link from "@/components/app-link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Languages, Phone, ShieldCheck } from "lucide-react";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { ContactAgentForm } from "@/components/agents/contact-agent-form";
import { ShopTogetherCard } from "@/components/agents/shop-together-card";
import { Stars } from "@/components/agents/stars";
import { ListingCard } from "@/components/listing/listing-card";
import { breadcrumbJsonLd, Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { formatCompactPrice, formatDate, formatPrice } from "@/lib/format";
import { site } from "@/lib/site";
import { getAgentProfile } from "@/server/agents";

type PageProps = { params: Promise<{ slug: string }> };

const orgHref = (o: { slug: string; type: string }) => (o.type === "PROPERTY_MANAGEMENT" ? `/property-managers/${o.slug}` : `/brokerages/${o.slug}`);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const p = await getAgentProfile(slug);
  if (!p) return {};
  const a = p.agent;
  const where = p.cities[0] ? ` in ${p.cities[0].name}, ${p.cities[0].stateCode}` : "";
  return {
    title: `${a.name}, ${a.title ?? "real estate agent"}${where}`,
    description: `${a.name}${a.organization ? ` of ${a.organization.name}` : ""}: ${a.reviewCount} reviews (${a.rating.toFixed(1)}★), ${a.salesLast12Months} sales in the last 12 months. Specialties: ${a.specialties.slice(0, 3).join(", ")}.`,
    alternates: { canonical: `/agents/${a.slug}` },
    openGraph: { type: "profile", title: a.name, url: `${site.url}/agents/${a.slug}` },
  };
}

export default async function AgentProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const p = await getAgentProfile(slug);
  if (!p) notFound();
  const { agent: a, activeListings, recentSales, ratingHistogram, cities } = p;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: "Agents", href: "/agents" },
    { name: a.name, href: `/agents/${a.slug}` },
  ];
  const maxCount = Math.max(1, ...ratingHistogram.map((h) => h.count));
  const ld = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: a.name,
    url: `${site.url}/agents/${a.slug}`,
    ...(a.phone ? { telephone: a.phone } : {}),
    ...(a.organization ? { parentOrganization: { "@type": "RealEstateAgent", name: a.organization.name, url: `${site.url}${orgHref(a.organization)}` } } : {}),
    areaServed: cities.map((c) => ({ "@type": "City", name: `${c.name}, ${c.stateCode}` })),
    knowsLanguage: a.languages,
    ...(a.reviewCount > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: a.rating.toFixed(1), reviewCount: a.reviewCount, bestRating: 5 } } : {}),
    review: a.reviews.slice(0, 5).map((r) => ({ "@type": "Review", author: { "@type": "Person", name: r.authorName }, reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 }, reviewBody: r.body, datePublished: r.createdAt.toISOString().slice(0, 10) })),
  };

  return (
    <div className="container-page py-8">
      <JsonLd data={[ld, breadcrumbJsonLd(crumbs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-10">
          <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <AgentAvatar name={a.name} color={a.brandColor} size="xl" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-semibold tracking-tight">{a.name}</h1>
                {a.plan === "PREMIER" && <span className="rounded-full bg-copper-50 px-2 py-0.5 text-xs font-semibold text-copper-800">Featured agent</span>}
              </div>
              <p className="mt-1 text-muted-foreground">
                {a.title ?? "Real estate agent"}
                {a.organization && <> · <Link href={orgHref(a.organization)} className="font-medium text-foreground hover:underline">{a.organization.name}</Link></>}
              </p>
              {a.reviewCount > 0 && (
                <p className="mt-2 flex items-center gap-2 text-sm">
                  <Stars rating={a.rating} size="md" />
                  <span className="font-semibold">{a.rating.toFixed(1)}</span>
                  <a href="#reviews" className="text-muted-foreground hover:underline">{a.reviewCount} review{a.reviewCount === 1 ? "" : "s"}</a>
                </p>
              )}
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                {a.licenseNumber && <li className="flex items-center gap-1.5"><ShieldCheck className="size-4" aria-hidden /> {a.licenseState ?? ""} license #{a.licenseNumber}</li>}
                <li className="flex items-center gap-1.5"><BadgeCheck className="size-4" aria-hidden /> {a.yearsExperience} years of experience</li>
                {a.languages.length > 0 && <li className="flex items-center gap-1.5"><Languages className="size-4" aria-hidden /> {a.languages.join(", ")}</li>}
                {a.responseTimeMinutes != null && <li className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> Typically responds in {a.responseTimeMinutes < 60 ? `${a.responseTimeMinutes} min` : `${Math.round(a.responseTimeMinutes / 60)} hr`}</li>}
              </ul>
              {a.designations.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Designations: {a.designations.join(" · ")}</p>}
            </div>
          </header>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Sales · last 12 months", String(a.salesLast12Months)],
              ["Sales volume", a.salesVolume12Mo ? formatCompactPrice(a.salesVolume12Mo) : "N/A"],
              ["Price range", a.priceRangeLow && a.priceRangeHigh ? `${formatCompactPrice(a.priceRangeLow)} to ${formatCompactPrice(a.priceRangeHigh)}` : "N/A"],
              ["Active listings", String(activeListings.length)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl border bg-card p-4">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          {a.bio && (
            <section aria-labelledby="about-title">
              <h2 id="about-title" className="font-display text-2xl font-semibold tracking-tight">About {a.name.split(" ")[0]}</h2>
              <div className="prose-cv mt-2 max-w-3xl">
                {a.bio.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
              </div>
            </section>
          )}

          <section aria-labelledby="focus-title" className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 id="focus-title" className="font-semibold">Specialties</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {a.specialties.map((s) => <li key={s}><Link href={`/agents?specialty=${encodeURIComponent(s)}`} className="inline-block rounded-full border px-2.5 py-1 text-sm hover:bg-accent">{s}</Link></li>)}
              </ul>
            </div>
            <div>
              <h2 className="font-semibold">Areas served</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {cities.map((c) => <li key={c.slug}><Link href={`/${c.slug}`} className="inline-block rounded-full border px-2.5 py-1 text-sm hover:bg-accent">{c.name}, {c.stateCode}</Link></li>)}
              </ul>
            </div>
          </section>

          {activeListings.length > 0 && (
            <section aria-labelledby="listings-title">
              <h2 id="listings-title" className="font-display text-2xl font-semibold tracking-tight">Active listings</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {activeListings.map((l) => <li key={l.id}><ListingCard listing={l} sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 100vw" /></li>)}
              </ul>
            </section>
          )}

          {recentSales.length > 0 && (
            <section aria-labelledby="sales-title">
              <h2 id="sales-title" className="font-display text-2xl font-semibold tracking-tight">Recent transactions</h2>
              <div className="mt-4 overflow-x-auto rounded-3xl border bg-card">
                <table className="w-full min-w-[520px] text-sm">
                  <caption className="sr-only">Homes {a.name} recently sold or leased</caption>
                  <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                    <tr><th scope="col" className="px-4 py-2 font-medium">Property</th><th scope="col" className="px-4 py-2 font-medium">Price</th><th scope="col" className="px-4 py-2 font-medium">Details</th><th scope="col" className="px-4 py-2 font-medium">Closed</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentSales.map((s) => (
                      <tr key={s.slug}>
                        <th scope="row" className="px-4 py-2 text-left font-medium">
                          <Link href={`/property/${s.slug}`} className="hover:underline">{s.hideAddress ? `${s.city}, ${s.state}` : `${s.streetAddress}${s.unit ? ` #${s.unit}` : ""}, ${s.city}`}</Link>
                        </th>
                        <td className="px-4 py-2 tabular-nums">{formatPrice(s.soldPrice ?? s.price)}{s.transactionType !== "SALE" ? "/mo" : ""}</td>
                        <td className="px-4 py-2 text-muted-foreground">{[s.beds != null ? `${s.beds} bd` : null, s.baths != null ? `${s.baths} ba` : null, s.sqft ? `${s.sqft.toLocaleString("en-US")} sq ft` : null].filter(Boolean).join(" · ")}</td>
                        <td className="px-4 py-2 text-muted-foreground">{s.soldDate ? formatDate(s.soldDate) : "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-28">
            <h2 id="reviews-title" className="font-display text-2xl font-semibold tracking-tight">Reviews</h2>
            {a.reviewCount > 0 ? (
              <>
                <div className="mt-4 grid gap-6 rounded-3xl border bg-card p-5 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <div>
                    <p className="text-4xl font-semibold tabular-nums">{a.rating.toFixed(1)}</p>
                    <Stars rating={a.rating} size="md" />
                    <p className="mt-1 text-sm text-muted-foreground">{a.reviewCount} reviews</p>
                  </div>
                  <ul className="space-y-1.5" aria-label="Ratings breakdown">
                    {ratingHistogram.map((h) => (
                      <li key={h.rating} className="grid grid-cols-[3.5rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm">
                        <span>{h.rating} star{h.rating === 1 ? "" : "s"}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span className="block h-full rounded-full bg-copper-500" style={{ width: `${(h.count / maxCount) * 100}%` }} />
                        </span>
                        <span className="text-right tabular-nums text-muted-foreground">{h.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="mt-4 space-y-3">
                  {a.reviews.map((r) => (
                    <li key={r.id} className="rounded-3xl border bg-card p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Stars rating={r.rating} />
                        {r.title && <p className="font-semibold">{r.title}</p>}
                        {r.isVerified && <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"><BadgeCheck className="size-3" aria-hidden /> Verified transaction</span>}
                      </div>
                      <p className="mt-2 text-sm leading-relaxed">{r.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{[r.authorName, r.transaction, r.location, formatDate(r.createdAt)].filter(Boolean).join(" · ")}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label={`Contact ${a.name}`}>
          <ContactAgentForm agentId={a.id} agentName={a.name} />
          <ShopTogetherCard agentSlug={a.slug} agentName={a.name} />
          {a.phone && (
            <a href={`tel:${a.phone.replace(/[^\d+]/g, "")}`} className="flex items-center justify-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent">
              <Phone className="size-4" aria-hidden /> {a.phone}
            </a>
          )}
          <p className="text-xs text-muted-foreground">{site.demoMode ? "Sample profile: this agent, their brokerage and reviews are fictional. " : ""}Licensed in {a.licenseState ?? "the states shown"}. Equal Housing Opportunity.</p>
        </aside>
      </div>
    </div>
  );
}
