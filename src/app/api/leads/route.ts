import { limitRequest, tooManyRequests } from "@/lib/security/rate-limit";
import { forbidden, isSameOrigin, readJson } from "@/lib/security/request";
import { LeadSchema } from "@/lib/validation/lead";
import { getSessionUser } from "@/server/auth-helpers";
import { createLead } from "@/server/leads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const limit = await limitRequest(request, "leads", 8, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const body = await readJson(request, LeadSchema, 16_000);
  if (!body.ok) return body.response;
  const { type, listingId, agentId, name, email, phone, message, website, source, consent: _consent, ...rest } = body.data;
  if (website) return Response.json({ ok: true }); // honeypot: pretend success
  const user = await getSessionUser();
  const result = await createLead({
    type,
    listingId: listingId ?? null,
    agentId: agentId ?? null,
    userId: user?.id ?? null,
    name,
    email,
    phone: phone || null,
    message: message || null,
    data: rest as Record<string, unknown>,
    source: source ?? null,
  });
  return Response.json({ ok: true, leadId: result.lead.id, routedTo: result.agentName, conversationId: result.conversationId });
}
