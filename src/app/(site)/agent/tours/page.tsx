import type { Metadata } from "next";
import Link from "@/components/app-link";
import { CalendarCheck, Mail, Phone, Video } from "lucide-react";
import { AccountPageHeader, EmptyState, SectionTitle } from "@/components/account/page-header";
import { TourControls } from "@/components/pro/controls";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PRO_ROLES } from "@/server/api";
import { requireRole } from "@/server/auth-helpers";
import { getProScope, tourScope } from "@/server/pro";

export const metadata: Metadata = { title: "Tours" };

export default async function AgentToursPage() {
  const user = await requireRole(PRO_ROLES, "/agent/tours");
  const scope = await getProScope(user);
  const tours = await db.tourRequest.findMany({
    where: { ...tourScope(scope), createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) } },
    orderBy: { preferredDate: "asc" },
    take: 200,
    select: { id: true, status: true, type: true, name: true, email: true, phone: true, preferredDate: true, preferredTime: true, message: true, listing: { select: { slug: true, streetAddress: true, city: true } } },
  });
  const groups = [
    { key: "REQUESTED", title: "Needs confirmation", items: tours.filter((t) => t.status === "REQUESTED") },
    { key: "CONFIRMED", title: "Confirmed", items: tours.filter((t) => t.status === "CONFIRMED") },
    { key: "CLOSED", title: "Completed & cancelled", items: tours.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED").reverse() },
  ];
  return (
    <>
      <AccountPageHeader title="Tours" description="Confirm requests quickly — buyers get an email and a calendar invite when you do." />
      {tours.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No tour requests yet">Requests from your listings appear here.</EmptyState>
      ) : (
        groups.map((g) =>
          g.items.length ? (
            <section key={g.key} aria-labelledby={`tours-${g.key}`} className="mb-8">
              <SectionTitle id={`tours-${g.key}`}>{g.title}</SectionTitle>
              <ul className="space-y-3">
                {g.items.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border bg-card p-4">
                    <div className="min-w-0 text-sm">
                      <Link href={`/property/${t.listing.slug}`} className="font-semibold hover:underline">{t.listing.streetAddress}, {t.listing.city}</Link>
                      <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                        {t.type === "VIDEO" && <Video className="size-3.5" aria-hidden />}
                        {formatDate(t.preferredDate)} · {t.preferredTime} · {t.type === "VIDEO" ? "Video tour" : "In person"} · {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="font-medium">{t.name}</span>
                        <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Mail className="size-3.5" aria-hidden /> {t.email}</a>
                        {t.phone && <a href={`tel:${t.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1 text-primary hover:underline"><Phone className="size-3.5" aria-hidden /> {t.phone}</a>}
                      </p>
                      {t.message && <p className="mt-1 text-muted-foreground">“{t.message}”</p>}
                    </div>
                    <TourControls id={t.id} status={t.status} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )
      )}
    </>
  );
}
