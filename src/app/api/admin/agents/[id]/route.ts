import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { ID_RE, notFound, withRole } from "@/server/api";

export const runtime = "nodejs";

const Body = z
  .object({
    plan: z.enum(["FREE", "PRO", "PREMIER"]).optional(),
    acceptingLeads: z.boolean().optional(),
    leadWeight: z.number().int().min(0).max(10).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to update");

const WEIGHT = { FREE: 1, PRO: 2, PREMIER: 3 } as const;

/** Lead-routing controls. A plan change made here is a comp/override — billing is untouched. */
export const PATCH = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ request, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, Body, 1_000);
    if (!body.ok) return body.response;
    const agent = await db.agent.findUnique({ where: { id: params.id }, select: { id: true, slug: true } });
    if (!agent) return notFound();
    const { plan, acceptingLeads, leadWeight } = body.data;
    await db.agent.update({
      where: { id: agent.id },
      data: {
        ...(plan ? { plan, leadWeight: leadWeight ?? WEIGHT[plan] } : {}),
        ...(leadWeight !== undefined ? { leadWeight } : {}),
        ...(acceptingLeads !== undefined ? { acceptingLeads } : {}),
      },
    });
    revalidatePath("/agents");
    revalidatePath(`/agents/${agent.slug}`);
    return Response.json({ ok: true });
  },
  { limit: 120, bucket: "admin" },
);
