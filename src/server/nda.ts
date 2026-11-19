import "server-only";
import { createHmac } from "node:crypto";

/** HMAC token proving this browser signed the NDA for a listing (stored in an httpOnly cookie). */
export function ndaToken(listingId: string, email: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "citiview-dev").update(`nda:${listingId}:${email.toLowerCase()}`).digest("hex").slice(0, 40);
}

export const ndaCookieName = (listingId: string) => `cv_nda_${listingId}`;
