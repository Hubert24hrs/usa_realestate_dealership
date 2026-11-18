import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Monogram avatar — demo agents use initials rather than stock photos of real people. */
export function AgentAvatar({ name, color, size = "md", className }: { name: string; color?: string | null; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const sizes = { sm: "size-9 text-xs", md: "size-12 text-sm", lg: "size-16 text-lg", xl: "size-24 text-2xl" };
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold tracking-wide text-white ring-2 ring-background", sizes[size], className)}
      style={{ background: `linear-gradient(135deg, ${color ?? "#3b3fa8"}, color-mix(in oklch, ${color ?? "#3b3fa8"}, black 25%))` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
