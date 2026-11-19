import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { ListingImage } from "@/components/media/listing-image";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { requireUser } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage() {
  const user = await requireUser("/account/notes");
  const now = new Date();
  const notes = await db.note.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      body: true,
      updatedAt: true,
      listing: { select: { slug: true, streetAddress: true, unit: true, city: true, state: true, communityName: true, media: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true, blurDataUrl: true, color: true } } } },
    },
  });
  return (
    <>
      <AccountPageHeader title="Private notes" description="Notes you've kept on listings. Only you can see them — shared notes live in collections." />
      {notes.length ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {notes.map((n) => {
            const cover = n.listing.media[0];
            const title = n.listing.communityName ?? `${n.listing.streetAddress}${n.listing.unit ? ` ${n.listing.unit}` : ""}`;
            return (
              <li key={n.id} className="flex gap-4 rounded-3xl border bg-surface p-4">
                <Link href={`/property/${n.listing.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-muted" tabIndex={-1} aria-hidden>
                  {cover && <ListingImage src={cover.url} alt="" blurDataUrl={cover.blurDataUrl} color={cover.color} fill sizes="80px" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/property/${n.listing.slug}`} className="block truncate text-sm font-semibold hover:underline">{title}</Link>
                  <p className="text-xs text-muted-foreground">{n.listing.city}, {n.listing.state} · edited {timeAgo(n.updatedAt, now)}</p>
                  <p className="mt-2 line-clamp-4 text-sm whitespace-pre-line">{n.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={NotebookPen} title="No notes yet" action={<Button asChild><Link href="/homes-for-sale">Browse homes</Link></Button>}>
          Use “Notes” on a listing page to jot down questions, impressions and things to check at the tour.
        </EmptyState>
      )}
    </>
  );
}
