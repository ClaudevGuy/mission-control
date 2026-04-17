"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, ChevronRight, Search, Sun, Moon, Menu, CheckCheck, X,
  CheckCircle2, XCircle, AlertTriangle, Info,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { useAgentsStore } from "@/stores/agents-store";
import { useNotificationsStore, type Notification } from "@/stores/notifications-store";
import { invalidate } from "@/lib/store-cache";
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
import { formatRelativeTime } from "@/lib/format";

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const agents = useAgentsStore((s) => s.agents);

  return segments.map((seg, i) => {
    let label = seg
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const prevSeg = i > 0 ? segments[i - 1] : null;
    if (prevSeg === "agents" && seg.length > 10) {
      const agent = agents.find((a) => a.id === seg);
      if (agent) label = agent.name;
    }

    return {
      label,
      href: "/" + segments.slice(0, i + 1).join("/"),
      isLast: i === segments.length - 1,
    };
  });
}

// ── Notification type icon ──
function NotifIcon({ type }: { type: string }) {
  switch (type) {
    case "success":
      return <CheckCircle2 className="size-4 text-green-400" />;
    case "error":
      return <XCircle className="size-4 text-red-400" />;
    case "warning":
      return <AlertTriangle className="size-4 text-amber-400" />;
    default:
      return <Info className="size-4 text-blue-400" />;
  }
}

// ── Group notifications by day ──
function groupByDay(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  for (const n of notifications) {
    const d = new Date(n.timestamp);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    let label: string;
    if (day.getTime() === today.getTime()) label = "Today";
    else if (day.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = "Earlier";

    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(n);
    else groups.push({ label, items: [n] });
  }

  return groups;
}

export function Topbar() {
  const breadcrumbs = useBreadcrumbs();
  const router = useRouter();
  const { toggleCommandPalette, setMobileSidebarOpen } = useUIStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const {
    notifications, fetch: fetchNotifications,
    markAsRead, markAllAsRead, dismissNotification, getUnreadCount,
  } = useNotificationsStore();

  const prevCountRef = useRef(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // 30s polling for new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      invalidate("notifications");
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = getUnreadCount();

  // Pulse animation when new notifications arrive
  useEffect(() => {
    if (unreadCount > prevCountRef.current && prevCountRef.current >= 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(t);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  const handleNotifClick = useCallback((n: Notification) => {
    markAsRead(n.id);
    if (n.actionUrl) {
      router.push(n.actionUrl);
      setPanelOpen(false);
    }
  }, [markAsRead, router]);

  const groups = groupByDay(notifications);

  return (
    <>
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

          {/* Notifications Bell */}
          <button
            onClick={() => setPanelOpen(true)}
            className="relative flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white min-w-[14px] h-[14px] px-0.5",
                  pulse && "animate-pulse"
                )}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/50" />
              }
            >
              <Avatar className="size-7">
                <AvatarFallback className="bg-brand/10 text-xs font-medium text-brand">
                  MC
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
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

      {/* ── Notification Slide-Over ── */}

      {/* Backdrop */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] transition-opacity"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[380px] max-w-[calc(100vw-16px)] flex flex-col border-l transition-transform duration-250 ease-out",
          panelOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{
          background: "var(--bg-secondary, hsl(var(--card)))",
          borderColor: "var(--border, hsl(var(--border)))",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="size-3" />
                Mark all read
              </button>
            )}
            <button
              onClick={() => setPanelOpen(false)}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted/30">
                <Bell className="size-5 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/50 mt-1 max-w-[240px]">
                  Notifications will appear when agents run, workflows complete, or incidents occur
                </p>
              </div>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                {/* Group header */}
                <div className="sticky top-0 z-10 px-5 py-2 border-b border-border/20" style={{ background: "var(--bg-secondary, hsl(var(--card)))" }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
                    {group.label}
                  </span>
                </div>

                {/* Notification rows */}
                {group.items.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={cn(
                      "group relative flex gap-3 px-5 py-3.5 border-b border-border/20 last:border-0 transition-colors",
                      n.actionUrl ? "cursor-pointer hover:bg-muted/20" : "cursor-default",
                      !n.read && "bg-brand/[0.04]"
                    )}
                  >
                    {/* Type icon */}
                    <div className="mt-0.5 shrink-0">
                      <NotifIcon type={n.type} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-[12px] leading-snug", n.read ? "font-normal text-muted-foreground" : "font-semibold text-foreground")}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand" />
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/60 line-clamp-1">{n.message}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/35" suppressHydrationWarning>
                        {formatRelativeTime(n.timestamp)}
                      </p>
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissNotification(n.id); }}
                      className="absolute right-3 top-3 hidden group-hover:flex size-5 items-center justify-center rounded text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
