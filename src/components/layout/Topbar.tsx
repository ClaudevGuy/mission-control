"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronRight, Search, User, Sun, Moon, Menu } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: seg
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

export function Topbar() {
  const breadcrumbs = useBreadcrumbs();
  const router = useRouter();
  const { toggleCommandPalette, setMobileSidebarOpen } = useUIStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-3 md:px-6 backdrop-blur-xl transition-colors duration-200"
      style={{ background: "var(--topbar-bg)", borderColor: "var(--border-subtle)" }}
    >
      {/* Mobile: hamburger */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden text-muted-foreground hover:text-foreground shrink-0"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {/* Left: Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm min-w-0 flex-1 md:flex-none">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRight className="hidden sm:block size-3 text-muted-foreground/30 shrink-0" />
            )}
            <span
              className={cn(
                "font-medium truncate",
                crumb.isLast
                  ? "text-foreground"
                  : "text-muted-foreground hidden sm:block"
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      {/* Center: Search — desktop only */}
      <div className="mx-auto hidden md:block">
        <button
          onClick={toggleCommandPalette}
          className="flex h-8 w-64 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground/50 transition-colors hover:border-border hover:text-muted-foreground"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="pointer-events-none rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/50">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 md:gap-2 ml-auto">
        {/* Mobile: search icon */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={toggleCommandPalette}
        >
          <Search className="size-4" />
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {!mounted ? <Sun className="size-4" /> : theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/50" />
            }
          >
            <Avatar className="size-7">
              <AvatarFallback className="bg-[#00D4FF]/10 text-xs font-medium text-[#00D4FF]">
                MC
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-400">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
