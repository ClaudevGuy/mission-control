"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./GlassPanel";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  children: React.ReactNode;
  className?: string;
}

const TIME_RANGES = ["7d", "14d", "30d", "90d"];

export function ChartCard({
  title,
  subtitle,
  timeRange,
  onTimeRangeChange,
  children,
  className,
}: ChartCardProps) {
  const [selectedRange, setSelectedRange] = useState(timeRange ?? "30d");

  const handleRange = (range: string) => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  return (
    <GlassPanel padding="lg" className={cn("relative", className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {onTimeRangeChange && (
          <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range}
                onClick={() => handleRange(range)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  selectedRange === range
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {range}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">{children}</div>

      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-30" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgb(var(--brand-rgb) / 0.03) 2px, rgb(var(--brand-rgb) / 0.03) 4px)'
      }} />
    </GlassPanel>
  );
}
