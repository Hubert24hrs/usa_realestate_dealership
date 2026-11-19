import type { Badge } from "@/lib/listing-format";

/** Badge colors shared by the interactive and server-rendered listing cards (contrast-checked). */
export const TONES: Record<Badge["tone"], string> = {
  brand: "bg-brand-700 text-white dark:bg-brand-500 dark:text-brand-50",
  copper: "bg-copper-700 text-white dark:bg-copper-500 dark:text-copper-50",
  success: "bg-success text-success-foreground",
  neutral: "bg-white/95 text-ink dark:bg-black/70 dark:text-white",
  warning: "bg-warning text-warning-foreground",
  ink: "bg-ink text-background",
};

export const CARD_CLASS =
  "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-200 hover:shadow-[var(--shadow-raised)]";
export const RAIL_CARD_CLASS = "w-[78vw] shrink-0 snap-start sm:w-[300px]";
