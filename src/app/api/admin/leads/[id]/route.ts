import { z } from "zod";
import { db } from "@/lib/db";
import { badRequest, readJson } from "@/lib/security/request";
import { ID_RE, notFound, withRole } from "@/server/api";

export const runtime = "nodejs";

const Body = z
  .object({
    agentId: z.string().regex(ID_RE).nullable().optional(),
    status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NURTURE", "CLOSED", "LOST"]).optional(),
  })
  .refine((v) => v.agentId !== undefined || v.status !== undefined, "Nothing to update");

/** Reassign a lead (e.g. SLA missed) or change its status. The new agent gets an in-app notification. */
export const PATCH = withRole<{ id: string }>(
  ["ADMIN"],
  async ({ request, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, Body, 1_000);
    if (!body.ok) return body.response;
    const lead = await db.lead.findUnique({ where: { id: params.id }, select: { id: true, agentId: true, name: true, type: true } });
    if (!lead) return notFound();
    const { agentId, status } = body.data;
    const agent = agentId ? await db.agent.findUnique({ where: { id: agentId }, select: { id: true, userId: true, name: true } }) : null;
    if (agentId && !agent) return badRequest("Unknown agent");
    const reassigned = agentId !== undefined && agentId !== lead.agentId;
    await db.lead.update({
      where: { id: lead.id },
      data: {
        ...(status ? { status } : {}),
        ...(reassigned ? { agentId, assignedAt: agentId ? new Date() : null, routingReason: agentId ? "Reassigned by CITI VIEW staff" : "Returned to the concierge queue" } : {}),
      },
    });
    if (reassigned && agent?.userId) {
      await db.notification.create({
        data: { userId: agent.userId, type: "LEAD", title: "New lead assigned to you", body: `${lead.name} — reassigned by CITI VIEW staff.`, url: "/agent/leads" },
      });
    }
    return Response.json({ ok: true });
  },
  { limit: 120, bucket: "admin" },
);
