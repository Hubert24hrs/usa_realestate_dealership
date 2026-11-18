import { redirect } from "next/navigation";
import { parseFilters } from "@/lib/search/filters";
import { buildSearchHref } from "@/lib/search/verticals";

/** /search?mode=rent&place=austin-tx&… → canonical SEO path. */
export default async function SearchRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(buildSearchHref(parseFilters(await searchParams)));
}
