"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/format";

interface AreaChartWidgetProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
  showDots?: boolean;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  formatValue: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-xl px-3 py-2 shadow-xl">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-mono font-semibold text-foreground">
        {formatValue(payload[0].value)}
      </p>
    </div>
  );
}

function trimTrailingZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

export function AreaChartWidget({
  data,
  color = "var(--primary)",
  height = 200,
  formatValue = formatNumber,
  showDots = true,
}: AreaChartWidgetProps) {
  const uid = React.useId();
  const gradientId = `area-gradient-${uid}`;
  const glowId = `area-glow-${uid}`;

  const axisFormat = (v: number) => trimTrailingZeros(formatValue(v));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="60%" stopColor={color} stopOpacity={0.08} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="rgb(var(--ink-rgb) / 0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{
            fontSize: 10,
            fill: "rgb(var(--ink-rgb) / 0.45)",
            fontFamily: "monospace",
          }}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          tick={{
            fontSize: 10,
            fill: "rgb(var(--ink-rgb) / 0.45)",
            fontFamily: "monospace",
          }}
          axisLine={false}
          tickLine={false}
          tickFormatter={axisFormat}
          width={52}
        />
        <Tooltip
          content={<ChartTooltip formatValue={formatValue} />}
          cursor={{
            stroke: color,
            strokeOpacity: 0.3,
            strokeWidth: 1,
            strokeDasharray: "3 3",
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.25}
          fill={`url(#${gradientId})`}
          filter={`url(#${glowId})`}
          dot={
            showDots
              ? {
                  r: 3,
                  fill: "#0E0E13",
                  stroke: color,
                  strokeWidth: 2,
                }
              : false
          }
          activeDot={{
            r: 5,
            fill: color,
            stroke: "#0E0E13",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
