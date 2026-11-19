import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { readJson } from "@/lib/security/request";
import { SettingUpdateSchema } from "@/lib/validation/admin";
import { notFound, withRole } from "@/server/api";
import { SETTINGS_TAG } from "@/server/settings";

export const runtime = "nodejs";

/** Compliance copy, brokerage of record, lead routing and per-state notices. */
export const PUT = withRole(
  ["ADMIN"],
  async ({ request }) => {
    const body = await readJson(request, SettingUpdateSchema, 16_000);
    if (!body.ok) return body.response;
    const s = body.data;
    if (s.key === "state.notice") {
      if (!(await db.state.count({ where: { code: s.code } }))) return notFound();
      await db.state.update({ where: { code: s.code }, data: { notice: s.value || null } });
    } else {
      await db.siteSetting.upsert({ where: { key: s.key }, create: { key: s.key, value: s.value }, update: { value: s.value } });
    }
    revalidateTag(SETTINGS_TAG);
    return Response.json({ ok: true });
  },
  { limit: 60, bucket: "admin" },
);
