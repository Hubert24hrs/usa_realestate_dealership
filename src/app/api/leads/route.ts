import { db } from "@/lib/db";
import { limitRequest, tooManyRequests } from "@/lib/security/rate-limit";
import { forbidden, isSameOrigin, readJson } from "@/lib/security/request";
import { LeadSchema } from "@/lib/validation/lead";
import { getSessionUser } from "@/server/auth-helpers";
import { getLenderPartner, type PreapprovalReceipt } from "@/server/lenders";
import { createLead } from "@/server/leads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const limit = await limitRequest(request, "leads", 8, 60_000);
  if (!limit.ok) return tooManyRequests(limit);
  const body = await readJson(request, LeadSchema, 16_000);
  if (!body.ok) return body.response;
  const { type, listingId, agentId, name, email, phone, message, website, source, citySlug, consent: _consent, ...rest } = body.data;
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
    citySlug: citySlug ?? null,
  });

  // Pre-approval requests are also forwarded to the partner lender; keep its reference on the lead.
  let partner: PreapprovalReceipt | null = null;
  if (body.data.type === "PREAPPROVAL") {
    const d = body.data;
    partner = await getLenderPartner().submit({ leadId: result.lead.id, name, email, phone: phone || null, annualIncome: d.annualIncome, purchasePrice: d.purchasePrice, downPayment: d.downPayment, creditRange: d.creditRange, timeline: message || null });
    await db.lead.update({
      where: { id: result.lead.id },
      data: { data: { ...(rest as Record<string, string | number>), partner: { id: partner.partnerId, name: partner.partnerName, reference: partner.reference, submittedAt: new Date().toISOString() } } },
    });
  }
  return Response.json({ ok: true, leadId: result.lead.id, routedTo: result.agentName, conversationId: result.conversationId, partner });
}
