"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Building, CalendarCheck, FolderHeart, Heart, Inbox, KeyRound, LayoutDashboard, LogOut, Search, Settings, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SIGNED_OUT, useMe } from "@/hooks/use-me";
import { initials } from "@/lib/format";
import { signOutAction } from "@/server/actions/auth";

export function AccountMenu() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useMe();
  const signedOut = Boolean(data && !data.user);
  // Signing in happens in a server action followed by a client-side redirect (no full reload),
  // so re-probe the session after each navigation while we still think the visitor is signed out.
  useEffect(() => {
    if (signedOut) void refetch();
  }, [pathname, signedOut, refetch]);
  if (isLoading) return <span className="ml-1.5 size-9 animate-pulse rounded-full bg-muted" aria-hidden />;
  if (!data?.user) {
    return (
      <Button asChild size="lg" className="ml-1.5 px-4">
        <Link href={`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`}>Sign in</Link>
      </Button>
    );
  }
  const u = data.user;
  const isAgent = u.role === "AGENT" || u.role === "BROKER" || u.role === "PROPERTY_MANAGER";
  return (
    <div className="ml-1 flex items-center gap-0.5">
      <Button variant="ghost" size="icon-lg" asChild className="relative">
        <Link href="/account/notifications" aria-label={data.unread ? `Notifications, ${data.unread} unread` : "Notifications"}>
          <Bell className="size-[1.1rem]" aria-hidden />
          {data.unread > 0 && <span className="absolute top-1.5 right-1.5 grid min-w-4 place-items-center rounded-full bg-copper-700 px-1 text-[0.6rem] font-bold text-white dark:bg-copper-500 dark:text-copper-50">{data.unread > 9 ? "9+" : data.unread}</span>}
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-semibold text-white ring-2 ring-background outline-none focus-visible:ring-ring" aria-label="Account menu">
            {initials(u.name ?? u.email ?? "U")}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-sm font-semibold">{u.name ?? "Your account"}</span>
            <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/account"><LayoutDashboard className="size-4" aria-hidden /> Account overview</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/account/favorites"><Heart className="size-4" aria-hidden /> Saved homes</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/account/collections"><FolderHeart className="size-4" aria-hidden /> Collections</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/account/saved-searches"><Search className="size-4" aria-hidden /> Saved searches</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/account/tours"><CalendarCheck className="size-4" aria-hidden /> Tours</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/account/messages"><Inbox className="size-4" aria-hidden /> Messages</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/account/rentals"><KeyRound className="size-4" aria-hidden /> Rentals & applications</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/account/settings"><Settings className="size-4" aria-hidden /> Settings</Link></DropdownMenuItem>
          {(isAgent || u.role === "ADMIN") && <DropdownMenuSeparator />}
          {(isAgent || u.role === "ADMIN") && <DropdownMenuItem asChild><Link href="/agent"><Building className="size-4" aria-hidden /> {u.role === "PROPERTY_MANAGER" ? "Manager dashboard" : "Agent dashboard"}</Link></DropdownMenuItem>}
          {u.role === "ADMIN" && <DropdownMenuItem asChild><Link href="/admin"><ShieldCheck className="size-4" aria-hidden /> Admin</Link></DropdownMenuItem>}
          <DropdownMenuSeparator />
          <form action={signOutAction} onSubmit={() => qc.setQueryData(["me"], SIGNED_OUT)}>
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full"><LogOut className="size-4" aria-hidden /> Sign out</button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export { useMe };
