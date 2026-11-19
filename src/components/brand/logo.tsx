import Link from "next/link";
import { cn } from "@/lib/utils";

/** CITI VIEW mark: a skyline framed in a viewfinder, with a copper sun. Original artwork. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <rect x="1" y="1" width="30" height="30" rx="9" className="fill-brand-700 dark:fill-brand-500" />
      <circle cx="21.5" cy="11.5" r="4.6" className="fill-copper-400" />
      <path d="M6 25.5V18h4v-4.5h5V9h4.2v7H22v-2.5h4v12H6Z" className="fill-white" fillOpacity="0.96" />
      <path d="M12 16.5h1.4M12 19h1.4M16.6 12h1.2M16.6 14.6h1.2M16.6 17.2h1.2M23.4 17h1.2M23.4 19.6h1.2" className="stroke-brand-700 dark:stroke-brand-500" strokeWidth="1.2" strokeLinecap="round" />
      <rect x="5" y="25.5" width="22" height="1.6" rx="0.8" className="fill-copper-400" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    // The accessible name is the visible wordmark plus "home" (WCAG 2.5.3 label in name); the icon-only
    // variant has no visible text, so it carries an aria-label instead.
    <Link href="/" className={cn("group inline-flex items-center gap-2.5 rounded-lg", className)} aria-label={compact ? "CITI VIEW Real Estate home" : undefined}>
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-3" />
      {!compact && (
        <span className="flex flex-col leading-none whitespace-nowrap">
          <span className="font-display text-[1.05rem] font-semibold tracking-[0.04em] text-foreground sm:text-[1.15rem]">CITI VIEW</span>{" "}
          <span className="mt-0.5 text-[0.55rem] font-semibold tracking-[0.3em] text-muted-foreground sm:text-[0.58rem] sm:tracking-[0.32em]">REAL ESTATE</span>
          <span className="sr-only"> home</span>
        </span>
      )}
    </Link>
  );
}
