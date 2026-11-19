import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { ID_RE, notFound, PRO_ROLES, withRole } from "@/server/api";
import { canManageLead, getProScope } from "@/server/pro";

export const runtime = "nodejs";

const Body = z
  .object({
    status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NURTURE", "CLOSED", "LOST"]).optional(),
    note: z.string().trim().max(2_000).optional(),
  })
  .refine((v) => v.status !== undefined || v.note !== undefined, "Nothing to update");

/** Update a lead's pipeline status and the agent's private note. */
export const PATCH = withRole<{ id: string }>(
  PRO_ROLES,
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, Body, 4_000);
    if (!body.ok) return body.response;
    if (!(await canManageLead(await getProScope(user), params.id))) return notFound();
    const lead = await db.lead.findUnique({ where: { id: params.id }, select: { data: true } });
    const data: Prisma.LeadUpdateInput = {};
    if (body.data.status) data.status = body.data.status;
    if (body.data.note !== undefined) {
      const prev = (lead?.data ?? {}) as Record<string, unknown>;
      data.data = { ...prev, agentNote: body.data.note, agentNoteAt: new Date().toISOString() } as Prisma.InputJsonValue;
    }
    await db.lead.update({ where: { id: params.id }, data });
    return Response.json({ ok: true });
  },
  { limit: 120, bucket: "agent-leads" },
);
