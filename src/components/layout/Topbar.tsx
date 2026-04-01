"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronRight, Search, User, Sun, Moon, Menu, CheckCheck, X } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useNotificationsStore } from "@/stores/notifications-store";
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
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/format";

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

const TYPE_COLORS: Record<string, string> = {
  info: "bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function Topbar() {
  const breadcrumbs = useBreadcrumbs();
  const router = useRouter();
  const { toggleCommandPalette, setMobileSidebarOpen } = useUIStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, fetch: fetchNotifications, markAsRead, markAllAsRead, dismissNotification, getUnreadCount } = useNotificationsStore();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const unreadCount = getUnreadCount();

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
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger
            render={<button className="relative flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" />}
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-[14px] items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="size-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground/50">
                  <Bell className="size-6" />
                  <span className="text-xs">No notifications</span>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      if (n.actionUrl) { router.push(n.actionUrl); setNotifOpen(false); }
                    }}
                    className={cn(
                      "group relative flex gap-3 px-4 py-3 border-b border-border/30 last:border-0 transition-colors",
                      n.actionUrl ? "cursor-pointer hover:bg-muted/30" : "cursor-default",
                      !n.read && "bg-[#00D4FF]/[0.03]"
                    )}
                  >
                    {/* Type indicator */}
                    <div className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold uppercase", TYPE_COLORS[n.type])}>
                      {n.type[0]}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-[12px] font-medium leading-snug", n.read ? "text-muted-foreground" : "text-foreground")}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#00D4FF]" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70 line-clamp-2">{n.message}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/40" suppressHydrationWarning>
                        {formatRelativeTime(n.timestamp)}
                      </p>
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissNotification(n.id); }}
                      className="absolute right-2 top-2 hidden group-hover:flex size-5 items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

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
