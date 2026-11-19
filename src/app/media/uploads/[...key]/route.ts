import { readLocalObject } from "@/server/storage";

export const runtime = "nodejs";

/** Serves locally stored uploads (UPLOAD_DRIVER=local). Keys are validated against the storage pattern. */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const body = await readLocalObject(key.join("/"));
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
