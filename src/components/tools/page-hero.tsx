import { breadcrumbJsonLd, Breadcrumbs, type Crumb } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { cn } from "@/lib/utils";

/** Standard header for tool, guide and hub pages: breadcrumbs (+ JSON-LD), eyebrow, title, lede. */
export function PageHero({
  crumbs,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  crumbs: Crumb[];
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b bg-surface", className)}>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="container-page py-8 sm:py-10">
        <Breadcrumbs items={crumbs} className="mb-4" />
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 max-w-3xl font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-base text-pretty text-muted-foreground">{description}</p>}
        {children}
      </div>
    </section>
  );
}

/** Small-print block used under calculators. */
export function ToolDisclaimer({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">{children}</p>;
}
