import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FolderHeart } from "lucide-react";
import { CollectionItemNote, CollectionMembers, CollectionSettings, type MemberRow } from "@/components/account/collection-manage";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { ListingCard } from "@/components/listing/listing-card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { ID_RE } from "@/server/api";
import { requireUser } from "@/server/auth-helpers";
import { canEdit, getCollectionAccess } from "@/server/collections";
import { cardSelect, toCardData } from "@/server/search/card";

export const metadata: Metadata = { title: "Collection" };

type Props = { params: Promise<{ id: string }> };

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/account/collections/${id}`);
  if (!ID_RE.test(id)) notFound();
  const found = await getCollectionAccess(id, user.id);
  if (!found) notFound();
  const now = new Date();
  const collection = await db.collection.findUnique({
    where: { id },
    select: {
      name: true,
      description: true,
      owner: { select: { name: true, email: true } },
      members: { orderBy: { createdAt: "asc" }, select: { id: true, email: true, role: true, isAgent: true, acceptedAt: true, userId: true, user: { select: { name: true } } } },
      items: { orderBy: { createdAt: "desc" }, select: { sharedNote: true, addedById: true, listing: { select: cardSelect(now) } } },
    },
  });
  if (!collection) notFound();

  const isOwner = found.access === "OWNER";
  const editable = canEdit(found.access);
  const adderIds = [...new Set(collection.items.flatMap((i) => (i.addedById ? [i.addedById] : [])))];
  const adders = new Map((await db.user.findMany({ where: { id: { in: adderIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const members: MemberRow[] = collection.members.map((m) => ({
    id: m.id,
    // Owners see who they invited; co-shoppers see names, not each other's email addresses.
    label: m.user?.name ?? (isOwner ? m.email : "Invited co-shopper"),
    sublabel: isOwner ? m.email : null,
    role: m.role === "VIEWER" ? "VIEWER" : "EDITOR",
    isAgent: m.isAgent,
    accepted: Boolean(m.acceptedAt),
  }));
  const myMemberId = collection.members.find((m) => m.userId === user.id)?.id ?? null;

  return (
    <>
      <Link href="/account/collections" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden /> All collections
      </Link>
      <AccountPageHeader
        title={collection.name}
        description={
          <>
            {collection.description && <span className="block">{collection.description}</span>}
            <span>
              {collection.items.length} {collection.items.length === 1 ? "home" : "homes"} · {isOwner ? "You own this collection" : `Shared by ${collection.owner.name ?? "a co-shopper"}`}
              {!editable && " · View only"}
            </span>
          </>
        }
        actions={<CollectionSettings id={id} name={collection.name} description={collection.description} isOwner={isOwner} myMemberId={myMemberId} />}
      />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {collection.items.length ? (
            <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
              {collection.items.map((item, i) => (
                <li key={item.listing.id} className="min-w-0">
                  <ListingCard listing={toCardData(item.listing)} priority={i < 2} sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw" />
                  <CollectionItemNote
                    collectionId={id}
                    listingId={item.listing.id}
                    note={item.sharedNote}
                    canEdit={editable}
                    addedBy={item.addedById ? (item.addedById === user.id ? "you" : adders.get(item.addedById) ?? null) : null}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={FolderHeart} title="This collection is empty" action={<Button asChild><Link href="/homes-for-sale">Find homes to add</Link></Button>}>
              Open any listing and use the “Collections” button to add it here.
            </EmptyState>
          )}
        </div>
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <CollectionMembers collectionId={id} isOwner={isOwner} ownerName={collection.owner.name ?? collection.owner.email ?? "Owner"} members={members} />
        </aside>
      </div>
    </>
  );
}
