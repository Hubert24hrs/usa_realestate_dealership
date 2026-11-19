import "server-only";
import type { LeadType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { LEAD_TYPE_LABELS } from "@/lib/domain";
import { formatAddressLine, formatPrice } from "@/lib/format";
import { site } from "@/lib/site";
import { emailLayout, sendEmail } from "./email";
import { findOrCreateConversation } from "./messages";
import { getSettings } from "./settings";

/** Free-text lead types a signed-in sender can follow up on in their inbox. */
const CONVERSATION_TYPES = new Set<LeadType>(["ASK_AGENT", "REQUEST_INFO", "CONTACT_AGENT", "RENTAL_INQUIRY", "OFFER_INTEREST"]);

export interface LeadInput {
  type: LeadType;
  listingId?: string | null;
  agentId?: string | null;
  userId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  data?: Record<string, unknown>;
  source?: string | null;
  citySlug?: string | null;
}

/**
 * Lead routing:
 *  1. explicit agent (agent profile contact) →
 *  2. the listing agent (if accepting leads) →
 *  3. FSBO → the owner (no agent) →
 *  4. weighted round-robin among agents serving the area (Premier ×3, Pro ×2).
 */
export async function routeLead(input: Pick<LeadInput, "agentId" | "listingId" | "citySlug">): Promise<{ agentId: string | null; ownerId: string | null; reason: string }> {
  const settings = await getSettings();
  if (input.agentId) {
    const agent = await db.agent.findUnique({ where: { id: input.agentId }, select: { id: true } });
    if (agent) return { agentId: agent.id, ownerId: null, reason: "Requested agent" };
  }
  let citySlug = input.citySlug ?? null;
  if (input.listingId) {
    const listing = await db.listing.findUnique({ where: { id: input.listingId }, select: { agentId: true, ownerId: true, isFsbo: true, agent: { select: { acceptingLeads: true } }, cityRef: { select: { slug: true } } } });
    if (listing?.isFsbo && listing.ownerId) return { agentId: null, ownerId: listing.ownerId, reason: "For sale by owner — sent to owner" };
    if (listing?.agentId && listing.agent?.acceptingLeads && settings.leadRouting.preferListingAgent) return { agentId: listing.agentId, ownerId: null, reason: "Listing agent" };
    citySlug = listing?.cityRef?.slug ?? citySlug;
  }
  const candidates = await db.agent.findMany({
    where: { acceptingLeads: true, ...(citySlug ? { areasServed: { has: citySlug } } : {}) },
    select: { id: true, leadWeight: true, lastLeadAt: true },
  });
  if (!candidates.length) return { agentId: null, ownerId: null, reason: "No agent available — routed to CITI VIEW concierge" };
  const now = Date.now();
  const weighted = settings.leadRouting.strategy !== "round-robin";
  // Lower score wins: longest since last lead; with weighting, paid plans (leadWeight 2–3) get a head start.
  const pick = candidates
    .map((c) => ({ ...c, score: (c.lastLeadAt?.getTime() ?? 0) - (weighted ? c.leadWeight : 1) * 6 * 3_600_000 }))
    .sort((a, b) => a.score - b.score)[0]!;
  await db.agent.update({ where: { id: pick.id }, data: { lastLeadAt: new Date(now) } });
  return { agentId: pick.id, ownerId: null, reason: weighted ? "Weighted round-robin" : "Round-robin" };
}

export async function createLead(input: LeadInput) {
  const routing = await routeLead(input);
  const listing = input.listingId
    ? await db.listing.findUnique({ where: { id: input.listingId }, select: { id: true, slug: true, streetAddress: true, unit: true, city: true, state: true, zip: true, price: true, transactionType: true } })
    : null;

  const lead = await db.lead.create({
    data: {
      type: input.type,
      listingId: listing?.id ?? null,
      agentId: routing.agentId,
      userId: input.userId ?? null,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      message: input.message ?? null,
      data: (input.data ?? {}) as Prisma.InputJsonValue,
      source: input.source ?? null,
      routingReason: routing.reason,
      assignedAt: routing.agentId ? new Date() : null,
    },
  });

  if (input.type === "TOUR" && listing && input.data?.preferredDate) {
    await db.tourRequest.create({
      data: {
        listingId: listing.id,
        userId: input.userId ?? null,
        agentId: routing.agentId,
        type: input.data.tourType === "VIDEO" ? "VIDEO" : "IN_PERSON",
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        preferredDate: new Date(String(input.data.preferredDate)),
        preferredTime: String(input.data.preferredTime ?? "Flexible"),
        message: input.message ?? null,
      },
    });
  }

  const agent = routing.agentId ? await db.agent.findUnique({ where: { id: routing.agentId }, select: { name: true, email: true, userId: true } }) : null;
  const owner = routing.ownerId ? await db.user.findUnique({ where: { id: routing.ownerId }, select: { email: true, name: true } }) : null;
  const label = LEAD_TYPE_LABELS[input.type] ?? "Inquiry";
  const where = listing ? formatAddressLine(listing) : "CITI VIEW";
  const url = listing ? `${site.url}/property/${listing.slug}` : site.url;
  const rows: Array<[string, string]> = [
    ["From", input.name],
    ["Email", input.email],
    ...(input.phone ? ([["Phone", input.phone]] as Array<[string, string]>) : []),
    ...(listing ? ([["Property", where], ["Price", formatPrice(listing.price)]] as Array<[string, string]>) : []),
    ...Object.entries(input.data ?? {})
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), String(v)] as [string, string]),
  ];

  const recipient = agent?.email ?? owner?.email;
  if (recipient) {
    await sendEmail({
      to: recipient,
      subject: `New ${label.toLowerCase()} — ${where}`,
      html: emailLayout({ title: `New ${label.toLowerCase()}`, intro: `${input.name} sent a ${label.toLowerCase()} through CITI VIEW. Reply within 15 minutes for the best response rate.`, rows, body: input.message ?? undefined, cta: { label: "Open in CITI VIEW", url: `${site.url}/agent/leads` } }),
    });
  }
  await sendEmail({
    to: input.email,
    subject: `We received your ${label.toLowerCase()}`,
    html: emailLayout({
      title: "Thanks — your request is on its way",
      intro: agent ? `${agent.name} will follow up shortly about ${where}.` : owner ? `The owner of ${where} will follow up shortly.` : "A CITI VIEW concierge will follow up shortly.",
      rows: rows.slice(0, 5),
      cta: { label: "View the property", url },
    }),
  });
  if (agent?.userId) {
    await db.notification.create({ data: { userId: agent.userId, type: "LEAD", title: `New ${label.toLowerCase()} from ${input.name}`, body: where, url: "/agent/leads" } });
  }
  // Signed-in senders can follow up in Messages: mirror the question into a conversation with the agent / owner.
  const recipientUserId = agent?.userId ?? routing.ownerId;
  let conversationId: string | null = null;
  if (input.userId && input.message && recipientUserId && recipientUserId !== input.userId && CONVERSATION_TYPES.has(input.type)) {
    const now = new Date();
    const convo = await findOrCreateConversation(input.userId, recipientUserId, { listingId: listing?.id ?? null, subject: listing?.streetAddress ?? label });
    await db.message.create({ data: { conversationId: convo.id, senderId: input.userId, body: input.message } });
    await db.conversation.update({ where: { id: convo.id }, data: { updatedAt: now } });
    await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId: convo.id, userId: input.userId } }, data: { lastReadAt: now } });
    conversationId = convo.id;
  }
  await db.analyticsEvent.create({ data: { type: "lead", listingId: listing?.id ?? null, agentId: routing.agentId, userId: input.userId ?? null, data: { leadType: input.type } } });
  return { lead, routing, agentName: agent?.name ?? (owner ? "the owner" : null), conversationId };
}
