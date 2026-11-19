import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Phone, Video } from "lucide-react";
import { AccountPageHeader, EmptyState, SectionTitle } from "@/components/account/page-header";
import { TourActions } from "@/components/account/tour-actions";
import { ListingImage } from "@/components/media/listing-image";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Tours" };

const STATUS_STYLE: Record<string, string> = {
  REQUESTED: "bg-muted text-foreground",
  CONFIRMED: "bg-success/15 text-success",
  COMPLETED: "bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200",
  CANCELLED: "bg-destructive/10 text-destructive",
};
const STATUS_LABEL: Record<string, string> = { REQUESTED: "Requested", CONFIRMED: "Confirmed", COMPLETED: "Completed", CANCELLED: "Cancelled" };

export default async function ToursPage() {
  const user = await requireUser("/account/tours");
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tours = await db.tourRequest.findMany({
    where: { userId: user.id },
    orderBy: { preferredDate: "asc" },
    take: 100,
    include: {
      listing: { select: { slug: true, streetAddress: true, unit: true, city: true, state: true, zip: true, media: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true, blurDataUrl: true, color: true } } } },
      agent: { select: { name: true, phone: true, slug: true } },
    },
  });
  const upcoming = tours.filter((t) => (t.status === "REQUESTED" || t.status === "CONFIRMED") && t.preferredDate >= today);
  const past = tours.filter((t) => !upcoming.includes(t)).reverse();

  const render = (list: typeof tours, open: boolean) => (
    <ul className="space-y-3">
      {list.map((t) => {
        const cover = t.listing.media[0];
        const address = `${t.listing.streetAddress}${t.listing.unit ? ` ${t.listing.unit}` : ""}`;
        return (
          <li key={t.id} className="flex flex-col gap-4 rounded-3xl border bg-surface p-4 sm:flex-row">
            <Link href={`/property/${t.listing.slug}`} className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl bg-muted sm:w-40" tabIndex={-1} aria-hidden>
              {cover && <ListingImage src={cover.url} alt="" blurDataUrl={cover.blurDataUrl} color={cover.color} fill sizes="(min-width: 640px) 160px, 100vw" />}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {t.preferredDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })} · {t.preferredTime}
                  </p>
                  <Link href={`/property/${t.listing.slug}`} className="block truncate text-sm hover:underline">{address}, {t.listing.city}, {t.listing.state} {t.listing.zip}</Link>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[t.status])}>{STATUS_LABEL[t.status]}</span>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">{t.type === "VIDEO" ? <Video className="size-4" aria-hidden /> : <CalendarCheck className="size-4" aria-hidden />} {t.type === "VIDEO" ? "Video tour" : "In-person tour"}</span>
                {t.agent && (
                  <span>
                    with <Link href={`/agents/${t.agent.slug}`} className="text-foreground hover:underline">{t.agent.name}</Link>
                  </span>
                )}
                {t.agent?.phone && open && (
                  <a href={`tel:${t.agent.phone.replace(/[^0-9+]/g, "")}`} className="flex items-center gap-1 text-foreground hover:underline"><Phone className="size-3.5" aria-hidden /> {t.agent.phone}</a>
                )}
              </p>
              {t.message && <p className="mt-2 line-clamp-2 text-sm">“{t.message}”</p>}
              <div className="mt-3">
                <TourActions id={t.id} open={open} address={address} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <AccountPageHeader title="Tours" description="Requested and confirmed tours. Agents confirm by email and in your notifications." />
      {tours.length ? (
        <div className="space-y-10">
          <section aria-labelledby="tours-upcoming">
            <SectionTitle id="tours-upcoming">Upcoming</SectionTitle>
            {upcoming.length ? render(upcoming, true) : <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">No upcoming tours.</p>}
          </section>
          {past.length > 0 && (
            <section aria-labelledby="tours-past">
              <SectionTitle id="tours-past">Past & cancelled</SectionTitle>
              {render(past, false)}
            </section>
          )}
        </div>
      ) : (
        <EmptyState icon={CalendarCheck} title="No tours yet" action={<Button asChild><Link href="/homes-for-sale?openHouse=1">Find open houses</Link></Button>}>
          Request an in-person or video tour from any listing&apos;s contact card.
        </EmptyState>
      )}
    </>
  );
}
