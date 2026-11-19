import type { Metadata } from "next";
import Link from "@/components/app-link";
import { redirect } from "next/navigation";
import { FolderHeart, MailWarning } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { pluralize } from "@/lib/format";
import { requireUser } from "@/server/auth-helpers";
import { INVITE_TOKEN_RE } from "@/server/collections";

export const metadata: Metadata = { title: "Join a collection", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

async function acceptInvite(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  if (!INVITE_TOKEN_RE.test(token)) redirect("/account/collections");
  const user = await requireUser(`/collections/join/${token}`);
  const invite = await db.collectionMember.findUnique({
    where: { inviteToken: token },
    select: { id: true, email: true, acceptedAt: true, collectionId: true, collection: { select: { ownerId: true, name: true } } },
  });
  if (!invite || invite.acceptedAt || invite.email.toLowerCase() !== (user.email ?? "").toLowerCase()) redirect(`/collections/join/${token}`);
  await db.collectionMember.update({ where: { id: invite.id }, data: { userId: user.id, acceptedAt: new Date() } });
  await db.notification.create({
    data: { userId: invite.collection.ownerId, type: "COLLECTION", title: `${user.name ?? user.email} joined “${invite.collection.name}”`, url: `/account/collections/${invite.collectionId}` },
  });
  redirect(`/account/collections/${invite.collectionId}`);
}

async function switchAccount(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const next = INVITE_TOKEN_RE.test(token) ? `/collections/join/${token}` : "/account/collections";
  await signOut({ redirectTo: `/sign-in?callbackUrl=${encodeURIComponent(next)}` });
}

export default async function JoinCollectionPage({ params }: Props) {
  const { token } = await params;
  const user = await requireUser(`/collections/join/${encodeURIComponent(token)}`);
  const invite = INVITE_TOKEN_RE.test(token)
    ? await db.collectionMember.findUnique({
        where: { inviteToken: token },
        include: { collection: { select: { id: true, name: true, description: true, ownerId: true, owner: { select: { name: true } }, _count: { select: { items: true } } } } },
      })
    : null;

  if (invite && (invite.collection.ownerId === user.id || (invite.acceptedAt && invite.userId === user.id))) redirect(`/account/collections/${invite.collection.id}`);

  const emailMatches = invite ? invite.email.toLowerCase() === (user.email ?? "").toLowerCase() : false;

  return (
    <div className="container-page grid min-h-[70dvh] place-items-center py-16">
      <div className="w-full max-w-md rounded-3xl border bg-surface p-7 text-center shadow-[var(--shadow-card)]">
        {!invite || invite.acceptedAt ? (
          <>
            <MailWarning className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <h1 className="mt-4 font-display text-2xl font-semibold">This invitation isn&apos;t available</h1>
            <p className="mt-2 text-sm text-muted-foreground">It may have been revoked or already used. Ask the person who invited you to send a new one.</p>
            <Button asChild className="mt-6"><Link href="/account/collections">Go to your collections</Link></Button>
          </>
        ) : (
          <>
            <FolderHeart className="mx-auto size-10 text-copper-600" aria-hidden />
            <p className="eyebrow mt-4">Co-shopping invitation</p>
            <h1 className="mt-2 font-display text-2xl font-semibold">Join “{invite.collection.name}”</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {invite.collection.owner.name ?? "A CITI VIEW member"} invited you as {invite.role === "VIEWER" ? "a viewer" : "an editor"} · {pluralize(invite.collection._count.items, "home")}
            </p>
            {invite.collection.description && <p className="mt-3 text-sm">{invite.collection.description}</p>}
            {emailMatches ? (
              <form action={acceptInvite} className="mt-6">
                <input type="hidden" name="token" value={token} />
                <Button type="submit" size="lg" className="w-full">Accept invitation</Button>
              </form>
            ) : (
              <div className="mt-6 space-y-3 rounded-2xl border bg-muted/50 p-4 text-left text-sm">
                <p>
                  This invitation was sent to <strong>{maskEmail(invite.email)}</strong>, but you&apos;re signed in as <strong>{user.email}</strong>.
                </p>
                <form action={switchAccount}>
                  <input type="hidden" name="token" value={token} />
                  <Button type="submit" variant="outline" className="w-full">Sign in with the invited email</Button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
