import type { Metadata } from "next";
import { Camera, Scale, ShieldCheck } from "lucide-react";
import { FsboWizard } from "@/components/sell/fsbo-wizard";
import { PageHero } from "@/components/tools/page-hero";
import { requireUser } from "@/server/auth-helpers";
import { getCityMarkets } from "@/server/markets";

export const metadata: Metadata = {
  title: "Post a listing: sell or rent by owner",
  description: "List your home for sale or rent by owner on CITI VIEW — upload photos, get pricing guidance and publish in minutes.",
  alternates: { canonical: "/sell/post" },
};

const TIPS = [
  { icon: Camera, title: "Photos sell homes", body: "Shoot in daylight with lights on, start with the front exterior, and cover every main room. 8–12 photos is the sweet spot." },
  { icon: Scale, title: "Price with comps", body: "Overpriced listings sit. Check recent sales nearby with the home value tool before you set a price." },
  { icon: ShieldCheck, title: "Describe the home, not the buyer", body: "Fair Housing law forbids preferences about who lives there. Our checker flags risky wording as you type." },
];

export default async function PostListingPage() {
  await requireUser("/sell/post");
  const cities = (await getCityMarkets())
    .map((m) => ({ slug: m.slug, name: m.name, stateCode: m.stateCode, medianPpsf: m.medianPpsf, medianRent: m.medianRent }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      <PageHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Sell", href: "/sell" }, { name: "Post a listing", href: "/sell/post" }]}
        eyebrow="For sale or rent by owner"
        title="Post your home on CITI VIEW"
        description="Free to list. Add details and photos, review the Fair Housing check, and publish — your listing appears in search right away."
      />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <FsboWizard cities={cities} />
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Listing tips">
          {TIPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border bg-card p-4">
              <p className="flex items-center gap-2 font-semibold"><Icon className="size-4 text-primary" aria-hidden /> {title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">Listings must be for property you own or are authorized to list. Uploaded photos are resized and have location data removed. CITI VIEW may remove listings that violate our terms or fair housing law.</p>
        </aside>
      </div>
    </>
  );
}
