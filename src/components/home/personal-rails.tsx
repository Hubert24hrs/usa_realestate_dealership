"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { preferenceFromRecent, readRecent, type RecentEntry } from "@/lib/recent";
import { defaultFilters, filtersToQuery } from "@/lib/search/filters";
import type { ListingCardData, SearchResult } from "@/lib/search/types";
import { buildSearchHref } from "@/lib/search/verticals";
import { ListingRail } from "./rail";

/** Recently viewed + "Homes for you" (personalized from browsing history, stored locally). */
export function PersonalRails({ fallback }: { fallback: ListingCardData[] }) {
  const [recent, setRecent] = useState<RecentEntry[] | null>(null);
  useEffect(() => setRecent(readRecent()), []);
  const ids = (recent ?? []).slice(0, 12).map((r) => r.id);
  const pref = recent ? preferenceFromRecent(recent) : null;

  const viewed = useQuery({
    queryKey: ["recent-cards", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => ((await (await fetch(`/api/listings/card?ids=${ids.join(",")}`)).json()) as { listings: ListingCardData[] }).listings,
    staleTime: 60_000,
  });

  const forYouFilters = pref
    ? { ...defaultFilters(pref.mode === "sold" ? "buy" : pref.mode), place: pref.citySlug, price: { min: pref.priceMin, max: pref.priceMax }, bedsMin: pref.bedsMin }
    : null;
  const forYou = useQuery({
    queryKey: ["for-you", JSON.stringify(forYouFilters)],
    enabled: Boolean(forYouFilters),
    queryFn: async () => {
      const q = filtersToQuery(forYouFilters!);
      q.set("mode", forYouFilters!.mode);
      q.set("place", forYouFilters!.place);
      q.set("points", "0");
      const res = (await (await fetch(`/api/search?${q}`)).json()) as SearchResult;
      return res.results.filter((l) => !ids.includes(l.id));
    },
    staleTime: 60_000,
  });

  const forYouList = forYouFilters ? (forYou.data ?? []) : fallback;
  return (
    <>
      <ListingRail
        id="for-you"
        title="Homes for you"
        subtitle={pref ? "Picked from the homes you've been browsing" : "Featured homes across our markets. Browse a few to personalize this row"}
        href={forYouFilters ? buildSearchHref(forYouFilters) : "/homes-for-sale"}
        listings={forYouList}
        loading={Boolean(forYouFilters) && forYou.isLoading}
      />
      {ids.length > 0 && <ListingRail id="recent" title="Recently viewed" subtitle="Pick up where you left off" listings={viewed.data ?? []} loading={viewed.isLoading} />}
    </>
  );
}
