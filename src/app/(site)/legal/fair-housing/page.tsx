import type { Metadata } from "next";
import Link from "@/components/app-link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fair housing policy",
  description: "CITI VIEW is an Equal Housing Opportunity platform. How we apply fair housing law to listings, leads and rentals, and how to report discrimination.",
  alternates: { canonical: "/legal/fair-housing" },
};

export default async function FairHousingPage() {
  const { fairHousing } = await getSettings();
  return (
    <LegalDoc path="/legal/fair-housing" title="Fair housing policy" description="Everyone deserves an equal opportunity to buy or rent a home. Here's what that means on CITI VIEW.">
      <blockquote>{fairHousing}</blockquote>

      <h2 id="protected">Who is protected</h2>
      <p>
        The federal Fair Housing Act prohibits discrimination in the sale, rental, financing and advertising of housing because of <strong>race, color, religion, sex
        (including sexual orientation and gender identity), national origin, familial status</strong> (households with children under 18, pregnant people, and people
        securing custody of children) and <strong>disability</strong>. Many states and cities protect more characteristics, such as source of income (including housing
        vouchers), age, marital status, military or veteran status, and criminal history in some rental decisions. We follow the broadest rule that applies.
      </p>

      <h2 id="how-we-apply-it">How we apply it on {site.name}</h2>
      <ul>
        <li>
          <strong>Listing language.</strong> Before a listing or edit is published, we check the copy for phrases that describe who should (or shouldn&apos;t) live there.
          Clear violations, like “adults only” or “no kids”, are blocked; borderline phrases come with a suggestion. Describe the property, not the people.
        </li>
        <li>
          <strong>Neighborhood information.</strong> We show facts about places (schools, commute times, parks, amenities, prices and environmental risk), never demographic
          makeup, and we don&apos;t label neighborhoods as “good”, “safe” or “exclusive”.
        </li>
        <li>
          <strong>Lead routing.</strong> Inquiries are routed by listing, location, availability and plan settings, never by anything about the person asking. Every
          professional who receives leads agrees to respond to every consumer the same way.
        </li>
        <li>
          <strong>Rentals.</strong> Applications on {site.name} ask every applicant the same questions. Property managers must apply the same written criteria to everyone,
          consider reasonable accommodation and modification requests from people with disabilities, and follow source of income laws where they apply.
        </li>
        <li>
          <strong>Moderation.</strong> Shoppers can report any listing. Reports of discriminatory language are reviewed the same day, and listings that violate this policy
          are removed.
        </li>
      </ul>

      <h2 id="housing-for-older-persons">Housing for older persons</h2>
      <p>
        Communities that qualify as housing for older persons (“55+” or “62+”) under federal law may advertise that status. Listings must use those terms accurately and
        may not otherwise express preferences about age or family composition.
      </p>

      <h2 id="report">Report a concern</h2>
      <ul>
        <li>Use <strong>Report listing</strong> on any property page, or email <a href={`mailto:${site.supportEmail}?subject=Fair%20housing%20concern`}>{site.supportEmail}</a>.</li>
        <li>
          You can also file a complaint with the U.S. Department of Housing and Urban Development at{" "}
          <a href="https://www.hud.gov/fairhousing" rel="noopener noreferrer">hud.gov/fairhousing</a> or by calling 1-800-669-9777, or with your state or local fair housing
          agency. Complaints generally must be filed with HUD within one year of the incident.
        </li>
      </ul>
      <p>
        Questions about accessibility of the {site.name} website itself are covered in our <Link href="/legal/accessibility">accessibility statement</Link>.
      </p>
      <p className="text-sm text-muted-foreground">Equal Housing Opportunity. This page is general information, not legal advice.</p>
    </LegalDoc>
  );
}
