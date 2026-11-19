import { clientIp } from "@/lib/security/rate-limit";
import { hashIp, readJson } from "@/lib/security/request";
import { SignLeaseSchema } from "@/lib/validation/rental";
import { ID_RE, notFound, withUser } from "@/server/api";
import { signLease } from "@/server/rentals";

export const runtime = "nodejs";

/** E-sign: typed legal name + explicit consent; stores signer name, timestamp and a hashed IP. */
export const POST = withUser<{ id: string }>(
  async ({ request, user, params }) => {
    if (!ID_RE.test(params.id)) return notFound();
    const body = await readJson(request, SignLeaseSchema, 2_000);
    if (!body.ok) return body.response;
    const result = await signLease(params.id, user.id, body.data.signatureName, hashIp(clientIp(request.headers)));
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    return Response.json({ ok: true });
  },
  { limit: 10, bucket: "lease-sign" },
);
