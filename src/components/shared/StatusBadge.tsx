import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

interface StatusStyle {
  bg: string;
  border: string;
  text: string;
  dot: string;
  animation?: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  running: {
    bg: "rgba(57,255,20,0.08)",
    border: "rgba(57,255,20,0.38)",
    text: "#39FF14",
    dot: "#39FF14",
    animation: "badge-pulse 1.5s ease-in-out infinite",
  },
  healthy: {
    bg: "rgba(57,255,20,0.08)",
    border: "rgba(57,255,20,0.38)",
    text: "#39FF14",
    dot: "#39FF14",
    animation: "badge-pulse 1.5s ease-in-out infinite",
  },
  idle: {
    bg: "rgb(var(--ink-rgb) / 0.03)",
    border: "rgb(var(--ink-rgb) / 0.12)",
    text: "#888888",
    dot: "#888888",
  },
  paused: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.31)",
    text: "#F59E0B",
    dot: "#F59E0B",
  },
  error: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.31)",
    text: "#EF4444",
    dot: "#EF4444",
    animation: "badge-pulse 0.8s ease-in-out infinite",
  },
  deploying: {
    bg: "rgb(var(--brand-rgb) / 0.08)",
    border: "rgb(var(--brand-rgb) / 0.31)",
    text: "var(--primary)",
    dot: "var(--primary)",
    animation: "badge-spin 1s linear infinite",
  },
  success: {
    bg: "rgba(57,255,20,0.08)",
    border: "rgba(57,255,20,0.38)",
    text: "#39FF14",
    dot: "#39FF14",
  },
  failed: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.31)",
    text: "#EF4444",
    dot: "#EF4444",
  },
  in_progress: {
    bg: "rgb(var(--brand-rgb) / 0.08)",
    border: "rgb(var(--brand-rgb) / 0.31)",
    text: "var(--primary)",
    dot: "var(--primary)",
    animation: "badge-spin 1s linear infinite",
  },
  pending: {
    bg: "rgb(var(--ink-rgb) / 0.03)",
    border: "rgb(var(--ink-rgb) / 0.12)",
    text: "#888888",
    dot: "#666666",
  },
  open: {
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.31)",
    text: "#EF4444",
    dot: "#EF4444",
    animation: "badge-pulse 0.8s ease-in-out infinite",
  },
  investigating: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.31)",
    text: "#F59E0B",
    dot: "#F59E0B",
    animation: "badge-pulse 1.5s ease-in-out infinite",
  },
  resolved: {
    bg: "rgba(57,255,20,0.08)",
    border: "rgba(57,255,20,0.38)",
    text: "#39FF14",
    dot: "#39FF14",
  },
  connected: {
    bg: "rgba(57,255,20,0.08)",
    border: "rgba(57,255,20,0.38)",
    text: "#39FF14",
    dot: "#39FF14",
  },
  disconnected: {
    bg: "rgb(var(--ink-rgb) / 0.03)",
    border: "rgb(var(--ink-rgb) / 0.12)",
    text: "#888888",
    dot: "#666666",
  },
  rolled_back: {
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.31)",
    text: "#F59E0B",
    dot: "#F59E0B",
  },
};

const DEFAULT_STYLE: StatusStyle = {
  bg: "rgb(var(--ink-rgb) / 0.03)",
  border: "rgb(var(--ink-rgb) / 0.12)",
  text: "#888888",
  dot: "#666666",
};

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const s = STATUS_STYLES[key] ?? DEFAULT_STYLE;

  const isDeploying = key === "deploying" || key === "in_progress";
  const height = size === "sm" ? 20 : 24;
  const fontSize = size === "sm" ? 10 : 12;
  const dotSize = size === "sm" ? 5 : 6;
  const px = size === "sm" ? 7 : 10;
  const gap = size === "sm" ? 4 : 6;

  return (
    <span
      className={cn("inline-flex items-center shrink-0", className)}
      style={{
        height,
        padding: `0 ${px}px`,
        gap,
        borderRadius: 6,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        fontSize,
        fontWeight: 500,
        lineHeight: 1,
        fontFamily: "var(--font-sans), Inter, sans-serif",
      }}
    >
      {/* Dot / spinner */}
      {isDeploying ? (
        <svg
          width={dotSize + 2}
          height={dotSize + 2}
          viewBox="0 0 10 10"
          className="shrink-0"
          style={{ marginRight: size === "sm" ? 2 : 4 }}
        >
          <circle cx="5" cy="5" r="4" fill="none" stroke={s.dot} strokeWidth="1.5" strokeOpacity="0.3" />
          <circle
            cx="5" cy="5" r="4" fill="none" stroke={s.dot} strokeWidth="1.5"
            strokeDasharray="8 17" strokeLinecap="round"
            style={{ animation: "badge-spin 1s linear infinite", transformOrigin: "center" }}
          />
        </svg>
      ) : (
        <span
          className="shrink-0 rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            background: s.dot,
            marginRight: size === "sm" ? 2 : 4,
            animation: s.animation,
          }}
        />
      )}

      <span style={{ lineHeight: 1 }}>
        {status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
      </span>
    </span>
  );
}
