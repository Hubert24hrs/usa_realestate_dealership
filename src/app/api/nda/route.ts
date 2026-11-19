import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, limitRequest, tooManyRequests } from "@/lib/security/rate-limit";
import { forbidden, hashIp, isSameOrigin, readJson } from "@/lib/security/request";
import { getSessionUser } from "@/server/auth-helpers";
import { createLead } from "@/server/leads";
import { ndaCookieName, ndaToken } from "@/server/nda";

export const runtime = "nodejs";

const Body = z.object({
  listingId: z.string().min(10).max(40),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(["Principal", "Broker", "Lender", "Advisor", "Other"]),
  signature: z.string().trim().min(2).max(80),
  accept: z.literal(true),
});

/** Records an NDA e-signature and unlocks the confidential documents for this browser. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const limit = await limitRequest(request, "nda", 10, 600_000);
  if (!limit.ok) return tooManyRequests(limit);
  const body = await readJson(request, Body, 6_000);
  if (!body.ok) return body.response;
  const { listingId, name, email, company, role, signature } = body.data;
  if (signature.toLowerCase() !== name.toLowerCase()) {
    return Response.json({ error: "Type your full name exactly as entered to sign." }, { status: 400 });
  }
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { id: true, ndaRequired: true } });
  if (!listing) return Response.json({ error: "Listing not found" }, { status: 404 });
  const user = await getSessionUser();
  await db.ndaAgreement.create({ data: { listingId, userId: user?.id ?? null, name, email, company: company || null, role, signature, ipHash: hashIp(clientIp(request.headers)) } });
  await createLead({ type: "OM_REQUEST", listingId, userId: user?.id ?? null, name, email, data: { company: company || undefined, role, ndaSigned: "Yes" }, source: "nda" });
  const jar = await cookies();
  jar.set(ndaCookieName(listingId), `${email.toLowerCase()}|${ndaToken(listingId, email)}`, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30, path: "/" });
  return Response.json({ ok: true });
}
