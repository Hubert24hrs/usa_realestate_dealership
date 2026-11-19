import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { SessionUser } from "./auth-helpers";

/**
 * What a professional user can see: their agent profile's listings/leads, their organization's
 * listings (property managers, brokers) — or everything for admins.
 */
export interface ProScope {
  userId: string;
  isAdmin: boolean;
  agent: { id: string; name: string; slug: string; plan: "FREE" | "PRO" | "PREMIER"; organizationId: string | null; acceptingLeads: boolean } | null;
  organization: { id: string; name: string; slug: string; type: "BROKERAGE" | "PROPERTY_MANAGEMENT" } | null;
}

export const getProScope = cache(async (user: SessionUser): Promise<ProScope> => {
  const u = await db.user.findUnique({
    where: { id: user.id },
    select: {
      organization: { select: { id: true, name: true, slug: true, type: true } },
      agent: { select: { id: true, name: true, slug: true, plan: true, organizationId: true, acceptingLeads: true } },
    },
  });
  return { userId: user.id, isAdmin: user.role === "ADMIN", agent: u?.agent ?? null, organization: u?.organization ?? null };
});

const NONE = "__none__";

export function listingScope(s: ProScope): Prisma.ListingWhereInput {
  const or: Prisma.ListingWhereInput[] = [];
  if (s.agent) or.push({ agentId: s.agent.id });
  // Organization members see the company's listings, whether linked directly or via its agents.
  if (s.organization) or.push({ organizationId: s.organization.id }, { agent: { organizationId: s.organization.id } });
  if (or.length) return { OR: or };
  return s.isAdmin ? {} : { id: NONE };
}

export function leadScope(s: ProScope): Prisma.LeadWhereInput {
  const or: Prisma.LeadWhereInput[] = [];
  if (s.agent) or.push({ agentId: s.agent.id });
  if (s.organization) or.push({ listing: { organizationId: s.organization.id } }, { agent: { organizationId: s.organization.id } });
  if (or.length) return { OR: or };
  return s.isAdmin ? {} : { id: NONE };
}

export function tourScope(s: ProScope): Prisma.TourRequestWhereInput {
  const or: Prisma.TourRequestWhereInput[] = [];
  if (s.agent) or.push({ agentId: s.agent.id });
  if (s.organization) or.push({ listing: { organizationId: s.organization.id } }, { agent: { organizationId: s.organization.id } });
  if (or.length) return { OR: or };
  return s.isAdmin ? {} : { id: NONE };
}

export const applicationScope = (s: ProScope): Prisma.RentalApplicationWhereInput => ({ listing: listingScope(s) });

/** Ownership checks for single records. */
export async function canManageListing(s: ProScope, listingId: string) {
  if (s.isAdmin) return true;
  return (await db.listing.count({ where: { id: listingId, ...listingScope(s) } })) > 0;
}
export async function canManageLead(s: ProScope, leadId: string) {
  if (s.isAdmin) return true;
  return (await db.lead.count({ where: { id: leadId, ...leadScope(s) } })) > 0;
}
