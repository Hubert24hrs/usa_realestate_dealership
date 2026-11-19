import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AccountPageHeader, SectionTitle } from "@/components/account/page-header";
import { PlaceForm } from "@/components/admin/place-editor";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Edit place" };

type PageProps = { params: Promise<{ slug: string }> };

export default async function AdminPlacePage({ params }: PageProps) {
  const { slug } = await params;
  await requireRole(["ADMIN"], `/admin/places/${slug}`);
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) notFound();
  const city = await db.city.findUnique({
    where: { slug },
    select: {
      id: true, name: true, stateCode: true, description: true, seoTitle: true, seoDescription: true, heroColor: true,
      neighborhoods: { orderBy: { name: "asc" }, select: { id: true, name: true, description: true, seoTitle: true, seoDescription: true, highlights: true } },
    },
  });
  if (!city) notFound();
  return (
    <>
      <Link href="/admin/places" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> All places</Link>
      <AccountPageHeader eyebrow="Admin · Places" title={`${city.name}, ${city.stateCode}`} />
      <section aria-labelledby="city-copy" className="rounded-3xl border bg-card p-5">
        <SectionTitle id="city-copy">City page</SectionTitle>
        <PlaceForm place={{ id: city.id, kind: "city", name: city.name, description: city.description ?? "", seoTitle: city.seoTitle ?? "", seoDescription: city.seoDescription ?? "", heroColor: city.heroColor ?? "" }} />
      </section>
      <section aria-labelledby="hoods" className="mt-8">
        <SectionTitle id="hoods">Neighborhoods ({city.neighborhoods.length})</SectionTitle>
        <div className="space-y-3">
          {city.neighborhoods.map((n) => (
            <details key={n.id} className="group rounded-3xl border bg-card p-5">
              <summary className="cursor-pointer font-semibold">{n.name}</summary>
              <div className="mt-4">
                <PlaceForm place={{ id: n.id, kind: "neighborhood", name: n.name, description: n.description ?? "", seoTitle: n.seoTitle ?? "", seoDescription: n.seoDescription ?? "", highlights: n.highlights }} />
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
