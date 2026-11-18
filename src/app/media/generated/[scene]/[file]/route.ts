import { isSceneKey, renderScene } from "@/lib/media/art";

export const runtime = "nodejs";

/** Serves CITI VIEW's generated illustrations as immutable, cacheable SVG. */
export async function GET(request: Request, { params }: { params: Promise<{ scene: string; file: string }> }) {
  const { scene, file } = await params;
  const seed = file.replace(/\.svg$/i, "");
  if (!isSceneKey(scene) || !/^[a-z0-9-]{1,64}$/.test(seed)) {
    return new Response("Not found", { status: 404 });
  }
  const search = new URL(request.url).searchParams;
  const svg = renderScene(scene, seed, Object.fromEntries(search.entries()));
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
