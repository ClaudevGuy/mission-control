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
