import Link from "@/components/app-link";
import { Building2, ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react";
import { AgentAvatar } from "@/components/agents/agent-avatar";
import { AgentCard } from "@/components/agents/agent-card";
import { ListingCard } from "@/components/listing/listing-card";
import { breadcrumbJsonLd, Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/tools/page-hero";
import { site } from "@/lib/site";
import type { getOrganization, listOrganizations } from "@/server/agents";

type OrgType = "BROKERAGE" | "PROPERTY_MANAGEMENT";
const COPY = {
  BROKERAGE: { base: "/brokerages", plural: "Brokerages", singular: "Brokerage", lede: "Local and regional brokerages on CITI VIEW, with their agents, listings and the markets they serve." },
  PROPERTY_MANAGEMENT: { base: "/property-managers", plural: "Property managers", singular: "Property manager", lede: "Companies that lease and manage CITI VIEW rentals, including apartment communities and single family homes." },
} as const;

type OrgList = Awaited<ReturnType<typeof listOrganizations>>;
type OrgDetail = NonNullable<Awaited<ReturnType<typeof getOrganization>>>;

export function OrganizationDirectory({ type, orgs, cityNames }: { type: OrgType; orgs: OrgList; cityNames: Map<string, string> }) {
  const c = COPY[type];
  return (
    <>
      <PageHero crumbs={[{ name: "Home", href: "/" }, { name: c.plural, href: c.base }]} eyebrow={c.plural} title={type === "BROKERAGE" ? "Real estate brokerages" : "Property management companies"} description={c.lede} />
      <div className="container-page py-10">
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orgs.map((o) => (
            <li key={o.slug}>
              <article className="flex h-full flex-col rounded-3xl border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-3">
                  <AgentAvatar name={o.name} color={o.brandColor} size="md" className="rounded-2xl" />
                  <div className="min-w-0">
                    <h2 className="font-semibold"><Link href={`${c.base}/${o.slug}`} className="hover:underline">{o.name}</Link></h2>
                    {o.tagline && <p className="text-sm text-muted-foreground">{o.tagline}</p>}
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface p-3 text-center">
                  {type === "BROKERAGE" ? (
                    <>
                      <div><dt className="text-[0.7rem] text-muted-foreground">Agents</dt><dd className="font-semibold tabular-nums">{o._count.agents}</dd></div>
                      <div><dt className="text-[0.7rem] text-muted-foreground">Offices</dt><dd className="font-semibold tabular-nums">{o.officeCount ?? "N/A"}</dd></div>
                    </>
                  ) : (
                    <>
                      <div><dt className="text-[0.7rem] text-muted-foreground">Units</dt><dd className="font-semibold tabular-nums">{o.unitsManaged?.toLocaleString("en-US") ?? "N/A"}</dd></div>
                      <div><dt className="text-[0.7rem] text-muted-foreground">Listings</dt><dd className="font-semibold tabular-nums">{o._count.listings}</dd></div>
                    </>
                  )}
                  <div><dt className="text-[0.7rem] text-muted-foreground">Founded</dt><dd className="font-semibold tabular-nums">{o.foundedYear ?? "N/A"}</dd></div>
                </dl>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  {[o.city, o.state].filter(Boolean).join(", ")}
                  {o.serviceAreas.length > 0 && ` · serves ${o.serviceAreas.map((s) => cityNames.get(s) ?? s).slice(0, 3).join(", ")}`}
                </p>
                <Link href={`${c.base}/${o.slug}`} className="mt-auto pt-4 text-sm font-semibold text-primary hover:underline">View {c.singular.toLowerCase()}<span className="sr-only">: {o.name}</span> →</Link>
              </article>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">{site.demoMode ? "All companies on this site are fictional samples. " : ""}Licensing information is provided by each company.</p>
      </div>
    </>
  );
}

export function OrganizationProfile({ type, data, cityNames }: { type: OrgType; data: OrgDetail; cityNames: Map<string, string> }) {
  const c = COPY[type];
  const { org, agents, listings, listingCount } = data;
  const crumbs = [
    { name: "Home", href: "/" },
    { name: c.plural, href: c.base },
    { name: org.name, href: `${c.base}/${org.slug}` },
  ];
  const website = org.website && /^https:\/\//.test(org.website) ? org.website : null;
  const ld = {
    "@context": "https://schema.org",
    "@type": type === "BROKERAGE" ? "RealEstateAgent" : "LocalBusiness",
    name: org.name,
    url: `${site.url}${c.base}/${org.slug}`,
    ...(org.description ? { description: org.description } : {}),
    ...(org.phone ? { telephone: org.phone } : {}),
    ...(org.address ? { address: { "@type": "PostalAddress", streetAddress: org.address, addressLocality: org.city, addressRegion: org.state, postalCode: org.zip, addressCountry: "US" } } : {}),
    ...(org.foundedYear ? { foundingDate: String(org.foundedYear) } : {}),
    areaServed: org.serviceAreas.map((s) => cityNames.get(s) ?? s),
  };
  return (
    <div className="container-page py-8">
      <JsonLd data={[ld, breadcrumbJsonLd(crumbs)]} />
      <Breadcrumbs items={crumbs} className="mb-4" />
      <header className="flex flex-col gap-5 rounded-3xl border bg-card p-6 sm:flex-row sm:items-start">
        <AgentAvatar name={org.name} color={org.brandColor} size="xl" className="rounded-3xl" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{c.singular}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{org.name}</h1>
          {org.tagline && <p className="mt-1 text-muted-foreground">{org.tagline}</p>}
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            {org.address && <li className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> {[org.address, org.city, org.state].filter(Boolean).join(", ")}</li>}
            {org.phone && <li><a href={`tel:${org.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 hover:text-foreground"><Phone className="size-4" aria-hidden /> {org.phone}</a></li>}
            {org.email && <li><a href={`mailto:${org.email}`} className="flex items-center gap-1.5 hover:text-foreground"><Mail className="size-4" aria-hidden /> {org.email}</a></li>}
            {website && <li><a href={website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 hover:text-foreground"><Globe className="size-4" aria-hidden /> Website <ExternalLink className="size-3" aria-hidden /></a></li>}
          </ul>
          {org.licenseNumber && <p className="mt-2 text-xs text-muted-foreground">{org.licenseState} license #{org.licenseNumber}</p>}
        </div>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(type === "BROKERAGE"
          ? [["Agents", String(agents.length)], ["Active listings", String(listingCount)], ["Offices", org.officeCount != null ? String(org.officeCount) : "N/A"], ["Founded", org.foundedYear ? String(org.foundedYear) : "N/A"]]
          : [["Units managed", org.unitsManaged?.toLocaleString("en-US") ?? "N/A"], ["Active listings", String(listingCount)], ["Leasing team", String(agents.length)], ["Founded", org.foundedYear ? String(org.foundedYear) : "N/A"]]
        ).map(([k, v]) => (
          <div key={k} className="rounded-2xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-10">
          {org.description && (
            <section aria-labelledby="org-about">
              <h2 id="org-about" className="font-display text-2xl font-semibold tracking-tight">About</h2>
              <div className="prose-cv mt-2 max-w-3xl">{org.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>
            </section>
          )}
          {listings.length > 0 && (
            <section aria-labelledby="org-listings">
              <h2 id="org-listings" className="font-display text-2xl font-semibold tracking-tight">{type === "BROKERAGE" ? "Listings" : "Available rentals"}</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((l) => <li key={l.id}><ListingCard listing={l} sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 100vw" /></li>)}
              </ul>
            </section>
          )}
          {agents.length > 0 && (
            <section aria-labelledby="org-agents">
              <h2 id="org-agents" className="font-display text-2xl font-semibold tracking-tight">{type === "BROKERAGE" ? "Agents" : "Leasing team"}</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {agents.map((a) => <li key={a.id}><AgentCard agent={a} cityNames={cityNames} /></li>)}
              </ul>
            </section>
          )}
        </div>
        <aside className="space-y-4" aria-label="Service details">
          {org.serviceAreas.length > 0 && (
            <div className="rounded-3xl border bg-card p-5">
              <p className="font-semibold">Markets served</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {org.serviceAreas.map((s) => <li key={s}><Link href={type === "BROKERAGE" ? `/homes-for-sale/${s}` : `/apartments-for-rent/${s}`} className="inline-block rounded-full border px-2.5 py-1 text-sm hover:bg-accent">{cityNames.get(s) ?? s}</Link></li>)}
              </ul>
            </div>
          )}
          {org.services.length > 0 && (
            <div className="rounded-3xl border bg-card p-5">
              <p className="flex items-center gap-2 font-semibold"><Building2 className="size-4" aria-hidden /> Services</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{org.services.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{site.demoMode ? "Sample company: fictional, for illustration. " : ""}Equal Housing Opportunity.</p>
        </aside>
      </div>
    </div>
  );
}
