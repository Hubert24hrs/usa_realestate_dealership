import type { Metadata } from "next";
import Link from "@/components/app-link";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/components/legal/legal-doc";
import { PageHero } from "@/components/tools/page-hero";

export const metadata: Metadata = {
  title: "Legal & policies",
  description: "CITI VIEW terms of use, privacy policy, accessibility statement, fair housing policy and listing data terms.",
  alternates: { canonical: "/legal" },
};

export default function LegalIndexPage() {
  return (
    <>
      <PageHero crumbs={[{ name: "Home", href: "/" }, { name: "Legal", href: "/legal" }]} eyebrow="Legal" title="Legal & policies" description={`The documents that govern CITI VIEW. Last reviewed ${LEGAL_UPDATED}.`} />
      <div className="container-page py-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LEGAL_PAGES.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="block h-full rounded-3xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/40">
                <span className="font-semibold">{p.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{p.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
