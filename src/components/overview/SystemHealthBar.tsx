"use client";

import React from "react";
import { useIncidentsStore } from "@/stores/incidents-store";
import { AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * System health strip — compact, editorial.
 * Operational: animated pulse + serif label + env tag + timestamp.
 * Degraded / Critical: tint shifts to amber / red.
 */
export function SystemHealthBar() {
  const incidents = useIncidentsStore((s) => s.incidents);
  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const p1Open = openIncidents.filter((i) => i.severity === "P1");

  const level =
    p1Open.length > 0 ? "critical" : openIncidents.length > 0 ? "degraded" : "operational";

  const config = {
    operational: {
      dot: "#00d992",
      label: "All systems operational",
      ring: "rgba(0, 217, 146, 0.28)",
      glow: "rgba(0, 217, 146, 0.08)",
      textTone: "text-foreground",
    },
    degraded: {
      dot: "#F59E0B",
      label: `${openIncidents.length} incident${openIncidents.length > 1 ? "s" : ""} under investigation`,
      ring: "rgba(245, 158, 11, 0.3)",
      glow: "rgba(245, 158, 11, 0.08)",
      textTone: "text-foreground",
    },
    critical: {
      dot: "#EF4444",
      label: `${p1Open.length} critical incident${p1Open.length > 1 ? "s" : ""} active`,
      ring: "rgba(239, 68, 68, 0.32)",
      glow: "rgba(239, 68, 68, 0.1)",
      textTone: "text-foreground",
    },
  }[level];

  const Icon = level === "critical" ? XCircle : level === "degraded" ? AlertTriangle : null;

  return (
    <div
      className="relative flex items-center justify-between rounded-2xl border px-5 py-3 overflow-hidden transition-all"
      style={{
        borderColor: config.ring,
        background:
          "linear-gradient(90deg, rgb(var(--ink-rgb) / 0.015) 0%, rgb(var(--ink-rgb) / 0.04) 50%, rgb(var(--ink-rgb) / 0.015) 100%)",
        boxShadow: `inset 0 1px 0 rgb(var(--ink-rgb) / 0.04), 0 0 24px ${config.glow}`,
      }}
    >
      {/* Subtle scanning light */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 w-[40%] opacity-[0.06]"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${config.dot} 50%, transparent 100%)`,
          animation: "health-sweep 5s ease-in-out infinite",
        }}
      />

      {/* Left: live dot + label */}
      <div className="relative flex items-center gap-3">
        {Icon ? (
          <Icon className="size-4 shrink-0" style={{ color: config.dot }} />
        ) : (
          <span className="relative flex size-2.5 shrink-0">
            <span
              className="absolute inline-flex size-full rounded-full opacity-60 animate-ping"
              style={{ background: config.dot, animationDuration: "2.4s" }}
            />
            <span
              className="relative inline-flex size-2.5 rounded-full"
              style={{
                background: config.dot,
                boxShadow: `0 0 6px ${config.dot}, 0 0 14px ${config.dot}aa`,
              }}
            />
          </span>
        )}
        <div className="flex items-baseline gap-3 min-w-0">
          <span className={cn("font-serif italic text-[15px] leading-none tracking-[-0.01em]", config.textTone)}>
            {config.label}
          </span>
          <span className="hidden sm:inline font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground/50">
            Live
          </span>
        </div>
      </div>

      {/* Right: env tag */}
      <div className="relative hidden md:flex items-center gap-4 font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55">
        <span className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          Production
        </span>
      </div>

      <style jsx>{`
        @keyframes health-sweep {
          0%, 100% { transform: translateX(-30%); }
          50% { transform: translateX(calc(100vw)); }
        }
      `}</style>
    </div>
  );
}
