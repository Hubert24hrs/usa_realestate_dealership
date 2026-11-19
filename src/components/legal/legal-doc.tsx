import Link from "@/components/app-link";
import { PageHero } from "@/components/tools/page-hero";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export const LEGAL_UPDATED = "November 19, 2026";

export const LEGAL_PAGES = [
  { href: "/legal/terms", label: "Terms of use", blurb: "The rules for using CITI VIEW, posting listings and making payments." },
  { href: "/legal/privacy", label: "Privacy policy", blurb: "What we collect, why, who we share it with and your choices." },
  { href: "/legal/accessibility", label: "Accessibility", blurb: "Our WCAG 2.2 AA commitment and how to reach us about barriers." },
  { href: "/legal/fair-housing", label: "Fair housing", blurb: "How we apply fair housing law and how to report a concern." },
  { href: "/legal/mls-data", label: "Listing data & IDX", blurb: "Where listing information comes from and how it may be used." },
] as const;

/**
 * Shell for legal documents: breadcrumbs, title, a document nav and readable prose.
 * The copy in these pages is a starting template; have counsel review it before launch.
 */
export function LegalDoc({ path, title, description, children }: { path: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <>
      <PageHero crumbs={[{ name: "Home", href: "/" }, { name: "Legal", href: "/legal" }, { name: title, href: path }]} eyebrow="Legal" title={title} description={description}>
        <p className="mt-3 text-xs text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
      </PageHero>
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Legal documents" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {LEGAL_PAGES.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={p.href === path ? "page" : undefined}
                  className={cn(
                    "block rounded-full px-3.5 py-2 text-sm font-medium transition-colors lg:rounded-xl",
                    p.href === path ? "bg-brand-700 text-white dark:bg-brand-500 dark:text-brand-50" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="prose-cv max-w-3xl min-w-0">
          {site.demoMode && (
            <p className="rounded-2xl border border-copper-300 bg-copper-50 p-4 text-sm not-italic">
              <strong>Template notice:</strong> this page is starter copy for the {site.name} platform. Bracketed items are placeholders. Have a licensed attorney in
              your state review and adapt it before you accept real users or payments.
            </p>
          )}
          {children}
        </article>
      </div>
    </>
  );
}
