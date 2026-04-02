"use client";

import React from "react";
import { ChartCard, AreaChartWidget } from "@/components/shared";
import { useCostsStore } from "@/stores/costs-store";
import { formatCurrency } from "@/lib/format";
import { BarChart3 } from "lucide-react";

export function CostBurnChart() {
  const dailyCosts = useCostsStore((s) => s.dailyCosts);
  const last7 = dailyCosts.slice(-7).map((d) => ({
    name: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
    value: d.value,
  }));

  const hasData = last7.length > 0 && last7.some((d) => d.value > 0);

  return (
    <ChartCard title="Cost Burn (7 days)" onTimeRangeChange={() => {}}>
      {hasData ? (
        <AreaChartWidget data={last7} color="#F59E0B" height={180} formatValue={formatCurrency} />
      ) : (
        <div className="flex flex-col items-center justify-center h-[180px] text-center">
          <BarChart3 className="size-8 text-muted-foreground/15 mb-2" />
          <p className="text-xs text-muted-foreground/50">No cost data yet</p>
          <p className="text-[10px] text-muted-foreground/30 mt-0.5">Costs will appear as agents run</p>
        </div>
      )}
    </ChartCard>
  );
}
