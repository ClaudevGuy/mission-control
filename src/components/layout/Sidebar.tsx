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
  { label: "Command",       items: NAV_ITEMS.slice(0, 5) },
  { label: "Intelligence",  items: NAV_ITEMS.slice(5, 9) },
  { label: "Operations",    items: NAV_ITEMS.slice(9) },
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

      {/* ── Ambient top glow ── */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-48 z-[1]"
        style={{ background: "radial-gradient(ellipse 90% 80% at 50% -10%, rgb(var(--brand-rgb) / 0.08) 0%, transparent 70%)" }}
      />

      {/* ── Right border (gradient fade) ── */}
      <div className="absolute right-0 top-0 bottom-0 w-px z-[15]"
        style={{ background: "linear-gradient(180deg, rgb(var(--brand-rgb) / 0.15) 0%, rgb(var(--ink-rgb) / 0.04) 40%, rgb(var(--ink-rgb) / 0.04) 60%, transparent 100%)" }}
      />

      {/* ═══════════ LOGO ═══════════ */}
      <div className={cn(
        "relative z-20 flex shrink-0 items-center border-b border-white/[0.04]",
        collapsed ? "justify-center h-[56px]" : "gap-3 px-5 h-[56px]"
      )}>
        {/* Logo mark — polished, with animated hover aurora */}
        <div className="sidebar-logo-mark group/logo relative flex size-[32px] shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-[10px] border border-brand/30"
            style={{ background: "linear-gradient(135deg, rgb(var(--brand-rgb) / 0.22) 0%, rgb(var(--brand-rgb) / 0.04) 100%)" }}
          />
          <div className="absolute -inset-1 rounded-[12px] opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ background: "radial-gradient(circle at 30% 30%, rgb(var(--brand-rgb) / 0.3) 0%, transparent 60%)", filter: "blur(8px)" }}
          />
          <Zap
            className="relative z-10 size-[14px] text-brand drop-shadow-[0_0_6px_rgb(var(--brand-rgb)/0.5)]"
            strokeWidth={2.5}
            fill="rgb(var(--brand-rgb) / 0.35)"
          />
          <div className="absolute inset-0 rounded-[10px] pointer-events-none"
            style={{ boxShadow: "0 0 16px rgb(var(--brand-rgb) / 0.18), inset 0 1px 0 rgb(var(--ink-rgb) / 0.06)" }}
          />
        </div>

        {!collapsed && (
          <div className="flex flex-col gap-[2px] leading-none min-w-0">
            <span className="font-heading text-[12px] font-bold uppercase tracking-[0.18em] whitespace-nowrap"
              style={{
                background: "linear-gradient(180deg, rgb(var(--ink-rgb) / 0.95) 0%, rgb(var(--ink-rgb) / 0.75) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              MOTHERSHIP
            </span>
            <span className="font-mono text-[8.5px] tracking-[0.26em] text-brand/45 uppercase">
              AI · Operations
            </span>
          </div>
        )}
      </div>

      {/* ═══════════ NAVIGATION ═══════════ */}
      <nav className={cn(
        "relative z-20 flex-1 overflow-y-auto overflow-x-hidden scrollbar-sidebar",
        collapsed ? "px-1.5 py-2" : "px-3 py-2"
      )}>
        {/* Project Switcher */}
        <ProjectSwitcher collapsed={collapsed} />
        <div className={cn("my-2 h-px", collapsed ? "mx-1" : "mx-1")}
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(61,58,57,0.6) 30%, rgba(61,58,57,0.6) 70%, transparent 100%)" }}
        />

        {NAV_SECTIONS.map((section, si) => (
          <div key={si}>
            {/* Section label — editorial eyebrow with serif ornament */}
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 mb-1 mt-0.5">
                <span
                  aria-hidden
                  className="font-heading italic text-[10px] leading-none text-brand/40"
                >
                  ❦
                </span>
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/45 select-none">
                  {section.label}
                </span>
                <div
                  className="flex-1 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, rgb(var(--ink-rgb) / 0.08) 0%, transparent 100%)",
                  }}
                />
              </div>
            )}

            <div className="space-y-0">
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
                      "text-[12.5px] transition-all duration-200",
                      collapsed
                        ? "justify-center h-9 w-full mx-auto"
                        : "gap-2.5 px-2 py-[7px] min-h-[32px]",
                      isActive
                        ? "sidebar-nav-active text-foreground font-medium"
                        : "text-muted-foreground/55 hover:text-foreground font-normal"
                    )}
                  >
                    {/* Active background — gradient pill with subtle inner ring */}
                    {isActive && (
                      <div
                        className={cn(
                          "absolute inset-0 rounded-lg",
                          collapsed ? "" : ""
                        )}
                        style={{
                          background: collapsed
                            ? "radial-gradient(circle at center, rgb(var(--brand-rgb) / 0.14) 0%, rgb(var(--brand-rgb) / 0.04) 100%)"
                            : "linear-gradient(90deg, rgb(var(--brand-rgb) / 0.14) 0%, rgb(var(--brand-rgb) / 0.05) 45%, transparent 100%)",
                          boxShadow:
                            "inset 0 0 0 1px rgb(var(--brand-rgb) / 0.08), inset 0 1px 0 rgb(var(--brand-rgb) / 0.12)",
                        }}
                      >
                        <div className="absolute inset-x-[1px] top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent" />
                      </div>
                    )}

                    {/* Hover pill — sweeps in from left */}
                    {!isActive && (
                      <div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{
                          background:
                            "linear-gradient(90deg, rgb(var(--ink-rgb) / 0.05) 0%, rgb(var(--ink-rgb) / 0.015) 60%, transparent 100%)",
                        }}
                      />
                    )}

                    {/* Active indicator bar — vertical brand gradient */}
                    {isActive && (
                      <div
                        className={cn(
                          "sidebar-active-bar absolute w-[2px] rounded-r-full",
                          collapsed
                            ? "left-[3px] top-[7px] bottom-[7px]"
                            : "left-0 top-[7px] bottom-[7px]"
                        )}
                        style={{
                          background:
                            "linear-gradient(180deg, rgb(var(--brand-rgb)) 0%, rgb(var(--brand-rgb) / 0.5) 100%)",
                        }}
                      />
                    )}

                    {/* Icon — subtle chip when active, no height bump for inactive */}
                    <div
                      className={cn(
                        "relative z-10 shrink-0 flex items-center justify-center transition-all duration-200",
                        !collapsed && "size-[18px] rounded-[5px]",
                        collapsed && "size-[20px]"
                      )}
                      style={
                        isActive && !collapsed
                          ? {
                              background: "rgb(var(--brand-rgb) / 0.1)",
                              boxShadow:
                                "inset 0 0 0 1px rgb(var(--brand-rgb) / 0.18)",
                            }
                          : undefined
                      }
                    >
                      <Icon
                        className={cn(
                          "transition-all duration-200",
                          collapsed ? "size-[16px]" : "size-[13px]",
                          isActive
                            ? "text-brand"
                            : "text-muted-foreground/45 group-hover:text-foreground/80"
                        )}
                        strokeWidth={isActive ? 2.1 : 1.7}
                      />
                      {isActive && (
                        <div
                          className="absolute inset-0 -m-1 pointer-events-none"
                          style={{
                            filter: "blur(5px)",
                            background:
                              "radial-gradient(circle, rgb(var(--brand-rgb) / 0.35) 0%, transparent 70%)",
                          }}
                        />
                      )}
                      {badgeCount > 0 && (
                        <span
                          className="absolute -top-[4px] -right-[5px] inline-flex items-center justify-center rounded-full text-[7px] font-mono font-bold min-w-[13px] h-[13px] px-[3px] bg-[#EF4444] text-white ring-2 ring-[#0F0F18]"
                          style={{ boxShadow: "0 0 8px rgba(239,68,68,0.45)" }}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </div>

                    {/* Label — leading-[1.2] so descenders (y, p, g) don't clip */}
                    {!collapsed && (
                      <span className="relative z-10 flex-1 truncate leading-[1.2] tracking-[0.01em] py-0.5">
                        {item.label}
                      </span>
                    )}

                    {/* Active "you are here" dot — only when idle (no shortcut hint) */}
                    {!collapsed && isActive && !(gKeyActive && item.shortcut) && (
                      <span className="relative z-10 ml-auto flex size-1.5 shrink-0">
                        <span
                          className="absolute inline-flex size-full rounded-full opacity-60 animate-ping"
                          style={{
                            background: "rgb(var(--brand-rgb))",
                            animationDuration: "2.4s",
                          }}
                        />
                        <span
                          className="relative inline-flex size-1.5 rounded-full"
                          style={{
                            background: "rgb(var(--brand-rgb))",
                            boxShadow:
                              "0 0 6px rgb(var(--brand-rgb) / 0.7), 0 0 12px rgb(var(--brand-rgb) / 0.3)",
                          }}
                        />
                      </span>
                    )}

                    {/* Keyboard shortcut hint */}
                    {!collapsed && gKeyActive && item.shortcut && (
                      <span
                        className={cn(
                          "relative z-10 ml-auto inline-flex items-center rounded-md px-1.5 py-[3px] font-mono text-[9px] leading-none animate-fade-in-up",
                          isActive
                            ? "bg-brand/10 text-brand/70 border border-brand/20"
                            : "bg-white/[0.04] text-muted-foreground/35 border border-white/[0.04]"
                        )}
                      >
                        {item.shortcut.split(" ")[1]}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Section divider — single hairline */}
            {si < NAV_SECTIONS.length - 1 && (
              <div
                className={cn("my-2.5 h-px", collapsed ? "mx-2" : "mx-2")}
                style={{
                  background: collapsed
                    ? "rgb(var(--ink-rgb) / 0.05)"
                    : "linear-gradient(90deg, transparent 0%, rgb(var(--ink-rgb) / 0.08) 50%, transparent 100%)",
                }}
              />
            )}
          </div>
        ))}
      </nav>

      {/* ═══════════ BOTTOM ═══════════ */}
      <div className="relative z-20 shrink-0 border-t border-white/[0.04]">
        {/* Subtle top gradient on the border */}
        <div className="absolute inset-x-0 -top-px h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgb(var(--brand-rgb) / 0.08), transparent)" }}
        />

        <div className="px-2 py-1.5">
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : undefined}
            className={cn(
              "sidebar-collapse-btn flex w-full items-center rounded-lg py-[5px] text-[11px] font-medium",
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
