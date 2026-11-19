import type { Metadata } from "next";
import Link from "@/components/app-link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Listing data & IDX",
  description: "Where CITI VIEW listing information and photos come from, how often they update, the IDX disclaimer, and how to report an inaccurate listing.",
  alternates: { canonical: "/legal/mls-data" },
};

export default async function MlsDataPage() {
  const { idxDisclaimer, listingDisclaimer, brokerage } = await getSettings();
  return (
    <LegalDoc path="/legal/mls-data" title="Listing data & IDX" description="Where listing information comes from, how it may be used, and how to report a problem.">
      <h2 id="sources">Where listings come from</h2>
      <ul>
        <li>
          <strong>MLS and IDX feeds.</strong> Listings from participating multiple listing services are displayed under Internet Data Exchange (IDX) agreements held by our
          brokerage of record, {brokerage.name}. Each listing shows the listing brokerage, and feed data is refreshed at least every 12 hours.
        </li>
        <li><strong>Agents and property managers</strong> who add or manage listings directly on {site.name}.</li>
        <li><strong>Owners</strong> who post their own home for sale or rent (shown as “For sale by owner” or “By owner”).</li>
      </ul>
      <p>
        We don&apos;t copy listings, photos or descriptions from other real estate websites. Listing photos are provided by the listing broker or owner under license.
        {site.demoMode ? " While the site runs on sample data, listing photos are original AI generated illustrations created for this platform and credited as such, and all listing data is fictional." : ""}
      </p>

      <h2 id="idx-disclaimer">IDX disclaimer</h2>
      <p>{idxDisclaimer}</p>
      <p>{listingDisclaimer}</p>

      <h2 id="use">How you may use listing data</h2>
      <p>
        IDX information is for your personal, noncommercial use in identifying properties you may be interested in buying or renting. It may not be reproduced,
        redistributed, scraped or used for any other purpose. See our <Link href="/legal/terms#acceptable-use">acceptable use rules</Link>.
      </p>

      <h2 id="estimates">Estimates and statistics</h2>
      <p>
        Home value estimates, rent estimates, price per square foot figures and market trends are calculated by {site.name} from comparable listings and sales. Home value
        estimates come with a range and a confidence level. None of these figures is an appraisal, and they shouldn&apos;t be the basis for a loan or purchase decision.
      </p>

      <h2 id="corrections">Corrections</h2>
      <p>
        If information about a property is wrong, use <strong>Report listing</strong> on the property page. Listing agents can correct their listings through their MLS or the
        Pro dashboard; owners can edit their listings from <Link href="/account/listings">My listings</Link>.
      </p>
    </LegalDoc>
  );
}
