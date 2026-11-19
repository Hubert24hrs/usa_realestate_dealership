import { badRequest } from "@/lib/security/request";
import { withUser } from "@/server/api";
import { MAX_UPLOAD_BYTES, storeImageUpload, UploadError } from "@/server/uploads";

export const runtime = "nodejs";

/** Authenticated, same-origin, rate-limited single-image upload (multipart field "file"). */
export const POST = withUser(
  async ({ request, user }) => {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > MAX_UPLOAD_BYTES + 64_000) return Response.json({ error: "Photos must be 10 MB or smaller." }, { status: 413 });
    if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) return badRequest("Expected a file upload");
    let file: FormDataEntryValue | null;
    try {
      file = (await request.formData()).get("file");
    } catch {
      return badRequest("Couldn't read the upload");
    }
    if (!(file instanceof File)) return badRequest("Attach a photo in the “file” field");
    try {
      const image = await storeImageUpload(file, user.id);
      return Response.json(image, { status: 201 });
    } catch (error) {
      if (error instanceof UploadError) return Response.json({ error: error.message }, { status: error.status });
      throw error;
    }
  },
  { limit: 40, windowMs: 60_000, bucket: "uploads" },
);
