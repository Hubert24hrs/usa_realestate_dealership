import "server-only";
import { limitRequest, tooManyRequests } from "@/lib/security/rate-limit";
import { forbidden, isSameOrigin } from "@/lib/security/request";
import { getSessionUser, type SessionUser, unauthorized } from "./auth-helpers";

type Ctx<P> = { params: Promise<P> };

/**
 * Route-handler wrapper for signed-in APIs: same-origin check on mutations (CSRF),
 * per-user rate limit, and a resolved session user.
 */
export function withUser<P = Record<string, string>>(
  handler: (args: { request: Request; user: SessionUser; params: P }) => Promise<Response>,
  opts: { limit?: number; windowMs?: number; bucket?: string } = {},
) {
  return async (request: Request, ctx: Ctx<P>) => {
    if (!isSameOrigin(request)) return forbidden();
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (request.method !== "GET") {
      const limit = await limitRequest(request, `${opts.bucket ?? "user-api"}:${user.id}`, opts.limit ?? 60, opts.windowMs ?? 60_000);
      if (!limit.ok) return tooManyRequests(limit);
    }
    return handler({ request, user, params: ctx?.params ? await ctx.params : ({} as P) });
  };
}

export const ID_RE = /^[a-z0-9]{10,40}$/i;
export const notFound = () => Response.json({ error: "Not found" }, { status: 404 });
