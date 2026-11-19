import { z } from "zod";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { badRequest, forbidden, readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { getCollectionAccess, newInviteToken } from "@/server/collections";
import { emailLayout, sendEmail } from "@/server/email";

export const runtime = "nodejs";

const Invite = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  role: z.enum(["EDITOR", "VIEWER"]).default("EDITOR"),
  isAgent: z.boolean().optional(),
});

/** Invite a co-shopper (partner, family, or your agent) by email. Owner only; re-inviting resends. */
export const POST = withUser<{ id: string }>(
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const found = await getCollectionAccess(params.id, user.id);
    if (!found) return notFound();
    if (found.access !== "OWNER") return forbidden("Only the owner can invite people");
    const parsed = await readJson(request, Invite, 2_000);
    if (!parsed.ok) return parsed.response;
    const { email, role, isAgent } = parsed.data;
    if (email === user.email?.toLowerCase()) return badRequest("That's your own email — you already own this collection.");

    const existing = await db.collectionMember.findUnique({ where: { collectionId_email: { collectionId: params.id, email } } });
    if (!existing && (await db.collectionMember.count({ where: { collectionId: params.id } })) >= 10) return badRequest("A collection can have up to 10 co-shoppers.");
    const member = existing
      ? await db.collectionMember.update({ where: { id: existing.id }, data: { role, isAgent: isAgent ?? existing.isAgent } })
      : await db.collectionMember.create({ data: { collectionId: params.id, email, role, isAgent: isAgent ?? false, inviteToken: newInviteToken() } });

    if (!member.acceptedAt) {
      const inviter = user.name ?? "A CITI VIEW member";
      const url = `${site.url}/collections/join/${member.inviteToken}`;
      await sendEmail({
        to: email,
        subject: `${inviter} invited you to “${found.collection.name}” on CITI VIEW`,
        html: emailLayout({
          title: `Shop for homes together`,
          intro: `${inviter} invited you to the collection “${found.collection.name}”. Save homes side by side, leave shared notes and plan tours together.`,
          rows: [["Your access", role === "VIEWER" ? "Can view" : "Can add homes and notes"]],
          cta: { label: "Open the collection", url },
          footnote: "Not expecting this? You can ignore this email — nothing happens unless you accept.",
        }),
        text: `${inviter} invited you to "${found.collection.name}" on CITI VIEW: ${url}`,
      });
      const invitee = await db.user.findUnique({ where: { email }, select: { id: true } });
      if (invitee) {
        await db.notification.create({
          data: { userId: invitee.id, type: "COLLECTION", title: `${inviter} invited you to “${found.collection.name}”`, url: `/collections/join/${member.inviteToken}` },
        });
      }
    }
    return Response.json({ ok: true, memberId: member.id, resent: Boolean(existing) });
  },
  { limit: 10, bucket: "collection-invites" },
);
