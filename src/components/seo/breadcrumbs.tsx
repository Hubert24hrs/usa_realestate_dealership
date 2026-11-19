import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export interface Crumb {
  name: string;
  href: string;
}

/** Visible breadcrumb trail; the last crumb is the current page. */
export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs text-muted-foreground print:hidden", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((b, i) => (
          <li key={b.href} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3" aria-hidden />}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-foreground">{b.name}</span>
            ) : (
              <Link href={b.href} className="hover:text-foreground hover:underline">{b.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** schema.org BreadcrumbList for the same trail. */
export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, item: `${site.url}${b.href}` })),
  };
}
