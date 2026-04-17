"use client";

import React, { useState } from "react";
import { ChartCard, AreaChartWidget } from "@/components/shared";
import { useCostsStore } from "@/stores/costs-store";
import { formatCurrency } from "@/lib/format";
import { BarChart3, TrendingDown, TrendingUp, Minus } from "lucide-react";

type Range = "7d" | "14d" | "30d" | "90d";

const RANGE_DAYS: Record<Range, number> = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 };

export function CostBurnChart() {
  const dailyCosts = useCostsStore((s) => s.dailyCosts);
  const [range, setRange] = useState<Range>("7d");

  const days = RANGE_DAYS[range];
  const window = dailyCosts.slice(-days);
  const prior = dailyCosts.slice(-days * 2, -days);

  const labelFormat: Intl.DateTimeFormatOptions =
    days <= 14 ? { weekday: "short" } : { month: "short", day: "numeric" };

  const series = window.map((d) => ({
    name: new Date(d.date).toLocaleDateString("en-US", labelFormat),
    value: d.value,
  }));

  const total = window.reduce((sum, d) => sum + d.value, 0);
  const priorTotal = prior.reduce((sum, d) => sum + d.value, 0);
  const deltaPct = priorTotal > 0 ? ((total - priorTotal) / priorTotal) * 100 : null;

  const hasData = series.length > 0 && series.some((d) => d.value > 0);

  const TrendIcon = deltaPct === null ? Minus : deltaPct > 0 ? TrendingUp : TrendingDown;
  const trendColor =
    deltaPct === null
      ? "text-muted-foreground"
      : deltaPct > 0
        ? "text-amber-400"
        : "text-emerald-400";

  return (
    <ChartCard
      title="Cost Burn"
      subtitle={hasData ? formatCurrency(total) : undefined}
      timeRange={range}
      onTimeRangeChange={(r) => setRange(r as Range)}
    >
      {hasData ? (
        <div className="space-y-3">
          {deltaPct !== null && (
            <div className={`flex items-center gap-1.5 text-xs font-mono ${trendColor}`}>
              <TrendIcon className="size-3.5" />
              <span>
                {deltaPct > 0 ? "+" : ""}
                {deltaPct.toFixed(1)}% vs prior {range}
              </span>
            </div>
          )}
          <AreaChartWidget
            data={series}
            color="#F59E0B"
            height={180}
            formatValue={formatCurrency}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[180px] text-center">
          <BarChart3 className="size-8 text-muted-foreground/20 mb-2" />
          <p className="text-xs text-muted-foreground/60">No cost data yet</p>
          <p className="text-[10px] text-muted-foreground/40 mt-0.5">
            Costs will appear as agents run
          </p>
        </div>
      )}
    </ChartCard>
  );
}
