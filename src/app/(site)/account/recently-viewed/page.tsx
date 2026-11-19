import type { Metadata } from "next";
import Link from "@/components/app-link";
import { History } from "lucide-react";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { ClearHistoryButton } from "@/components/account/settings-forms";
import { ListingCard } from "@/components/listing/listing-card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { requireUser } from "@/server/auth-helpers";
import { cardSelect, toCardData } from "@/server/search/card";

export const metadata: Metadata = { title: "Recently viewed" };

export default async function RecentlyViewedPage() {
  const user = await requireUser("/account/recently-viewed");
  const now = new Date();
  const views = await db.listingView.findMany({ where: { userId: user.id }, orderBy: { viewedAt: "desc" }, take: 48, select: { viewedAt: true, listing: { select: cardSelect(now) } } });
  return (
    <>
      <AccountPageHeader title="Recently viewed" description="Homes you've opened while signed in, newest first. Only you can see this." actions={views.length ? <ClearHistoryButton /> : undefined} />
      {views.length ? (
        <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {views.map((v, i) => (
            <li key={v.listing.id} className="min-w-0">
              <ListingCard listing={toCardData(v.listing)} priority={i < 3} sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw" />
              <p className="mt-2 px-1 text-xs text-muted-foreground">Viewed {timeAgo(v.viewedAt, now)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={History} title="Nothing here yet" action={<Button asChild><Link href="/homes-for-sale">Browse homes</Link></Button>}>
          Listings you open will appear here so you can find them again.
        </EmptyState>
      )}
    </>
  );
}
