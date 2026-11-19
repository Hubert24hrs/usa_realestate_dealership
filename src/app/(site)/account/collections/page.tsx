import type { Metadata } from "next";
import Link from "@/components/app-link";
import { FolderHeart, Users } from "lucide-react";
import { NewCollectionButton } from "@/components/account/collection-dialogs";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { ListingImage } from "@/components/media/listing-image";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth-helpers";
import { listCollections } from "@/server/collections";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsPage() {
  const user = await requireUser("/account/collections");
  const collections = await listCollections(user.id);
  const now = new Date();
  return (
    <>
      <AccountPageHeader
        title="Collections"
        description="Group homes into shortlists and shop together. Invite a partner, family or your agent to add homes and leave shared notes."
        actions={<NewCollectionButton />}
      />
      {collections.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((c) => (
            <li key={c.id}>
              <Link href={`/account/collections/${c.id}`} className="group block overflow-hidden rounded-3xl border bg-surface transition-shadow hover:shadow-[var(--shadow-card)]">
                <div className={cn("grid aspect-[16/9] gap-0.5 bg-muted", c.covers.length >= 3 ? "grid-cols-3 grid-rows-2" : c.covers.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
                  {c.covers.length === 0 ? (
                    <span className="grid place-items-center"><FolderHeart className="size-8 text-muted-foreground/60" aria-hidden /></span>
                  ) : (
                    c.covers.slice(0, 3).map((cover, i) => {
                      const lead = c.covers.length >= 3 && i === 0;
                      return (
                        <div key={i} className={cn("relative", lead && "col-span-2 row-span-2")}>
                          <ListingImage src={cover.url} alt="" blurDataUrl={cover.blurDataUrl} color={cover.color} fill sizes={lead || c.covers.length === 1 ? "(min-width: 1280px) 28vw, (min-width: 640px) 45vw, 100vw" : "(min-width: 1280px) 14vw, 45vw"} />
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-base font-semibold group-hover:underline">{c.name}</h2>
                    {c.access !== "OWNER" && <Badge variant="secondary">Shared with you</Badge>}
                  </div>
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                  <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{c.itemCount} {c.itemCount === 1 ? "home" : "homes"}</span>
                    {c.memberCount > 0 && <span className="flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {c.memberCount + 1} people</span>}
                    <span>Updated {timeAgo(c.updatedAt, now)}</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={FolderHeart} title="No collections yet" action={<NewCollectionButton />}>
          Create a collection, then use the “Collections” button on any listing to add homes to it.
        </EmptyState>
      )}
    </>
  );
}
