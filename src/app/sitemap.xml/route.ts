import { indexXml, sitemapFiles, XML_HEADERS } from "@/server/sitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sitemap index: points crawlers at the per-type sitemaps under /sitemaps/. */
export async function GET() {
  return new Response(indexXml(await sitemapFiles()), { headers: XML_HEADERS });
}
