import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal information CITI VIEW collects, how it's used and shared, and the choices and rights you have — including how to access or delete your data.",
  alternates: { canonical: "/legal/privacy" },
};

export default async function PrivacyPage() {
  const { brokerage } = await getSettings();
  return (
    <LegalDoc path="/legal/privacy" title="Privacy policy" description="What we collect, why we collect it, who we share it with, and the choices you have.">
      <h2 id="summary">The short version</h2>
      <ul>
        <li>We collect what we need to run your searches, saved homes, tours, applications and payments.</li>
        <li>When you contact an agent, owner, property manager or lender, we share your request with them. That&apos;s the point of the request.</li>
        <li>We don&apos;t sell your personal information, and we don&apos;t share it for cross-context behavioral advertising.</li>
        <li>You can see, download, correct or delete your data, and turn off marketing emails and alerts at any time.</li>
      </ul>

      <h2 id="collect">1. Information we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li><strong>Account details:</strong> name, email, phone and password-less sign-in details; for professionals, license and brokerage information.</li>
        <li><strong>Your activity:</strong> saved homes, collections, notes, saved searches, alert preferences and messages.</li>
        <li><strong>Requests:</strong> tour requests, questions, seller consultations, home value requests and pre-approval requests.</li>
        <li>
          <strong>Rental applications:</strong> identity details, income, employment, rental history, household members, pets, vehicles and references you choose to provide.
          This is sensitive, so it&apos;s shared only with the property&apos;s manager or owner and kept only as long as needed (see Retention).
        </li>
        <li><strong>Payments:</strong> handled by Stripe. We receive the amount and whether the payment succeeded, never your full card or bank account number.</li>
        <li><strong>Photos and listing content</strong> you upload. We strip location (GPS) and camera metadata from photos when they&apos;re processed.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>Pages and listings viewed, searches run and features used, used to show recently viewed homes, improve results and measure listing performance for sellers.</li>
        <li>Device and log data such as browser type, IP address and timestamps, used for security, rate limiting and debugging. For e-signatures we store a one-way hash of the IP address, not the address itself.</li>
        <li>Approximate location only if you choose a “near me” search; we don&apos;t track your location in the background.</li>
      </ul>

      <h2 id="use">2. How we use information</h2>
      <ul>
        <li>Provide the Service: search, alerts, messaging, tours, applications, leases and payments.</li>
        <li>Route your request to the right professional (see <Link href="/legal/terms#contacting-professionals">Terms §7</Link>).</li>
        <li>Keep the Service safe: detect fraud and rental scams, enforce our terms and fair housing rules, and secure accounts.</li>
        <li>Send transactional messages and, if you opt in, alerts and occasional product updates.</li>
        <li>Improve the Service using aggregated or de-identified analytics.</li>
        <li>Comply with law, including recordkeeping rules for real estate transactions.</li>
      </ul>

      <h2 id="share">3. How we share information</h2>
      <ul>
        <li><strong>Professionals you contact:</strong> agents, brokerages, owners, property managers and our lending partner receive the details of your request.</li>
        <li><strong>Service providers</strong> that host, store, email, process payments, provide maps or search, and help with security. They may use data only to provide services to us.</li>
        <li><strong>People you invite:</strong> members of a shared collection see its homes and notes.</li>
        <li><strong>Legal and safety:</strong> when required by law, or to protect the rights and safety of users and the public.</li>
        <li><strong>Business transfers:</strong> if {site.name} is involved in a merger or acquisition, this policy continues to apply to your information.</li>
      </ul>
      <p>We don&apos;t sell personal information, and we don&apos;t allow ad networks to track you across other sites from our pages.</p>

      <h2 id="cookies">4. Cookies</h2>
      <p>
        Necessary first-party cookies keep you signed in, protect forms and remember your cookie choices. Browser storage remembers conveniences like recently viewed homes
        and dark mode. Analytics and marketing cookies are used only if you allow them. We don&apos;t run third-party advertising trackers, and if we ever add one it stays
        off unless you opt in. Change your choices any time with <strong>Cookie preferences</strong> at the bottom of every page. We treat a Global Privacy Control signal
        as a request to opt out of any sale or sharing of personal information.
      </p>

      <h2 id="rights">5. Your choices and rights</h2>
      <ul>
        <li><strong>Access and portability:</strong> ask for a copy of the personal information we hold about you.</li>
        <li><strong>Correction:</strong> update most information in your account settings, or ask us to correct it.</li>
        <li><strong>Deletion:</strong> ask us to delete your account and personal information. We may keep records we&apos;re legally required to retain, such as signed leases and payment records.</li>
        <li><strong>Communications:</strong> manage alert frequency and email preferences in account settings, or use the unsubscribe link in any marketing email.</li>
      </ul>
      <p>
        Residents of California, Colorado, Connecticut, Virginia, Utah, Texas, Oregon and other states with comprehensive privacy laws have these rights by law, along with the
        right to appeal a decision we make about a request. We&apos;ll verify requests by confirming control of your account email, and we won&apos;t discriminate against you
        for exercising your rights. You may use an authorized agent where your state allows it.
      </p>

      <h2 id="retention">6. Retention</h2>
      <p>
        We keep account data while your account is open. Rental applications that don&apos;t lead to a lease are deleted or de-identified [24 months] after a decision. Leases,
        payment records and e-signature evidence are kept for as long as real estate and tax laws require. Security logs are kept for [90 days].
      </p>

      <h2 id="security">7. Security</h2>
      <p>
        We encrypt data in transit, limit staff access to what their role needs, rate-limit sensitive actions, and review access. No system is perfectly secure; if a breach
        affects your information we&apos;ll notify you as the law requires.
      </p>

      <h2 id="children">8. Children</h2>
      <p>The Service is for adults. We don&apos;t knowingly collect personal information from children under 13, and we delete it if we learn we have.</p>

      <h2 id="changes">9. Changes</h2>
      <p>We&apos;ll post updates here and change the date above. If a change materially affects how we use your information, we&apos;ll tell you before it takes effect.</p>

      <h2 id="contact">10. Contact</h2>
      <p>
        Privacy requests and questions: <a href={`mailto:${site.supportEmail}?subject=Privacy%20request`}>{site.supportEmail}</a>
        {brokerage.address ? `, or by mail to ${brokerage.name}, ${brokerage.address}` : ""}.
      </p>
    </LegalDoc>
  );
}
