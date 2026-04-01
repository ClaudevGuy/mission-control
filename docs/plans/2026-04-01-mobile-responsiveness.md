# Mobile Responsiveness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the entire Mission Control dashboard fully responsive on mobile (< 768px) using a hamburger-triggered Sheet drawer for navigation.

**Architecture:** Extract `SidebarContent` from `Sidebar.tsx` into a shared component used by both the existing desktop `<aside>` and a new `MobileSidebar` Sheet. Add `mobileSidebarOpen` state to `useUIStore`. Update `Topbar` with a hamburger button and a compact search icon. Apply `overflow-x-auto` to the shared `DataTable` component and responsive padding to `PageHeader`.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, shadcn/ui (`Sheet`), Zustand (`useUIStore`), Lucide icons

---

## Task 1: Add `mobileSidebarOpen` to `useUIStore`

**Files:**
- Modify: `src/stores/ui-store.ts`

**Step 1: Add state + action to the interface and store**

Replace the entire file with:

```ts
import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  shortcutsOpen: boolean;
  gKeyActive: boolean;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  toggleShortcuts: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setGKeyActive: (active: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  shortcutsOpen: false,
  gKeyActive: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleShortcuts: () => set((s) => ({ shortcutsOpen: !s.shortcutsOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setGKeyActive: (active) => set({ gKeyActive: active }),
}));
```

**Step 2: Verify TypeScript compiles**

```bash
cd /c/tmp/mission-control/.claude/worktrees/jolly-bartik
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (or only pre-existing errors unrelated to this file)

**Step 3: Commit**

```bash
git add src/stores/ui-store.ts
git commit -m "feat(mobile): add mobileSidebarOpen state to useUIStore"
```

---

## Task 2: Extract `SidebarContent` + update `Sidebar.tsx`

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Refactor Sidebar.tsx**

The goal is to extract everything inside the `<aside>` into a `SidebarContent` component (exported), and make the `<aside>` only render on `md+` screens.

Replace `src/components/layout/Sidebar.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, Zap } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useUIStore } from "@/stores/ui-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { cn } from "@/lib/utils";

// Split nav into logical groups: Core ops | Observability | Admin
const NAV_GROUPS = [
  NAV_ITEMS.slice(0, 4),  // Overview, AI Agents, Workflows, Deployments
  NAV_ITEMS.slice(4, 7),  // Costs & Billing, Analytics, Logs
  NAV_ITEMS.slice(7),     // Team, Incidents, Settings
];

function useNavBadges() {
  const incidents = useIncidentsStore((s) => s.incidents);
  const openIncidents = incidents.filter((i) => i.status !== "resolved").length;
  return { "/incidents": openIncidents };
}

interface SidebarContentProps {
  collapsed?: boolean;
}

export function SidebarContent({ collapsed = false }: SidebarContentProps) {
  const pathname = usePathname();
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const gKeyActive = useUIStore((s) => s.gKeyActive);
  const badges = useNavBadges();

  return (
    <>
      {/* Right border */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-border/50 z-20" />

      {/* Top ambient glow */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#00D4FF]/[0.04] to-transparent z-0" />

      {/* ── Logo ─────────────────────────────────── */}
      <div
        className={cn(
          "relative z-20 flex h-[54px] shrink-0 items-center border-b border-border/40",
          collapsed ? "justify-center" : "gap-2.5 px-4"
        )}
      >
        <div className="relative flex size-[28px] shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-lg bg-[#00D4FF]/[0.12] border border-[#00D4FF]/20" />
          <Zap
            className="relative z-10 size-[13px] text-[#00D4FF]"
            strokeWidth={2.5}
            fill="rgba(0,212,255,0.2)"
          />
          <div
            className="absolute inset-0 rounded-lg pointer-events-none"
            style={{ boxShadow: "0 0 10px rgba(0,212,255,0.12)" }}
          />
        </div>
        {!collapsed && (
          <span className="font-heading text-[12px] font-bold uppercase tracking-[0.14em] text-foreground/80 whitespace-nowrap leading-none">
            Mission Control
          </span>
        )}
      </div>

      {/* ── Navigation ────────────────────────────── */}
      <nav className="relative z-20 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        <ProjectSwitcher collapsed={collapsed} />
        <div className={cn("my-2 h-px bg-border/25", collapsed ? "mx-1" : "mx-0.5")} />

        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            <div className="space-y-[2px]">
              {group.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/overview" && pathname.startsWith(item.href));
                const Icon = item.icon;
                const badgeCount =
                  badges[item.href as keyof typeof badges] || 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center rounded-lg overflow-hidden",
                      "text-[13px] transition-all duration-150",
                      collapsed
                        ? "justify-center h-9 w-full"
                        : "gap-2.5 px-2.5 py-[7px]",
                      isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground/70 hover:text-foreground/90 font-normal"
                    )}
                  >
                    {isActive && (
                      <div
                        className={cn(
                          "absolute inset-0 rounded-lg",
                          collapsed
                            ? "bg-[#00D4FF]/[0.09]"
                            : "bg-gradient-to-r from-[#00D4FF]/[0.11] via-[#00D4FF]/[0.04] to-transparent"
                        )}
                      />
                    )}
                    {!isActive && (
                      <div className="absolute inset-0 rounded-lg bg-transparent group-hover:bg-white/[0.035] transition-colors duration-100" />
                    )}
                    {isActive && !collapsed && (
                      <div
                        className="absolute left-0 top-[5px] bottom-[5px] w-[2px] rounded-r-full bg-[#00D4FF]"
                        style={{ boxShadow: "0 0 8px rgba(0,212,255,0.7), 0 0 2px rgba(0,212,255,1)" }}
                      />
                    )}
                    <div className="relative z-10 shrink-0">
                      <Icon
                        className={cn(
                          "transition-all duration-150",
                          collapsed ? "size-[17px]" : "size-[15px]",
                          isActive
                            ? "text-[#00D4FF] drop-shadow-[0_0_5px_rgba(0,212,255,0.55)]"
                            : "text-muted-foreground/50 group-hover:text-muted-foreground/80 transition-colors"
                        )}
                        strokeWidth={isActive ? 2 : 1.75}
                      />
                      {badgeCount > 0 && (
                        <span className="absolute -top-[6px] -right-[7px] inline-flex items-center justify-center rounded-full text-[8px] font-mono font-bold min-w-[13px] h-[13px] px-0.5 bg-[#EF4444] text-white shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                          {badgeCount}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <span className="relative z-10 flex-1 truncate leading-none">
                        {item.label}
                      </span>
                    )}
                    {!collapsed && gKeyActive && item.shortcut && (
                      <span
                        className={cn(
                          "relative z-10 ml-auto inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9px] animate-fade-in-up",
                          isActive
                            ? "bg-[#00D4FF]/15 text-[#00D4FF]/70"
                            : "bg-muted/50 text-muted-foreground/40"
                        )}
                      >
                        {item.shortcut}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
            {gi < NAV_GROUPS.length - 1 && (
              <div className={cn("my-2.5 h-px bg-border/25", collapsed ? "mx-1" : "mx-0.5")} />
            )}
          </div>
        ))}
      </nav>

      {/* ── Bottom collapse button (desktop only) ── */}
      <div className="relative z-20 shrink-0 border-t border-border/40 px-2 py-2.5">
        <button
          onClick={toggleSidebar}
          title={collapsed ? "Expand sidebar" : undefined}
          className={cn(
            "flex w-full items-center rounded-lg py-1.5 text-[11px] font-medium",
            "text-muted-foreground/35 hover:text-muted-foreground/60",
            "transition-all duration-150 hover:bg-white/[0.03]",
            collapsed ? "justify-center" : "gap-2 px-2.5"
          )}
        >
          <ChevronsLeft
            className={cn(
              "size-3.5 transition-transform duration-[250ms]",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={cn(
        // Hidden on mobile, flex on md+
        "relative hidden md:flex h-screen flex-col overflow-hidden select-none shrink-0",
        "transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
      style={{ background: "var(--sidebar-bg)" }}
    >
      <SidebarContent collapsed={collapsed} />
    </aside>
  );
}
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(mobile): extract SidebarContent, hide desktop sidebar on mobile"
```

---

## Task 3: Create `MobileSidebar.tsx`

**Files:**
- Create: `src/components/layout/MobileSidebar.tsx`

**Step 1: Create the file**

```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUIStore } from "@/stores/ui-store";
import { SidebarContent } from "./Sidebar";

export function MobileSidebar() {
  const open = useUIStore((s) => s.mobileSidebarOpen);
  const setOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();

  // Auto-close when navigating to a new page
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        className="w-[260px] p-0 border-r border-border/50 [&>button]:hidden"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="relative flex h-full flex-col overflow-hidden select-none">
          <SidebarContent collapsed={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Note on `[&>button]:hidden`:** shadcn Sheet renders a close `×` button by default. We hide it because the sidebar content already closes on nav click, and the backdrop click closes it too. The `SheetTitle` with `sr-only` satisfies the accessibility requirement for a labelled dialog.

**Step 2: Check that shadcn Sheet is installed**

```bash
ls src/components/ui/sheet.tsx 2>/dev/null && echo "exists" || echo "MISSING"
```

If missing, install it:
```bash
npx shadcn@latest add sheet
```

**Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 4: Commit**

```bash
git add src/components/layout/MobileSidebar.tsx
git commit -m "feat(mobile): add MobileSidebar Sheet component"
```

---

## Task 4: Update `Topbar.tsx`

**Files:**
- Modify: `src/components/layout/Topbar.tsx`

**Step 1: Replace the file**

Add hamburger button (mobile only), make search bar desktop-only, add mobile search icon, show only current page in breadcrumbs on mobile:

```tsx
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
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/components/layout/Topbar.tsx
git commit -m "feat(mobile): responsive topbar with hamburger and compact search"
```

---

## Task 5: Update `layout.tsx` — add MobileSidebar + responsive padding

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Add `<MobileSidebar />` and update padding**

Change the import section — add `MobileSidebar`:

```tsx
import { MobileSidebar } from "@/components/layout/MobileSidebar";
```

Change the return JSX:
- Add `<MobileSidebar />` alongside `<Sidebar />`
- Change `p-6` to `p-4 md:p-6`

The full updated return block:

```tsx
  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-200">
      <Sidebar />
      <MobileSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="relative flex-1 overflow-y-auto">
          {/* Ambient background */}
          <div className="pointer-events-none absolute inset-0 bg-ambient" />
          <div className="relative z-10 p-4 md:p-6">{children}</div>
        </main>
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
    </div>
  );
```

**Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/layout.tsx
git commit -m "feat(mobile): include MobileSidebar in layout, responsive page padding"
```

---

## Task 6: Update `PageHeader.tsx` — responsive actions row

**Files:**
- Modify: `src/components/shared/PageHeader.tsx`

**Step 1: Make the header stack on mobile**

Replace with:

```tsx
import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between sm:pb-6",
        className
      )}
    >
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/shared/PageHeader.tsx
git commit -m "feat(mobile): responsive PageHeader stacks on mobile"
```

---

## Task 7: Add `overflow-x-auto` to `DataTable.tsx`

**Files:**
- Modify: `src/components/shared/DataTable.tsx`

**Step 1: Read the current DataTable structure**

```bash
head -40 src/components/shared/DataTable.tsx
```

**Step 2: Wrap the `<table>` in an `overflow-x-auto` div**

Find the outermost `<table>` element and wrap it:

```tsx
<div className="overflow-x-auto">
  <table ...>
    ...
  </table>
</div>
```

If the `<table>` is already inside a container div, add `overflow-x-auto` to that div's className instead of adding a new wrapper.

**Step 3: Commit**

```bash
git add src/components/shared/DataTable.tsx
git commit -m "feat(mobile): horizontal scroll for data tables on mobile"
```

---

## Task 8: Final verification + push

**Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no new errors introduced by this work.

**Step 2: Build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: successful build.

**Step 3: Push branch**

```bash
git push origin claude/jolly-bartik
```

**Step 4: Verify on live preview**

After Vercel deploys the preview, open the URL on a mobile device or use browser devtools at 375px width and check:
- Sidebar is hidden, hamburger visible in topbar
- Hamburger opens Sheet drawer with full nav
- Tapping a nav item closes the drawer and navigates
- Search icon in topbar opens command palette
- Page padding is comfortable
- Data tables scroll horizontally
- PageHeader stacks on small screens
