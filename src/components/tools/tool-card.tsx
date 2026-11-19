import Link from "@/components/app-link";
import { ArrowRight, BadgeCheck, BookOpen, Calculator, Home, KeyRound, Map, Percent, PiggyBank, Receipt, Scale, TrendingUp, Upload, Wallet } from "lucide-react";
import type { ToolIcon, ToolLink } from "@/lib/content/tools";
import { cn } from "@/lib/utils";

const ICONS: Record<ToolIcon, typeof Calculator> = {
  calculator: Calculator,
  percent: Percent,
  wallet: Wallet,
  receipt: Receipt,
  scale: Scale,
  badge: BadgeCheck,
  piggy: PiggyBank,
  key: KeyRound,
  map: Map,
  trend: TrendingUp,
  home: Home,
  upload: Upload,
  book: BookOpen,
};

export function ToolCard({ tool, compact = false, headingLevel = "h3" }: { tool: ToolLink; compact?: boolean; headingLevel?: "h2" | "h3" }) {
  const Icon = ICONS[tool.icon];
  const H = headingLevel;
  return (
    <Link
      href={tool.href}
      className={cn(
        "group flex h-full gap-3 rounded-2xl border bg-card transition-[box-shadow,border-color] hover:border-primary/40 hover:shadow-[var(--shadow-card)]",
        compact ? "items-center p-3" : "flex-col p-5",
      )}
    >
      <span className={cn("grid shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700", compact ? "size-9" : "size-11")}>
        <Icon className={compact ? "size-4.5" : "size-5"} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <H className="flex items-center gap-1 font-semibold group-hover:text-primary">
          {tool.title}
          {!compact && <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
        </H>
        {!compact && <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>}
      </span>
    </Link>
  );
}
