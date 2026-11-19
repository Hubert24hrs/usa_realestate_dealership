import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, forbidden, readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { getCollectionAccess, InviteError, inviteMember } from "@/server/collections";

export const runtime = "nodejs";

const Body = z.object({ collectionId: z.string().regex(ID_RE) });

/** Co-shopping: invite this agent into one of your collections (their email stays server-side). */
export const POST = withUser<{ slug: string }>(
  async ({ request, user, params }) => {
    if (!/^[a-z0-9-]{3,120}$/.test(params.slug)) return notFound();
    const body = await readJson(request, Body, 500);
    if (!body.ok) return body.response;
    const agent = await db.agent.findUnique({ where: { slug: params.slug }, select: { email: true } });
    if (!agent) return notFound();
    const found = await getCollectionAccess(body.data.collectionId, user.id);
    if (!found) return notFound();
    if (found.access !== "OWNER") return forbidden("Only the collection's owner can invite people");
    try {
      const { resent } = await inviteMember({ collection: found.collection, inviter: user, email: agent.email, role: "EDITOR", isAgent: true });
      return Response.json({ ok: true, resent });
    } catch (error) {
      if (error instanceof InviteError) return badRequest(error.message);
      throw error;
    }
  },
  { limit: 10, bucket: "collection-invites" },
);
