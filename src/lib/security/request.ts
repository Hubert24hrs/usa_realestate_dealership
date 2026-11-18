import "server-only";
import { createHash } from "node:crypto";
import type { ZodType } from "zod";

/**
 * CSRF defence for route handlers: state-changing requests must come from our
 * own origin (Origin header, or Sec-Fetch-Site for same-origin navigations).
 * Server Actions get the same protection from Next.js automatically.
 */
export function isSameOrigin(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return true;
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") === "same-origin";
}

export function forbidden(message = "Forbidden"): Response {
  return Response.json({ error: message }, { status: 403 });
}

export function badRequest(message: string, issues?: unknown): Response {
  return Response.json({ error: message, issues }, { status: 400 });
}

/** Parse + validate a JSON body (size-capped) against a Zod schema. */
export async function readJson<T>(request: Request, schema: ZodType<T>, maxBytes = 64_000): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) return { ok: false, response: badRequest("Request too large") };
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return { ok: false, response: badRequest("Request too large") };
    body = text ? JSON.parse(text) : {};
  } catch {
    return { ok: false, response: badRequest("Invalid JSON") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, response: badRequest("Invalid input", parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))) };
  return { ok: true, data: parsed.data };
}

/** One-way hash for storing IPs (e-sign / NDA audit trails) without keeping the raw address. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? "citiview"}:${ip}`).digest("hex").slice(0, 32);
}
