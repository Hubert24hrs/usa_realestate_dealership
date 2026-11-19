import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, readJson } from "@/lib/security/request";
import { withUser } from "@/server/api";

export const runtime = "nodejs";

const Profile = z.object({
  name: z.string().trim().min(1, "Enter your name").max(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+().\-\s]*$/, "Enter a valid phone number")
    .optional(),
});

export const PATCH = withUser(async ({ request, user }) => {
  const parsed = await readJson(request, Profile, 2_000);
  if (!parsed.ok) return parsed.response;
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, phone: parsed.data.phone || null } });
  return Response.json({ ok: true });
});

const Delete = z.object({ confirm: z.literal("DELETE") });

/**
 * CCPA / GDPR deletion. Personal data is removed (cascades); lead and tour copies that agents
 * already received are anonymised rather than left with the person's contact details.
 */
export const DELETE = withUser(
  async ({ request, user }) => {
    const parsed = await readJson(request, Delete, 1_000);
    if (!parsed.ok) return badRequest('Type "DELETE" to confirm.');
    const record = await db.user.findUnique({ where: { id: user.id }, select: { isDemo: true } });
    if (!record) return Response.json({ ok: true });
    if (record.isDemo) return badRequest("Guest accounts are shared by everyone trying CITI VIEW, so they can't be deleted.");
    const anonymous = { name: "Deleted user", email: "deleted-user@citiview.invalid", phone: null, message: null };
    await db.$transaction([
      db.lead.updateMany({ where: { userId: user.id }, data: anonymous }),
      db.tourRequest.updateMany({ where: { userId: user.id }, data: anonymous }),
      db.user.delete({ where: { id: user.id } }),
    ]);
    return Response.json({ ok: true });
  },
  { limit: 3, bucket: "account-delete" },
);
