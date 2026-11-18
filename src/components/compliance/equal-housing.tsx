import { cn } from "@/lib/utils";

/** Equal Housing Opportunity mark (HUD fair-housing advertising logo). */
export function EqualHousingLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-10", className)} role="img" aria-label="Equal Housing Opportunity">
      <title>Equal Housing Opportunity</title>
      <path d="M32 6 4 26h6v26h44V26h6L32 6Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <rect x="20" y="30" width="24" height="5" fill="currentColor" />
      <rect x="20" y="40" width="24" height="5" fill="currentColor" />
      <text x="32" y="61.5" textAnchor="middle" fontSize="6.4" fontWeight="700" fill="currentColor" fontFamily="ui-sans-serif, system-ui">
        EQUAL HOUSING
      </text>
    </svg>
  );
}

export function EqualHousingStatement({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <EqualHousingLogo className="size-11 shrink-0 text-foreground/80" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        <strong className="font-semibold text-foreground">Equal Housing Opportunity.</strong> {text}
      </p>
    </div>
  );
}
