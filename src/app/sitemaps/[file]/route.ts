import { contentEntries, listingEntries, placeEntries, profileEntries, sitemapFiles, staticEntries, urlsetXml, XML_HEADERS } from "@/server/sitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!(await sitemapFiles()).includes(file)) return new Response("Not found", { status: 404 });
  const listing = /^listings-(\d+)\.xml$/.exec(file);
  const entries = listing
    ? await listingEntries(Number(listing[1]) - 1)
    : file === "pages.xml"
      ? staticEntries()
      : file === "places.xml"
        ? await placeEntries()
        : file === "profiles.xml"
          ? await profileEntries()
          : await contentEntries();
  return new Response(urlsetXml(entries), { headers: XML_HEADERS });
}
