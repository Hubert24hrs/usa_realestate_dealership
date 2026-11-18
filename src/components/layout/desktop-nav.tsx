"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import type { NavItem } from "@/lib/site";
import { cn } from "@/lib/utils";

export function DesktopNav({ items, className }: { items: Array<NavItem & { children?: NavItem[] }>; className?: string }) {
  const pathname = usePathname();
  return (
    <NavigationMenu className={className} aria-label="Primary">
      <NavigationMenuList className="gap-0.5">
        {items.map((item) =>
          item.children ? (
            <NavigationMenuItem key={item.label}>
              <NavigationMenuTrigger className="h-9 bg-transparent px-3 text-[0.9rem] font-medium">{item.label}</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid w-[min(92vw,560px)] grid-cols-2 gap-1 p-2">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <NavigationMenuLink asChild>
                        <Link href={child.href} className="block rounded-xl p-3 transition-colors hover:bg-accent focus-visible:bg-accent">
                          <span className="block text-sm font-semibold text-foreground">{child.label}</span>
                          {child.description && <span className="mt-0.5 block text-xs text-muted-foreground">{child.description}</span>}
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={item.label}>
              <NavigationMenuLink asChild active={pathname.startsWith(item.href)}>
                <Link href={item.href} className={cn(navigationMenuTriggerStyle(), "h-9 bg-transparent px-3 text-[0.9rem] font-medium")}>
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ),
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
