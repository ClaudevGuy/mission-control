"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { GlassPanel } from "./GlassPanel";
import { CounterAnimation } from "./CounterAnimation";
import { SparklineChart } from "./SparklineChart";

interface MetricCardProps {
  label: string;
  value: number;
  format?: "number" | "currency" | "percent" | "tokens";
  trend?: number;
  sparkData?: number[];
  icon?: LucideIcon;
  color?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  format = "number",
  trend,
  sparkData,
  icon: Icon,
  color = "var(--primary)",
  className,
}: MetricCardProps) {
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <GlassPanel hover padding="md" className={className}>
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && (
          <Icon className="size-3.5 shrink-0" style={{ color }} />
        )}
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <CounterAnimation
            value={value}
            format={format}
            className="text-lg font-semibold text-foreground"
          />
          {trend !== undefined && (
            <div
              className={cn(
                "flex items-center gap-0.5 text-[10px] font-medium",
                trendUp ? "text-green-500" : "text-red-500"
              )}
            >
              {trendUp ? (
                <TrendingUp className="size-2.5" />
              ) : (
                <TrendingDown className="size-2.5" />
              )}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>

        {sparkData && sparkData.length > 0 && (
          <SparklineChart data={sparkData} color={color} width={64} height={24} />
        )}
      </div>
    </GlassPanel>
  );
}
