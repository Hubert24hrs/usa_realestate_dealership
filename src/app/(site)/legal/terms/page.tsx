import type { Metadata } from "next";
import Link from "@/components/app-link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms that apply when you search, save, contact professionals, post listings, apply for rentals or pay through CITI VIEW.",
  alternates: { canonical: "/legal/terms" },
};

export default async function TermsPage() {
  const { brokerage } = await getSettings();
  return (
    <LegalDoc path="/legal/terms" title="Terms of use" description="The rules for using CITI VIEW, posting listings, and making payments through the platform.">
      <h2 id="agreement">1. Agreement</h2>
      <p>
        These terms are an agreement between you and {site.legalName} (“{site.name}”, “we”, “us”). They apply to our websites, apps, emails and tools (the “Service”). By
        creating an account or using the Service you agree to them. If you don&apos;t agree, please don&apos;t use the Service. Real estate brokerage services offered through{" "}
        {site.name} are provided by {brokerage.name}.
      </p>

      <h2 id="information-only">2. Information, not advice</h2>
      <p>
        Listing details, home value estimates, market statistics, school and neighborhood data, and calculator results are provided for general information. They are not
        appraisals, inspections, surveys, or legal, tax, lending or investment advice. Estimates can differ widely from what a home sells or rents for. Verify anything that
        matters to your decision with the listing agent, a licensed appraiser, inspector, attorney or lender.
      </p>
      {site.demoMode && (
        <p>
          <strong>Demo data.</strong> While demo mode is on, every listing, agent, review, rate, payment and statistic on the Service is fictional and created for
          demonstration. Nothing shown is an offer to sell, lease or lend.
        </p>
      )}

      <h2 id="accounts">3. Your account</h2>
      <ul>
        <li>You must be at least 18 and able to form a binding contract.</li>
        <li>Give accurate information and keep it current. You&apos;re responsible for activity on your account; tell us right away if you suspect unauthorized use.</li>
        <li>Accounts are personal. Agents, brokers and property managers must hold the licenses their work requires and keep them in good standing.</li>
      </ul>

      <h2 id="listings">4. Listing information</h2>
      <p>
        Listings come from licensed data feeds, from agents and property managers, and from owners who post their own property. Information is deemed reliable but is not
        guaranteed: availability, price, square footage, lot size, taxes, HOA dues and school assignments can change or be wrong. Agents and brokerages shown on the Service
        are independent licensees unless we say otherwise. See <Link href="/legal/mls-data">Listing data &amp; IDX</Link> for how feed data may be used.
      </p>

      <h2 id="your-content">5. Content you post</h2>
      <p>When you post a listing, photos, reviews, messages or other content, you confirm that:</p>
      <ul>
        <li>you own the property or are authorized to market it, and the information is accurate;</li>
        <li>you own the photos and text or have a license to use them, and they don&apos;t include other people&apos;s personal information without consent;</li>
        <li>the content complies with fair housing and advertising laws: it describes the property, not who should live there (see our <Link href="/legal/fair-housing">fair housing policy</Link>).</li>
      </ul>
      <p>
        You keep ownership of your content and give us a non-exclusive, worldwide, royalty-free license to host, display, adapt (for example resize or crop photos) and
        distribute it to operate and promote the Service while it&apos;s posted. We may review, decline, edit for format, or remove content that breaks these terms or the law.
      </p>

      <h2 id="acceptable-use">6. Acceptable use</h2>
      <p>Don&apos;t use the Service to:</p>
      <ul>
        <li>scrape, crawl, bulk-download or copy listings, photos or data, or use them to build a competing database or train models, except through tools we provide;</li>
        <li>post false, misleading, duplicate or bait listings, or ask anyone to pay a deposit before they&apos;ve seen a property and signed a lease;</li>
        <li>harass, threaten or discriminate against anyone, or send spam or unsolicited commercial messages;</li>
        <li>probe, scan or test the Service&apos;s security, bypass rate limits or access controls, or interfere with its operation;</li>
        <li>impersonate anyone or misrepresent a license, affiliation or authority.</li>
      </ul>

      <h2 id="contacting-professionals">7. Contacting agents, owners and lenders</h2>
      <p>
        When you request a tour, ask a question, apply for a rental or request pre-approval, we send your contact details and message to the agent, owner, property
        manager or lending partner responsible, so they can reply. They may contact you by email, phone or text as permitted by law. Professionals receiving leads agree
        to respond promptly and to treat every consumer equally.
      </p>

      <h2 id="payments">8. Payments, fees and plans</h2>
      <ul>
        <li>Payments are processed by our payment provider (Stripe). We don&apos;t store full card numbers.</li>
        <li>Rental application fees are set by the property and are generally non-refundable once an application is submitted, except where state law requires otherwise.</li>
        <li>Rent paid through the Service is credited to the lease when the payment succeeds. Questions about charges go to the property manager first; we&apos;ll help resolve payment errors.</li>
        <li>Agent plans renew monthly until cancelled. You can cancel any time in billing settings; the plan stays active through the paid period. Featured placement bought through a plan is labelled “Featured”.</li>
      </ul>

      <h2 id="third-parties">9. Third-party services</h2>
      <p>
        The Service links to or embeds services we don&apos;t control, such as maps, lenders, e-signature and payment providers. Their terms and privacy policies apply to your
        use of them.
      </p>

      <h2 id="copyright">10. Copyright complaints</h2>
      <p>
        If you believe content on the Service infringes your copyright, send a notice to our designated agent at [copyright agent name, address and email] that includes:
        your signature; identification of the work; the URL of the material; your contact details; a statement that you have a good-faith belief the use is not authorized;
        and a statement, under penalty of perjury, that the notice is accurate and you&apos;re authorized to act. We remove material that is the subject of a valid notice and
        terminate repeat infringers.
      </p>

      <h2 id="disclaimers">11. Disclaimers and limits of liability</h2>
      <p>
        The Service is provided “as is” and “as available”. To the fullest extent the law allows, we disclaim implied warranties of merchantability, fitness for a particular
        purpose, accuracy and non-infringement, and we aren&apos;t liable for indirect, incidental, special or consequential damages, or for lost profits, data or
        opportunities. Our total liability for any claim is limited to the greater of the amount you paid us in the 12 months before the claim or $100. Some states don&apos;t
        allow these limits, so they may not apply to you.
      </p>

      <h2 id="indemnity">12. Indemnity</h2>
      <p>
        You agree to defend and indemnify {site.name} against claims arising from content you post, your use of the Service in violation of these terms, or your violation
        of law or anyone&apos;s rights.
      </p>

      <h2 id="changes">13. Changes and termination</h2>
      <p>
        We may update these terms; if a change is material we&apos;ll notify you before it takes effect. You can close your account at any time. We may suspend or close
        accounts that break these terms or put other users at risk.
      </p>

      <h2 id="law">14. Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of [State], without regard to conflict-of-law rules. Disputes will be resolved in the state or federal courts located in [County,
        State], unless an arbitration agreement you&apos;ve accepted says otherwise.
      </p>

      <h2 id="contact">15. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
        {brokerage.address ? `, or by mail at ${brokerage.address}` : ""}.
      </p>
    </LegalDoc>
  );
}
