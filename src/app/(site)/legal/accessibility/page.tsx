import type { Metadata } from "next";
import Link from "@/components/app-link";
import { LegalDoc } from "@/components/legal/legal-doc";
import { site } from "@/lib/site";
import { getSettings } from "@/server/settings";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Accessibility statement",
  description: "CITI VIEW aims to meet WCAG 2.2 Level AA. Learn what we've built in, known limitations, and how to report an accessibility barrier.",
  alternates: { canonical: "/legal/accessibility" },
};

export default async function AccessibilityPage() {
  const { brokerage } = await getSettings();
  return (
    <LegalDoc path="/legal/accessibility" title="Accessibility statement" description="Everyone should be able to find, compare and secure a home. Here's how we work toward that, and how to tell us when we fall short.">
      <h2 id="commitment">Our commitment</h2>
      <p>
        {site.name} aims to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA across our website. Accessibility is part of how we design, build
        and test every feature, not a separate project.
      </p>

      <h2 id="built-in">What we&apos;ve built in</h2>
      <ul>
        <li>Semantic page structure with landmarks, one main heading per page, and a “skip to content” link.</li>
        <li>Every control works with a keyboard and shows a visible focus indicator. Touch targets are at least 24 × 24 pixels.</li>
        <li>Text and interface colors are checked for contrast in both light and dark themes.</li>
        <li>Map searches always have an equivalent list of results with the same filters, so the map is never the only way to browse.</li>
        <li>Charts can be explored with arrow keys and switched to a data table.</li>
        <li>Listing photos have text descriptions; owners and agents must describe each photo they upload.</li>
        <li>Forms have visible labels, clear error messages tied to their fields, and don&apos;t time out while you&apos;re typing.</li>
        <li>Motion and automatically advancing carousels respect your “reduce motion” setting.</li>
      </ul>

      <h2 id="limitations">Known limitations</h2>
      <ul>
        <li>The interactive map itself has limited screen reader support. Use the results list, which contains the same homes.</li>
        <li>Some documents uploaded by agents or property managers (for example HOA disclosures) may not be fully accessible. Ask us for an alternative format.</li>
        <li>Third party content such as 3D tours or partner pages is outside our direct control; we ask partners to meet the same standard.</li>
      </ul>

      <h2 id="testing">How we test</h2>
      <p>
        We run automated checks (axe) on key pages for every release, and test manually with a keyboard only, at 200% and 400% zoom, and with screen readers including
        NVDA with Firefox and VoiceOver with Safari.
      </p>

      <h2 id="feedback">Report a barrier or ask for help</h2>
      <p>
        If something on {site.name} doesn&apos;t work for you, or you need information in another format, contact us at{" "}
        <a href={`mailto:${site.supportEmail}?subject=Accessibility`}>{site.supportEmail}</a>
        {brokerage.phone ? ` or ${brokerage.phone}` : ""}. Tell us the page and what happened. We aim to respond within two business days and can help you complete any task
        (scheduling a tour, applying for a rental, contacting an agent) another way in the meantime.
      </p>
      <p>
        Requests for reasonable accommodations in housing (for example an assistance animal or an accessible parking space) go to the property owner or manager. See our{" "}
        <Link href="/legal/fair-housing">fair housing policy</Link>.
      </p>
    </LegalDoc>
  );
}
