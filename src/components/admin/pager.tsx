import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Prev/next pager that keeps the current filters in the URL. */
export function AdminPager({ base, params, page, pages }: { base: string; params: Record<string, string>; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
      {page > 1 && <Button asChild variant="outline" size="sm"><Link href={href(page - 1)} rel="prev">Previous</Link></Button>}
      <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
      {page < pages && <Button asChild variant="outline" size="sm"><Link href={href(page + 1)} rel="next">Next</Link></Button>}
    </nav>
  );
}
