import Link from "@/components/app-link";
import { Heart } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { primaryNav } from "@/lib/site";
import { AccountMenu } from "./account-menu";
import { DesktopNav } from "./desktop-nav";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ accountSlot }: { accountSlot?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center gap-2 lg:gap-4">
        <MobileNav items={primaryNav} />
        <Logo />
        <DesktopNav items={primaryNav} className="ml-4 hidden xl:flex" />
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon-lg" asChild>
            <Link href="/account/favorites" aria-label="Saved homes">
              <Heart className="size-[1.1rem]" aria-hidden />
            </Link>
          </Button>
          <ThemeToggle />
          {accountSlot ?? <AccountMenu />}
        </div>
      </div>
    </header>
  );
}
