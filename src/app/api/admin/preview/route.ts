import { z } from "zod";
import { checkFairHousing } from "@/lib/fair-housing";
import { renderMarkdown } from "@/lib/markdown";
import { readJson } from "@/lib/security/request";
import { withRole } from "@/server/api";

export const runtime = "nodejs";

const Body = z.object({ body: z.string().max(60_000) });

/** Server-side render (the same sanitizer the public page uses) so the preview is exactly what ships. */
export const POST = withRole(
  ["ADMIN"],
  async ({ request }) => {
    const body = await readJson(request, Body, 80_000);
    if (!body.ok) return body.response;
    const { html, toc } = renderMarkdown(body.data.body);
    // Articles may quote problem phrases on purpose (e.g. a Fair Housing explainer), so these are advisory.
    return Response.json({ html, toc, fairHousing: checkFairHousing(body.data.body) });
  },
  { limit: 120, bucket: "admin-preview" },
);
