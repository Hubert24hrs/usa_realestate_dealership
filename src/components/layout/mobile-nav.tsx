"use client";

import { useState } from "react";
import Link from "@/components/app-link";
import { Menu } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LogoMark } from "@/components/brand/logo";
import type { NavItem } from "@/lib/site";

export function MobileNav({ items }: { items: Array<NavItem & { children?: NavItem[] }> }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="xl:hidden" aria-label="Open menu">
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 font-display text-lg">
            <LogoMark className="size-7" /> CITI VIEW
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="px-3 py-2">
          <Accordion type="multiple" className="w-full">
            {items.map((item) =>
              item.children ? (
                <AccordionItem key={item.label} value={item.label} className="border-b-0">
                  <AccordionTrigger className="rounded-lg px-3 py-3 text-base font-semibold hover:bg-accent hover:no-underline">{item.label}</AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <ul className="space-y-0.5 pl-2">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link href={child.href} onClick={close} className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <Link key={item.label} href={item.href} onClick={close} className="block rounded-lg px-3 py-3 text-base font-semibold hover:bg-accent">
                  {item.label}
                </Link>
              ),
            )}
          </Accordion>
          <div className="mt-4 grid gap-2 border-t px-2 pt-4 pb-6">
            <Button asChild size="lg" onClick={close}>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="lg" variant="outline" onClick={close}>
              <Link href="/sell/post">Post a listing</Link>
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
