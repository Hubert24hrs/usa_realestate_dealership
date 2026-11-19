"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEARCH_MODES, SEARCH_MODE_LABELS, type SearchMode } from "@/lib/domain";
import { defaultFilters } from "@/lib/search/filters";
import type { Suggestion } from "@/lib/search/types";
import { buildSearchHref } from "@/lib/search/verticals";
import { cn } from "@/lib/utils";
import { AiSearch } from "./ai-search";
import { LocationSearch, fetchSuggestions } from "./location-search";

const PLACEHOLDERS: Record<SearchMode, string> = {
  buy: "City, neighborhood, ZIP, address, school or MLS #",
  rent: "Where do you want to rent? City, neighborhood or ZIP",
  new: "Find new construction by city or ZIP",
  sold: "Sold homes by city, ZIP or address",
  commercial: "Office, retail or industrial space by city or ZIP",
  land: "Land, ranches and farms by county, city or state",
};

export function HeroSearch() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("buy");
  const [ai, setAi] = useState(false);

  const goToSuggestion = (s: Suggestion) => {
    if (s.href) return router.push(s.href);
    router.push(buildSearchHref({ ...defaultFilters(mode), place: s.place }));
  };

  const submitText = async (text: string, first?: Suggestion) => {
    const suggestion = first ?? (await fetchSuggestions(text)).find((s) => s.place);
    if (suggestion) return goToSuggestion(suggestion);
    router.push(buildSearchHref({ ...defaultFilters(mode), q: text }));
  };

  return (
    <div className="w-full max-w-3xl">
      <div className="mb-3 flex flex-wrap items-center gap-1">
        {/* A tablist may only contain tabs, so the plain-English toggle sits beside it. */}
        <div role="tablist" aria-label="Search type" className="flex flex-wrap gap-1">
          {SEARCH_MODES.map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                mode === m ? "bg-primary text-primary-foreground shadow-sm" : "bg-background/70 text-foreground/80 hover:bg-background hover:text-foreground",
              )}
            >
              {SEARCH_MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAi((v) => !v)}
          aria-pressed={ai}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors",
            ai ? "border-copper-400 bg-copper-50 text-copper-800 dark:bg-copper-100 dark:text-copper-800" : "border-transparent bg-background/70 text-foreground/80 hover:bg-background",
          )}
        >
          <Sparkles className="size-4 text-copper-600" aria-hidden /> Ask in plain English
        </button>
      </div>

      <div role="tabpanel" aria-label={`${SEARCH_MODE_LABELS[mode]} search`} className="rounded-2xl border bg-background/95 p-2.5 shadow-[var(--shadow-float)] backdrop-blur">
        {ai ? (
          <AiSearch mode={mode} />
        ) : (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const text = (e.currentTarget.querySelector('input[role="combobox"]') as HTMLInputElement | null)?.value.trim() ?? "";
              if (text) void submitText(text);
              else router.push(buildSearchHref(defaultFilters(mode)));
            }}
          >
            <LocationSearch
              key={mode}
              size="lg"
              placeholder={PLACEHOLDERS[mode]}
              label={`${SEARCH_MODE_LABELS[mode]}: search by location`}
              inputClassName="border-transparent shadow-none"
              onSelect={goToSuggestion}
              onSubmitText={(text, first) => void submitText(text, first)}
            />
            <Button type="submit" size="lg" className="h-14 shrink-0 px-6 text-base">
              <MapPin className="size-4" aria-hidden /> Search
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
