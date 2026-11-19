import { readJson } from "@/lib/security/request";
import { FsboSchema } from "@/lib/validation/fsbo";
import { withUser } from "@/server/api";
import { createFsboListing, FsboError } from "@/server/fsbo";

export const runtime = "nodejs";

/** Publish a for-sale-by-owner / for-rent-by-owner listing. */
export const POST = withUser(
  async ({ request, user }) => {
    const body = await readJson(request, FsboSchema, 64_000);
    if (!body.ok) return body.response;
    try {
      const listing = await createFsboListing(user, body.data);
      return Response.json({ slug: listing.slug }, { status: 201 });
    } catch (error) {
      if (error instanceof FsboError) return Response.json({ error: error.message }, { status: error.status });
      throw error;
    }
  },
  { limit: 6, windowMs: 60 * 60_000, bucket: "fsbo-publish" },
);
