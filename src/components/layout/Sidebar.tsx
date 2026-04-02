"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, Zap } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useUIStore } from "@/stores/ui-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { ProjectSwitcher } from "./ProjectSwitcher";
import { cn } from "@/lib/utils";

/* ── Nav groups with section labels ────────────────────────────── */
const NAV_SECTIONS = [
  { label: "Command",       items: NAV_ITEMS.slice(0, 4) },
  { label: "Intelligence",  items: NAV_ITEMS.slice(4, 7) },
  { label: "Operations",    items: NAV_ITEMS.slice(7) },
];

function useNavBadges() {
  const incidents = useIncidentsStore((s) => s.incidents);
  const openIncidents = incidents.filter((i) => i.status !== "resolved").length;
  return { "/incidents": openIncidents };
}

/* ── Shared content (used by desktop & mobile) ─────────────────── */

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
      {/* ── Animated edge light ── */}
      <div className="sidebar-edge-light" />

      {/* ── Noise texture overlay ── */}
      <div className="pointer-events-none absolute inset-0 z-[1] opacity-[0.025] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundRepeat: "repeat", backgroundSize: "128px 128px" }}
      />

      {/* ── Ambient top glow ── */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-40 z-[1]"
        style={{ background: "radial-gradient(ellipse 80% 70% at 50% -10%, rgba(0,212,255,0.07) 0%, transparent 70%)" }}
      />

      {/* ── Right border (gradient fade) ── */}
      <div className="absolute right-0 top-0 bottom-0 w-px z-[15]"
        style={{ background: "linear-gradient(180deg, rgba(0,212,255,0.15) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.04) 60%, transparent 100%)" }}
      />

      {/* ═══════════ LOGO ═══════════ */}
      <div className={cn(
        "relative z-20 flex shrink-0 items-center border-b border-white/[0.04]",
        collapsed ? "justify-center h-[58px]" : "gap-3 px-5 h-[58px]"
      )}>
        {/* Logo mark */}
        <div className="sidebar-logo-mark relative flex size-[30px] shrink-0 items-center justify-center">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-[9px] border border-[#00D4FF]/25" />
          {/* Inner glow */}
          <div className="absolute inset-[2px] rounded-[7px] bg-gradient-to-br from-[#00D4FF]/20 via-[#00D4FF]/8 to-transparent" />
          {/* Icon */}
          <Zap
            className="relative z-10 size-[13px] text-[#00D4FF]"
            strokeWidth={2.5}
            fill="rgba(0,212,255,0.3)"
          />
          {/* Ambient shadow */}
          <div className="absolute inset-0 rounded-[9px]"
            style={{ boxShadow: "0 0 14px rgba(0,212,255,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}
          />
        </div>

        {!collapsed && (
          <div className="flex flex-col gap-0 leading-none">
            <span className="font-heading text-[11.5px] font-bold uppercase tracking-[0.16em] text-foreground/90 whitespace-nowrap">
              Mission Control
            </span>
            <span className="text-[9px] tracking-[0.08em] text-[#00D4FF]/40 font-medium uppercase mt-[2px]">
              Command Center
            </span>
          </div>
        )}
      </div>

      {/* ═══════════ NAVIGATION ═══════════ */}
      <nav className={cn(
        "relative z-20 flex-1 overflow-y-auto overflow-x-hidden scrollbar-sidebar",
        collapsed ? "px-1.5 py-3" : "px-3 py-3"
      )}>
        {/* Project Switcher */}
        <ProjectSwitcher collapsed={collapsed} />
        <div className={cn("my-3 h-px", collapsed ? "mx-1" : "mx-1")}
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 30%, rgba(255,255,255,0.06) 70%, transparent 100%)" }}
        />

        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {/* Section label */}
            {!collapsed && (
              <div className="flex items-center gap-2 px-2.5 mb-1.5 mt-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/30 select-none">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-white/[0.03] to-transparent" />
              </div>
            )}

            <div className="space-y-[1px]">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/overview" && pathname.startsWith(item.href));
                const Icon = item.icon;
                const badgeCount = badges[item.href as keyof typeof badges] || 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "sidebar-nav-item group relative flex items-center rounded-lg overflow-hidden",
                      "text-[13px] transition-all duration-200",
                      collapsed
                        ? "justify-center h-9 w-full mx-auto"
                        : "gap-2.5 px-2.5 py-[7px]",
                      isActive
                        ? "sidebar-nav-active text-foreground font-medium"
                        : "text-muted-foreground/55 hover:text-foreground/85 font-normal"
                    )}
                  >
                    {/* Active background */}
                    {isActive && (
                      <div className={cn(
                        "absolute inset-0 rounded-lg",
                        collapsed
                          ? "bg-[#00D4FF]/[0.08]"
                          : "bg-gradient-to-r from-[#00D4FF]/[0.10] via-[#00D4FF]/[0.03] to-transparent"
                      )}>
                        {/* Top edge highlight */}
                        <div className="absolute inset-x-[1px] top-0 h-px bg-gradient-to-r from-transparent via-[#00D4FF]/20 to-transparent" />
                      </div>
                    )}

                    {/* Hover background */}
                    {!isActive && (
                      <div className="absolute inset-0 rounded-lg bg-transparent group-hover:bg-white/[0.03] transition-colors duration-200" />
                    )}

                    {/* Active indicator bar */}
                    {isActive && !collapsed && (
                      <div className="sidebar-active-bar absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-r-full bg-[#00D4FF]" />
                    )}
                    {isActive && collapsed && (
                      <div className="sidebar-active-bar absolute left-[3px] top-[6px] bottom-[6px] w-[2px] rounded-r-full bg-[#00D4FF]" />
                    )}

                    {/* Icon */}
                    <div className="relative z-10 shrink-0">
                      <Icon
                        className={cn(
                          "transition-all duration-200",
                          collapsed ? "size-[17px]" : "size-[15px]",
                          isActive
                            ? "text-[#00D4FF]"
                            : "text-muted-foreground/40 group-hover:text-muted-foreground/70"
                        )}
                        strokeWidth={isActive ? 2 : 1.6}
                      />
                      {/* Icon glow for active */}
                      {isActive && (
                        <div className="absolute inset-0 -m-1 pointer-events-none"
                          style={{ filter: "blur(6px)", background: "radial-gradient(circle, rgba(0,212,255,0.3) 0%, transparent 70%)" }}
                        />
                      )}
                      {/* Badge */}
                      {badgeCount > 0 && (
                        <span className="absolute -top-[5px] -right-[6px] inline-flex items-center justify-center rounded-full text-[7px] font-mono font-bold min-w-[14px] h-[14px] px-[3px] bg-[#EF4444] text-white ring-2 ring-[#0F0F18]"
                          style={{ boxShadow: "0 0 8px rgba(239,68,68,0.4)" }}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </div>

                    {/* Label */}
                    {!collapsed && (
                      <span className="relative z-10 flex-1 truncate leading-none tracking-[0.01em]">
                        {item.label}
                      </span>
                    )}

                    {/* Keyboard shortcut hint */}
                    {!collapsed && gKeyActive && item.shortcut && (
                      <span className={cn(
                        "relative z-10 ml-auto inline-flex items-center rounded-md px-1.5 py-[3px] font-mono text-[9px] leading-none animate-fade-in-up",
                        isActive
                          ? "bg-[#00D4FF]/10 text-[#00D4FF]/60 border border-[#00D4FF]/15"
                          : "bg-white/[0.04] text-muted-foreground/30 border border-white/[0.04]"
                      )}>
                        {item.shortcut.split(" ")[1]}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Section divider */}
            {si < NAV_SECTIONS.length - 1 && (
              <div className={cn("my-2.5", collapsed ? "mx-1" : "mx-1")}
                style={{ height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, transparent 100%)" }}
              />
            )}
          </div>
        ))}
      </nav>

      {/* ═══════════ BOTTOM ═══════════ */}
      <div className="relative z-20 shrink-0 border-t border-white/[0.04]">
        {/* Subtle top gradient on the border */}
        <div className="absolute inset-x-0 -top-px h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.08), transparent)" }}
        />

        <div className="px-2 py-2.5">
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : undefined}
            className={cn(
              "sidebar-collapse-btn flex w-full items-center rounded-lg py-[6px] text-[11px] font-medium",
              "text-muted-foreground/25 hover:text-muted-foreground/50",
              "transition-all duration-200 hover:bg-white/[0.025] active:scale-[0.98]",
              collapsed ? "justify-center px-0" : "gap-2 px-2.5"
            )}
          >
            <ChevronsLeft
              className={cn(
                "size-3.5 transition-transform duration-300 ease-out",
                collapsed && "rotate-180"
              )}
            />
            {!collapsed && (
              <span className="tracking-wide">Collapse</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Desktop Sidebar wrapper ───────────────────────────────────── */

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "sidebar-root relative hidden md:flex h-screen flex-col overflow-hidden select-none shrink-0",
        "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        collapsed ? "w-[58px]" : "w-[230px]"
      )}
    >
      <SidebarContent collapsed={collapsed} />
    </aside>
  );
}
