import type { Metadata } from "next";
import { Bell, Heart, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EqualHousingLogo } from "@/components/compliance/equal-housing";
import { DemoBadge } from "@/components/compliance/demo-banner";
import { LogoMark } from "@/components/brand/logo";
import { ListingImage } from "@/components/media/listing-image";
import { db } from "@/lib/db";
import { MEDIA_CATEGORY_LABELS, type MediaCategoryKey } from "@/lib/domain";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };
export const revalidate = 3600;

const SCALES = {
  brand: ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"],
  copper: ["50", "100", "200", "300", "400", "500", "600", "700", "800"],
};
const SEMANTIC = ["primary", "secondary", "muted", "accent", "destructive", "success", "warning", "card", "border"];

export default async function StyleguidePage() {
  const samples = await db.listingMedia.findMany({ distinct: ["category"], orderBy: { category: "asc" }, take: 24 });
  return (
    <div className="container-page space-y-16 py-12">
      <header className="flex items-center gap-4">
        <LogoMark className="size-14" />
        <div>
          <p className="eyebrow">CITI VIEW design system</p>
          <h1 className="font-display text-display-lg font-semibold">Tokens & components</h1>
        </div>
      </header>

      <section aria-labelledby="sg-color">
        <h2 id="sg-color" className="mb-4 font-display text-2xl font-semibold">Color</h2>
        {Object.entries(SCALES).map(([name, steps]) => (
          <div key={name} className="mb-4">
            <p className="mb-2 text-sm font-medium capitalize">{name === "brand" ? "Citi Indigo" : "Skyline Copper"}</p>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
              {steps.map((s) => (
                <div key={s}>
                  <div className="h-14 rounded-xl border" style={{ background: `var(--${name}-${s})` }} />
                  <p className="mt-1 text-center font-mono text-[0.7rem] text-muted-foreground">{s}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
          {SEMANTIC.map((t) => (
            <div key={t}>
              <div className="h-14 rounded-xl border" style={{ background: `var(--${t})` }} />
              <p className="mt-1 text-center font-mono text-[0.7rem] text-muted-foreground">{t}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="sg-type" className="space-y-3">
        <h2 id="sg-type" className="mb-4 font-display text-2xl font-semibold">Typography</h2>
        <p className="eyebrow">Eyebrow · Plus Jakarta Sans 600</p>
        <p className="font-display text-display-xl font-semibold">Display XL — Fraunces</p>
        <p className="font-display text-display-lg font-semibold">Display L — city views</p>
        <p className="font-display text-display-md font-semibold">Display M — neighborhood guides</p>
        <p className="text-xl font-semibold">Title — $1,250,000 · 4 bd · 3 ba</p>
        <p className="max-w-prose text-base text-muted-foreground">Body — Plus Jakarta Sans keeps dense listing data legible at small sizes, with tabular numerals for prices.</p>
        <p className="text-sm text-muted-foreground">Small — 12 days on market · Listing courtesy of Demo Brokerage</p>
      </section>

      <section aria-labelledby="sg-components" className="space-y-6">
        <h2 id="sg-components" className="font-display text-2xl font-semibold">Components</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Schedule a tour</Button>
          <Button size="lg" variant="secondary">Request info</Button>
          <Button size="lg" variant="outline"><Heart className="size-4" aria-hidden /> Save</Button>
          <Button size="lg" variant="ghost"><Bell className="size-4" aria-hidden /> Alerts</Button>
          <Button size="lg" variant="destructive">Remove</Button>
          <Button variant="link">Learn more</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>New</Badge>
          <Badge variant="secondary">Open house Sat</Badge>
          <Badge variant="outline">3D tour</Badge>
          <Badge className="bg-success text-success-foreground">Price cut $15K</Badge>
          <Badge className="bg-copper-500 text-white">Coming soon</Badge>
          <DemoBadge />
        </div>
        <div className="grid max-w-xl gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sg-input">City, neighborhood, ZIP or address</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="sg-input" placeholder="Austin, TX" className="h-11 pl-9" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Checkbox id="sg-cb" defaultChecked /><Label htmlFor="sg-cb">Has pool</Label></div>
            <div className="flex items-center gap-2"><Switch id="sg-sw" defaultChecked /><Label htmlFor="sg-sw">Search as I move the map</Label></div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader><CardTitle>Card</CardTitle><CardDescription>Default elevation</CardDescription></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Used for listing cards, calculators and dashboards.</CardContent>
          </Card>
          <Card className="shadow-[var(--shadow-raised)]">
            <CardHeader><CardTitle>Raised</CardTitle><CardDescription>Sticky contact card</CardDescription></CardHeader>
            <CardContent className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardContent>
          </Card>
          <Card className="shadow-[var(--shadow-float)]">
            <CardHeader><CardTitle>Float</CardTitle><CardDescription>Popovers, map callouts</CardDescription></CardHeader>
            <CardContent><div className="skeleton-shimmer h-16 rounded-lg" /></CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="sg-media">
        <h2 id="sg-media" className="mb-4 font-display text-2xl font-semibold">Imagery by room category</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {samples.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-xl border">
              <div className="relative aspect-[3/2]">
                <ListingImage src={m.url} alt={m.alt} blurDataUrl={m.blurDataUrl} color={m.color} fill sizes="(min-width:768px) 25vw, 50vw" />
              </div>
              <p className="px-3 py-2 text-xs font-medium">{MEDIA_CATEGORY_LABELS[m.category as MediaCategoryKey]} · {m.provider.toLowerCase()}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sg-compliance" className="flex items-center gap-4">
        <h2 id="sg-compliance" className="sr-only">Compliance marks</h2>
        <EqualHousingLogo className="size-14" />
        <p className="max-w-md text-sm text-muted-foreground">The Equal Housing Opportunity mark and statement appear in the footer and on every listing page.</p>
      </section>
    </div>
  );
}
