import "server-only";

/**
 * Fixed-window rate limiting. Uses Upstash Redis (REST) when
 * UPSTASH_REDIS_REST_URL/TOKEN are set (works across serverless instances);
 * otherwise an in-memory window per instance (fine for dev / single node).
 */
export interface LimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

const memory = new Map<string, { count: number; reset: number }>();

function memoryLimit(key: string, limit: number, windowMs: number): LimitResult {
  const now = Date.now();
  if (memory.size > 20_000) for (const [k, v] of memory) if (v.reset < now) memory.delete(k);
  const bucket = memory.get(key);
  if (!bucket || bucket.reset < now) {
    memory.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, limit, remaining: limit - 1, resetMs: windowMs };
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit, limit, remaining: Math.max(0, limit - bucket.count), resetMs: bucket.reset - now };
}

async function upstashLimit(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, String(windowMs), "NX"],
      ["PTTL", key],
    ]),
    cache: "no-store",
  });
  if (!res.ok) return memoryLimit(key, limit, windowMs);
  const [incr, , ttl] = (await res.json()) as Array<{ result: number }>;
  const count = incr?.result ?? 1;
  return { ok: count <= limit, limit, remaining: Math.max(0, limit - count), resetMs: Math.max(0, ttl?.result ?? windowMs) };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<LimitResult> {
  const fullKey = `rl:${key}`;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await upstashLimit(fullKey, limit, windowMs);
    } catch {
      return memoryLimit(fullKey, limit, windowMs);
    }
  }
  return memoryLimit(fullKey, limit, windowMs);
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "local";
}

export async function limitRequest(request: Request, bucket: string, limit: number, windowMs: number): Promise<LimitResult> {
  return rateLimit(`${bucket}:${clientIp(request.headers)}`, limit, windowMs);
}

export function rateLimitHeaders(r: LimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "Retry-After": String(Math.ceil(r.resetMs / 1000)),
  };
}

export function tooManyRequests(r: LimitResult): Response {
  return Response.json({ error: "Too many requests — please slow down." }, { status: 429, headers: rateLimitHeaders(r) });
}
