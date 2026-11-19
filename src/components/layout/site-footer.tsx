import Link from "@/components/app-link";
import { Logo } from "@/components/brand/logo";
import { EqualHousingStatement } from "@/components/compliance/equal-housing";
import { CookiePreferencesButton } from "@/components/compliance/cookie-preferences-button";
import { POPULAR_MARKETS, site } from "@/lib/site";
import { getSettings, getStateNotices } from "@/server/settings";

const COLUMNS: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: "Buy",
    links: [
      ["Homes for sale", "/homes-for-sale"],
      ["New construction", "/new-construction"],
      ["Open houses", "/homes-for-sale?openHouse=1"],
      ["Price reduced", "/homes-for-sale?reduced=1"],
      ["Foreclosures", "/homes-for-sale?foreclosure=1"],
      ["Recently sold", "/sold-homes"],
    ],
  },
  {
    title: "Rent",
    links: [
      ["Apartments for rent", "/apartments-for-rent"],
      ["Houses for rent", "/houses-for-rent"],
      ["Rent affordability", "/rent/affordability"],
      ["Cost of living", "/rent/cost-of-living"],
      ["Rent trends", "/rent/trends"],
      ["Renter dashboard", "/account/rentals"],
    ],
  },
  {
    title: "Sell & invest",
    links: [
      ["Home value estimate", "/home-value"],
      ["Post a FSBO listing", "/sell/post"],
      ["Find a listing agent", "/agents?specialty=listing"],
      ["Commercial real estate", "/commercial-real-estate"],
      ["Land for sale", "/land-for-sale"],
      ["Seller's guide", "/learn/selling-your-home"],
    ],
  },
  {
    title: "Tools & learn",
    links: [
      ["Mortgage calculator", "/mortgage/calculator"],
      ["Today's rates", "/mortgage/rates"],
      ["Get preapproved", "/mortgage/preapproval"],
      ["Closing costs", "/mortgage/closing-costs"],
      ["Down payment assistance", "/mortgage/down-payment-assistance"],
      ["Glossary", "/learn/glossary"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About CITI VIEW", "/about"],
      ["Agents", "/agents"],
      ["Brokerages", "/brokerages"],
      ["Property managers", "/property-managers"],
      ["News & guides", "/learn"],
      ["For agents (Pro)", "/pro"],
    ],
  },
];

export async function SiteFooter() {
  const [settings, notices] = await Promise.all([getSettings(), getStateNotices()]);
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t bg-surface">
      <div className="container-page py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_3fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">{site.tagline} Homes, rentals, new builds, commercial space and land on one map.</p>
            <EqualHousingStatement text={settings.fairHousing} className="max-w-sm" />
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="mb-3 text-sm font-semibold text-foreground">{col.title}</h2>
                <ul className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-12 border-t pt-8">
          <h2 className="mb-3 text-sm font-semibold">Popular markets</h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {POPULAR_MARKETS.map((m) => (
              <li key={m.slug}>
                <Link href={`/${m.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
                  {m.name} real estate
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 grid gap-6 border-t pt-8 text-xs leading-relaxed text-muted-foreground lg:grid-cols-2">
          <div className="space-y-3">
            <p id="idx-disclaimer">
              <strong className="font-semibold text-foreground">IDX / MLS disclaimer.</strong> {settings.idxDisclaimer}
            </p>
            <p>
              <strong className="font-semibold text-foreground">{settings.brokerage.name}</strong>
              {settings.brokerage.address ? ` · ${settings.brokerage.address}` : ""}
              {settings.brokerage.phone ? ` · ${settings.brokerage.phone}` : ""}
              <br />
              {settings.brokerage.licenses.join(" · ")}
            </p>
          </div>
          <details className="group self-start rounded-xl border bg-background/60 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-foreground marker:text-muted-foreground">State specific notices &amp; licensing disclosures</summary>
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-2">
              {notices.map((n) => (
                <li key={n.code}>
                  <strong className="font-semibold text-foreground">{n.name}:</strong> {n.notice}
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {year} {site.legalName}. All rights reserved.{site.demoMode ? " Listings and agents on this site are fictional samples." : ""}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            <li><Link href="/legal/terms" className="hover:text-foreground">Terms of use</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-foreground">Privacy policy</Link></li>
            <li><CookiePreferencesButton className="hover:text-foreground" /></li>
            <li><CookiePreferencesButton className="hover:text-foreground">Do Not Sell or Share My Personal Information</CookiePreferencesButton></li>
            <li><Link href="/legal/fair-housing" className="hover:text-foreground">Fair housing</Link></li>
            <li><Link href="/legal/accessibility" className="hover:text-foreground">Accessibility</Link></li>
            <li><Link href="/legal/mls-data" className="hover:text-foreground">Listing data &amp; IDX</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
