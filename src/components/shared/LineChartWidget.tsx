"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatNumber } from "@/lib/format";

interface LineConfig {
  key: string;
  color: string;
  label: string;
}

interface LineChartWidgetProps {
  data: Record<string, unknown>[];
  lines: LineConfig[];
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
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatValue: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card/95 backdrop-blur-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-mono font-medium text-foreground">
            {formatValue(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LineChartWidget({
  data,
  lines,
  height = 200,
  formatValue = formatNumber,
}: LineChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
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
          cursor={{ stroke: "rgb(var(--ink-rgb) / 0.1)" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "rgb(var(--ink-rgb) / 0.5)" }}
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: line.color, stroke: "#0E0E13", strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
