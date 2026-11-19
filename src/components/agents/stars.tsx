import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Five-star display; the numeric rating is always in the text, the stars are decoration. */
export function Stars({ rating, className, size = "sm" }: { rating: number; className?: string; size?: "sm" | "md" }) {
  const px = size === "md" ? "size-4.5" : "size-3.5";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className={cn("relative inline-block", px)} aria-hidden>
            <Star className={cn("absolute inset-0 text-muted-foreground/30", px)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("fill-copper-500 text-copper-500", px)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
