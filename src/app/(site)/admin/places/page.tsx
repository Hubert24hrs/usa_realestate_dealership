import type { Metadata } from "next";
import Link from "next/link";
import { AccountPageHeader } from "@/components/account/page-header";
import { db } from "@/lib/db";
import { formatNumber, formatPrice } from "@/lib/format";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Places" };

export default async function AdminPlacesPage() {
  await requireRole(["ADMIN"], "/admin/places");
  const cities = await db.city.findMany({
    orderBy: [{ stateCode: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true, stateCode: true, population: true, medianHomeValue: true, description: true, seoTitle: true, seoDescription: true, _count: { select: { neighborhoods: true, listings: true } } },
  });
  return (
    <>
      <AccountPageHeader eyebrow="Admin" title="Places" description="City and neighborhood copy used on market, search and SEO landing pages. Write original, factual descriptions and avoid anything that steers buyers toward or away from an area." />
      <div className="overflow-x-auto rounded-3xl border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">CITI VIEW markets</caption>
          <thead className="border-b text-xs text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Market</th>
              <th scope="col" className="px-4 py-3 text-right">Population</th>
              <th scope="col" className="px-4 py-3 text-right">Median value</th>
              <th scope="col" className="px-4 py-3 text-right">Neighborhoods</th>
              <th scope="col" className="px-4 py-3 text-right">Listings</th>
              <th scope="col" className="px-4 py-3">Copy</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cities.map((c) => {
              const missing = [!c.description && "overview", !c.seoTitle && "SEO title", !c.seoDescription && "meta description"].filter(Boolean);
              return (
                <tr key={c.id}>
                  <td className="px-4 py-3"><Link href={`/admin/places/${c.slug}`} className="font-medium hover:underline">{c.name}, {c.stateCode}</Link></td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c.population)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(c.medianHomeValue)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c._count.neighborhoods}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c._count.listings)}</td>
                  <td className="px-4 py-3 text-xs">{missing.length ? <span className="text-muted-foreground">Missing {missing.join(", ")}</span> : <span className="text-emerald-700 dark:text-emerald-400">Complete</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
