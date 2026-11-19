"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BellRing, CalendarCheck, FolderHeart, Heart, History, Home, Inbox, KeyRound, LayoutDashboard, NotebookPen, Settings, type LucideIcon } from "lucide-react";
import { useMe } from "@/hooks/use-me";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: "messages" | "notifications";
}

const ITEMS: Item[] = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/favorites", label: "Saved homes", icon: Heart },
  { href: "/account/collections", label: "Collections", icon: FolderHeart },
  { href: "/account/saved-searches", label: "Saved searches", icon: BellRing },
  { href: "/account/recently-viewed", label: "Recently viewed", icon: History },
  { href: "/account/notes", label: "Notes", icon: NotebookPen },
  { href: "/account/tours", label: "Tours", icon: CalendarCheck },
  { href: "/account/messages", label: "Messages", icon: Inbox, badge: "messages" },
  { href: "/account/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
  { href: "/account/rentals", label: "Rentals", icon: KeyRound },
  { href: "/account/listings", label: "My listings", icon: Home },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export function AccountNav() {
  const pathname = usePathname();
  const { data } = useMe();
  const list = useRef<HTMLUListElement>(null);
  // On phones the nav is a horizontal pill row: keep the current page's pill in view.
  useEffect(() => {
    const row = list.current;
    const current = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !current || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: current.offsetLeft - (row.clientWidth - current.offsetWidth) / 2, behavior: "smooth" });
  }, [pathname]);
  return (
    <nav aria-label="Account" className="-mx-4 mb-6 border-b px-4 sm:-mx-6 sm:px-6 lg:sticky lg:top-24 lg:mx-0 lg:mb-0 lg:self-start lg:border-0 lg:px-0">
      {data?.user && (
        <div className="mb-3 hidden px-3 lg:block">
          <p className="truncate text-sm font-semibold">{data.user.name ?? "Your account"}</p>
          <p className="truncate text-xs text-muted-foreground">{data.user.email}</p>
        </div>
      )}
      <ul ref={list} className="scrollbar-none relative flex gap-1 overflow-x-auto pb-3 lg:flex-col lg:pb-0">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const count = item.badge === "messages" ? data?.unreadMessages ?? 0 : item.badge === "notifications" ? data?.unread ?? 0 : 0;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // `relative` keeps the absolutely-positioned sr-only badge text inside the scrolling row.
                  "relative flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:rounded-xl",
                  active ? "bg-brand-700 text-white dark:bg-brand-500 dark:text-brand-950" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                <span>{item.label}</span>
                {count > 0 && (
                  <span className={cn("ml-auto grid min-w-5 place-items-center rounded-full px-1.5 text-[0.65rem] font-bold", active ? "bg-white/90 text-brand-800" : "bg-copper-500 text-white")}>
                    {count > 9 ? "9+" : count}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
