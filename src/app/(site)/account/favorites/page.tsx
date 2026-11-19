import type { Metadata } from "next";
import Link from "next/link";
import { FolderHeart, Heart } from "lucide-react";
import { AddToCollectionButton } from "@/components/account/collection-dialogs";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { ListingCard } from "@/components/listing/listing-card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth-helpers";
import { cardSelect, toCardData } from "@/server/search/card";

export const metadata: Metadata = { title: "Saved homes" };

const SORTS = {
  saved: "Recently saved",
  "price-asc": "Price (low to high)",
  "price-desc": "Price (high to low)",
  reduced: "Price drops first",
} as const;
type Sort = keyof typeof SORTS;

type Props = { searchParams: Promise<{ sort?: string }> };

export default async function FavoritesPage({ searchParams }: Props) {
  const user = await requireUser("/account/favorites");
  const { sort: rawSort } = await searchParams;
  const sort: Sort = rawSort && rawSort in SORTS ? (rawSort as Sort) : "saved";
  const now = new Date();
  const [rows, collectionCount] = await Promise.all([
    db.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200, select: { createdAt: true, listing: { select: cardSelect(now) } } }),
    db.collection.count({ where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id, acceptedAt: { not: null } } } }] } }),
  ]);
  const items = rows.map((r) => ({ saved: r.createdAt, listing: toCardData(r.listing) }));
  if (sort === "price-asc") items.sort((a, b) => a.listing.price - b.listing.price);
  if (sort === "price-desc") items.sort((a, b) => b.listing.price - a.listing.price);
  if (sort === "reduced") items.sort((a, b) => Number(Boolean(b.listing.priceReduction)) - Number(Boolean(a.listing.priceReduction)));
  const drops = items.filter((i) => i.listing.priceReduction && i.listing.priceReducedAt && new Date(i.listing.priceReducedAt) > i.saved).length;

  return (
    <>
      <AccountPageHeader
        title="Saved homes"
        description={items.length ? `${items.length} ${items.length === 1 ? "home" : "homes"}${drops ? ` · ${drops} with a price drop since you saved` : ""}. We'll email you when prices change.` : undefined}
        actions={
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/account/collections"><FolderHeart className="size-4" aria-hidden /> Collections ({collectionCount})</Link>
          </Button>
        }
      />
      {items.length ? (
        <>
          <nav aria-label="Sort saved homes" className="mb-5 flex flex-wrap gap-1.5">
            {(Object.keys(SORTS) as Sort[]).map((key) => (
              <Link
                key={key}
                href={key === "saved" ? "/account/favorites" : `/account/favorites?sort=${key}`}
                aria-current={sort === key ? "true" : undefined}
                className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", sort === key ? "border-transparent bg-ink text-background" : "hover:bg-muted")}
              >
                {SORTS[key]}
              </Link>
            ))}
          </nav>
          <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(({ listing, saved }, i) => (
              <li key={listing.id} className="min-w-0">
                <ListingCard listing={listing} priority={i < 3} sizes="(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw" />
                <div className="mt-2 flex items-center justify-between gap-2 px-1">
                  <span className="text-xs text-muted-foreground">Saved {formatShortDate(saved)}</span>
                  <AddToCollectionButton listingId={listing.id} variant="ghost" size="sm" label="Add to collection" />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState icon={Heart} title="No saved homes yet" action={<Button asChild><Link href="/homes-for-sale">Start browsing</Link></Button>}>
          Tap the heart on any listing to save it. Saved homes sync across your devices and power price-drop alerts.
        </EmptyState>
      )}
    </>
  );
}
