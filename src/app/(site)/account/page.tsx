import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BellRing, Building, CalendarCheck, Heart, Inbox, KeyRound, ShieldAlert, ShieldCheck } from "lucide-react";
import { AccountPageHeader, SectionTitle } from "@/components/account/page-header";
import { ListingCard } from "@/components/listing/listing-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatDate, formatMoney, timeAgo } from "@/lib/format";
import { requireUser } from "@/server/auth-helpers";
import { unreadConversationCount } from "@/server/messages";
import { cardSelect, toCardData } from "@/server/search/card";

export const metadata: Metadata = { title: "Your account" };

type Props = { searchParams: Promise<{ denied?: string }> };

export default async function AccountOverviewPage({ searchParams }: Props) {
  const user = await requireUser("/account");
  const { denied } = await searchParams;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [favorites, searches, tours, unreadMessages, notifications, views, lease, profile] = await Promise.all([
    db.favorite.count({ where: { userId: user.id } }),
    db.savedSearch.count({ where: { userId: user.id } }),
    db.tourRequest.findMany({
      where: { userId: user.id, status: { in: ["REQUESTED", "CONFIRMED"] }, preferredDate: { gte: today } },
      orderBy: { preferredDate: "asc" },
      take: 3,
      include: { listing: { select: { slug: true, streetAddress: true, city: true, state: true } }, agent: { select: { name: true } } },
    }),
    unreadConversationCount(user.id),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.listingView.findMany({ where: { userId: user.id }, orderBy: { viewedAt: "desc" }, take: 4, select: { listing: { select: cardSelect(now) } } }),
    db.lease.findFirst({ where: { tenantId: user.id, status: "ACTIVE" }, select: { monthlyRent: true, listing: { select: { communityName: true, streetAddress: true } } } }),
    db.user.findUnique({ where: { id: user.id }, select: { name: true, createdAt: true } }),
  ]);
  const firstName = (profile?.name ?? user.name)?.split(" ")[0] ?? "there";
  const isPro = user.role === "AGENT" || user.role === "BROKER" || user.role === "PROPERTY_MANAGER";

  const tiles = [
    { href: "/account/favorites", label: "Saved homes", value: favorites, icon: Heart },
    { href: "/account/saved-searches", label: "Saved searches", value: searches, icon: BellRing },
    { href: "/account/tours", label: "Upcoming tours", value: tours.length, icon: CalendarCheck },
    { href: "/account/messages", label: "Unread conversations", value: unreadMessages, icon: Inbox },
  ];

  return (
    <>
      {denied && (
        <Alert className="mb-6">
          <ShieldAlert aria-hidden />
          <AlertTitle>You don&apos;t have access to that area</AlertTitle>
          <AlertDescription>It&apos;s reserved for agents, property managers or administrators.</AlertDescription>
        </Alert>
      )}
      <AccountPageHeader eyebrow="Your account" title={`Welcome back, ${firstName}`} description="Everything you've saved, scheduled and shared — in one place." />

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="group flex h-full flex-col rounded-3xl border bg-surface p-4 transition-colors hover:border-brand-600/50">
              <t.icon className="size-5 text-copper-600 dark:text-copper-400" aria-hidden />
              <span className="mt-3 font-display text-3xl font-semibold">{t.value}</span>
              <span className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                {t.label} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {(isPro || user.role === "ADMIN" || lease) && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {lease && (
            <Link href="/account/rentals" className="flex items-center gap-4 rounded-3xl border bg-surface p-4 hover:border-brand-600/50">
              <KeyRound className="size-5 text-brand-700 dark:text-brand-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Your lease at {lease.listing.communityName ?? lease.listing.streetAddress}</span>
                <span className="block text-sm text-muted-foreground">Rent {formatMoney(lease.monthlyRent)}/mo · payments, documents and requests</span>
              </span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          {(isPro || user.role === "ADMIN") && (
            <Link href="/agent" className="flex items-center gap-4 rounded-3xl border bg-surface p-4 hover:border-brand-600/50">
              <Building className="size-5 text-brand-700 dark:text-brand-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{user.role === "PROPERTY_MANAGER" ? "Manager dashboard" : "Agent dashboard"}</span>
                <span className="block text-sm text-muted-foreground">Leads, listings, tours and performance</span>
              </span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          {user.role === "ADMIN" && (
            <Link href="/admin" className="flex items-center gap-4 rounded-3xl border bg-surface p-4 hover:border-brand-600/50">
              <ShieldCheck className="size-5 text-brand-700 dark:text-brand-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Admin console</span>
                <span className="block text-sm text-muted-foreground">Listings, media, CMS, moderation and settings</span>
              </span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      )}

      <div className="mt-10 grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="ov-tours">
          <SectionTitle id="ov-tours" action={<Button asChild variant="link" className="px-0"><Link href="/account/tours">All tours</Link></Button>}>Upcoming tours</SectionTitle>
          {tours.length ? (
            <ul className="divide-y rounded-3xl border bg-surface">
              {tours.map((t) => (
                <li key={t.id} className="flex items-center gap-4 p-4">
                  <span className="grid w-14 shrink-0 place-items-center rounded-2xl bg-muted py-2 text-center">
                    <span className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">{t.preferredDate.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</span>
                    <span className="font-display text-xl font-semibold">{t.preferredDate.getUTCDate()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link href={`/property/${t.listing.slug}`} className="block truncate text-sm font-semibold hover:underline">{t.listing.streetAddress}</Link>
                    <span className="block text-sm text-muted-foreground">{t.preferredTime} · {t.type === "VIDEO" ? "Video tour" : "In person"}{t.agent ? ` with ${t.agent.name}` : ""}</span>
                  </span>
                  <span className={t.status === "CONFIRMED" ? "rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success" : "rounded-full bg-muted px-2.5 py-1 text-xs font-medium"}>{t.status === "CONFIRMED" ? "Confirmed" : "Requested"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">No tours scheduled. Request one from any listing — in person or by video.</p>
          )}
        </section>

        <section aria-labelledby="ov-activity">
          <SectionTitle id="ov-activity" action={<Button asChild variant="link" className="px-0"><Link href="/account/notifications">All notifications</Link></Button>}>Recent activity</SectionTitle>
          {notifications.length ? (
            <ul className="divide-y rounded-3xl border bg-surface">
              {notifications.map((n) => (
                <li key={n.id} className="p-4">
                  {n.url?.startsWith("/") && !n.url.startsWith("//") ? (
                    <Link href={n.url} className="text-sm font-medium hover:underline">{n.title}</Link>
                  ) : (
                    <p className="text-sm font-medium">{n.title}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(n.createdAt, now)}{!n.readAt && " · New"}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-3xl border border-dashed p-6 text-sm text-muted-foreground">Alerts, price drops and replies will show up here.</p>
          )}
        </section>
      </div>

      {views.length > 0 && (
        <section aria-labelledby="ov-recent" className="mt-10">
          <SectionTitle id="ov-recent" action={<Button asChild variant="link" className="px-0"><Link href="/account/recently-viewed">See all</Link></Button>}>Recently viewed</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {views.map((v) => (
              <ListingCard key={v.listing.id} listing={toCardData(v.listing)} sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 100vw" />
            ))}
          </div>
        </section>
      )}
      {profile && <p className="mt-10 text-xs text-muted-foreground">Member since {formatDate(profile.createdAt)}</p>}
    </>
  );
}
