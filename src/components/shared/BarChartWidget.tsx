"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "@/lib/format";

interface BarChartWidgetProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
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
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-medium text-foreground">
        {formatValue(payload[0].value)}
      </p>
    </div>
  );
}

export function BarChartWidget({
  data,
  color = "var(--primary)",
  height = 200,
  formatValue = formatNumber,
}: BarChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgb(var(--ink-rgb) / 0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "rgb(var(--ink-rgb) / 0.4)", fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "rgb(var(--ink-rgb) / 0.4)", fontFamily: "monospace" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatValue(v)}
        />
        <Tooltip
          content={<ChartTooltip formatValue={formatValue} />}
          cursor={{ fill: "rgb(var(--ink-rgb) / 0.03)" }}
        />
        <Bar
          dataKey="value"
          fill={color}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
