"use client";

import { useEffect, useRef } from "react";
import Link from "@/components/app-link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Flag,
  Home,
  Inbox,
  LayoutDashboard,
  MapPinned,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Icon keys (serializable) so server layouts can configure the nav. */
const ICONS = {
  overview: LayoutDashboard,
  leads: Inbox,
  listings: Home,
  tours: CalendarCheck,
  applications: ClipboardList,
  billing: CreditCard,
  import: FileSpreadsheet,
  agents: Users,
  content: FileText,
  places: MapPinned,
  reports: Flag,
  settings: Settings,
  analytics: BarChart3,
  orgs: Building2,
} satisfies Record<string, LucideIcon>;
export type SideNavIcon = keyof typeof ICONS;

export interface SideNavItem {
  href: string;
  label: string;
  icon: SideNavIcon;
  exact?: boolean;
  count?: number;
}

export function SideNav({ label, items, title, subtitle }: { label: string; items: SideNavItem[]; title?: string; subtitle?: string }) {
  const pathname = usePathname();
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const row = list.current;
    const current = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !current || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2, behavior: "smooth" });
  }, [pathname]);
  return (
    <nav aria-label={label} className="-mx-4 mb-6 border-b px-4 sm:-mx-6 sm:px-6 lg:sticky lg:top-24 lg:mx-0 lg:mb-0 lg:self-start lg:border-0 lg:px-0">
      {title && (
        <div className="mb-3 hidden px-3 lg:block">
          <p className="truncate text-sm font-semibold">{title}</p>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <ul ref={list} className="scrollbar-none relative flex gap-1 overflow-x-auto pb-3 lg:flex-col lg:pb-0">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-xl",
                  active ? "bg-brand-700 text-white dark:bg-brand-500 dark:text-brand-50" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span>{item.label}</span>
                {item.count ? (
                  <span className={cn("ml-auto grid min-w-5 place-items-center rounded-full px-1.5 text-[0.65rem] font-bold", active ? "bg-white/90 text-brand-800" : "bg-copper-700 text-white dark:bg-copper-500 dark:text-copper-50")}>
                    {item.count > 99 ? "99+" : item.count}
                    <span className="sr-only"> pending</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
