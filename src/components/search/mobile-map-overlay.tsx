"use client";

import { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import { ListingCard } from "@/components/listing/listing-card";
import type { SearchResult } from "@/lib/search/types";
import { cn } from "@/lib/utils";

/**
 * Phone map view: full-screen map with a results sheet that slides between a peek strip and 62%
 * of the screen. Loaded on demand (only when someone taps "Map"), so the map and Framer Motion
 * stay off the search page's start-up path.
 */
export function MobileMapOverlay({ map, result, plural, onHover }: { map: React.ReactNode; result: SearchResult; plural: string; onHover: (id: string | null) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-20 md:hidden">
      {map}
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0, height: expanded ? "62%" : "11.5rem" }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="absolute inset-x-0 bottom-0 z-10 rounded-t-3xl border-t bg-background shadow-[var(--shadow-float)]"
        >
          <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full flex-col items-center gap-1 pt-2.5 pb-2" aria-expanded={expanded} aria-label={expanded ? "Collapse results" : "Expand results"}>
            <span className="h-1.5 w-10 rounded-full bg-border" aria-hidden />
            <span className="text-sm font-semibold">
              {result.total.toLocaleString("en-US")} {plural}
            </span>
          </button>
          <ul className={cn("gap-3 px-4 pb-20", expanded ? "grid h-[calc(100%-3.5rem)] overflow-y-auto" : "snap-carousel")}>
            {result.results.map((l) => (
              <li key={l.id} className={expanded ? "" : "w-[78vw] shrink-0 snap-center"}>
                <ListingCard listing={l} onHover={onHover} variant={expanded ? "grid" : "rail"} />
              </li>
            ))}
          </ul>
        </motion.div>
      </MotionConfig>
    </div>
  );
}
