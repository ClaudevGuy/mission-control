"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface HeatmapGridProps {
  data: number[][];
  xLabels: string[];
  yLabels: string[];
  colorScale?: string;
  className?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 212, b: 255 };
}

const COLOR_MAP: Record<string, string> = {
  cyan: "var(--primary)",
  green: "#22C55E",
  amber: "#F59E0B",
  crimson: "#EF4444",
  purple: "#A855F7",
};

export function HeatmapGrid({
  data,
  xLabels,
  yLabels,
  colorScale = "cyan",
  className,
}: HeatmapGridProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: number;
    pos: { left: number; top: number };
  } | null>(null);

  const allValues = data.flat();
  const maxVal = Math.max(...allValues, 1);
  const color = COLOR_MAP[colorScale] ?? colorScale;
  const rgb = hexToRgb(color);

  return (
    <div className={cn("relative", className)}>
      {/* X-axis labels (top) */}
      <div className="flex ml-16">
        {xLabels.map((label) => (
          <div
            key={label}
            className="flex-1 text-center text-[10px] font-mono text-muted-foreground pb-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid rows */}
      <div className="space-y-0.5">
        {data.map((row, yIdx) => (
          <div key={yIdx} className="flex items-center gap-1">
            <span className="w-14 shrink-0 text-right text-[10px] font-mono text-muted-foreground pr-2 truncate">
              {yLabels[yIdx]}
            </span>
            <div className="flex flex-1 gap-0.5">
              {row.map((value, xIdx) => {
                const intensity = maxVal > 0 ? value / maxVal : 0;
                const isDark = intensity > 0.4;
                return (
                  <div
                    key={xIdx}
                    className="flex-1 h-8 rounded-sm cursor-default transition-transform hover:scale-105 flex items-center justify-center"
                    style={{
                      backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},${intensity * 0.8 + 0.05})`,
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        x: xIdx,
                        y: yIdx,
                        value,
                        pos: { left: rect.left + rect.width / 2, top: rect.top },
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {value > 0 && (
                      <span
                        className={cn(
                          "text-[10px] font-mono leading-none select-none",
                          isDark ? "text-white/90" : "text-muted-foreground"
                        )}
                      >
                        {value}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 rounded-lg border border-border bg-card/95 backdrop-blur-xl px-3 py-2 shadow-xl pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltip.pos.left,
            top: tooltip.pos.top - 8,
          }}
        >
          <p className="text-xs text-muted-foreground">
            {xLabels[tooltip.x]} / {yLabels[tooltip.y]}
          </p>
          <p className="text-sm font-mono font-medium text-foreground">
            {tooltip.value}
          </p>
        </div>
      )}
    </div>
  );
}
