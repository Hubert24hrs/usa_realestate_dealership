"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-lg" aria-label="Change color theme">
          <Sun className="size-[1.1rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" aria-hidden />
          <Moon className="absolute size-[1.1rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light"><Sun className="size-4" aria-hidden /> Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><Moon className="size-4" aria-hidden /> Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><Laptop className="size-4" aria-hidden /> System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
