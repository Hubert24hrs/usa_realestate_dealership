import { z } from "zod";
import { badRequest, forbidden, readJson } from "@/lib/security/request";
import { ID_RE, notFound, withUser } from "@/server/api";
import { getCollectionAccess, InviteError, inviteMember } from "@/server/collections";

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
    try {
      const { member, resent } = await inviteMember({ collection: found.collection, inviter: user, ...parsed.data });
      return Response.json({ ok: true, memberId: member.id, resent });
    } catch (error) {
      if (error instanceof InviteError) return badRequest(error.message);
      throw error;
    }
  },
  { limit: 10, bucket: "collection-invites" },
);
