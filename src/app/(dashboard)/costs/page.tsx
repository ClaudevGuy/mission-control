"use client";

import React, { useState, useEffect } from "react";
import { useCostsStore } from "@/stores/costs-store";
import {
  PageHeader,
  MetricCard,
  GlassPanel,
  AreaChartWidget,
  DonutChartWidget,
  StatusBadge,
  SparklineChart,
  ModelBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Target, Download, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Agent model map for badges
const AGENT_MODELS: Record<string, string> = {
  DataPipelineAgent: "GPT-4", TestWriter: "Claude", InfraMonitor: "Custom",
  CodeReviewer: "Claude", DocGenerator: "GPT-4", DeployBot: "Claude",
  SecurityScanner: "Claude", BugHunter: "Claude", PerformanceOptimizer: "Gemini",
  APIDesigner: "Claude",
};

// Realistic daily costs with variance (weekends lower, one spike)
const DAILY_COSTS = (() => {
  const data: { name: string; value: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    let base = isWeekend ? 420 : 560;
    // Mid-month spike
    if (i >= 13 && i <= 16) base += 120;
    // Random variance
    base += (Math.sin(i * 2.7) * 40) + (Math.cos(i * 1.3) * 30);
    data.push({
      name: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: Math.round(base),
    });
  }
  return data;
})();

const DAILY_BUDGET = Math.round(20500 / 30);

const INVOICES = [
  { id: "INV-2026-03", month: "March 2026", amount: 16481, status: "pending" },
  { id: "INV-2026-02", month: "February 2026", amount: 15892, status: "paid" },
  { id: "INV-2026-01", month: "January 2026", amount: 14723, status: "paid" },
  { id: "INV-2025-12", month: "December 2025", amount: 13987, status: "paid" },
  { id: "INV-2025-11", month: "November 2025", amount: 12456, status: "paid" },
  { id: "INV-2025-10", month: "October 2025", amount: 11892, status: "paid" },
];

export default function CostsPage() {
  const [tab, setTab] = useState<"overview" | "agents" | "budget" | "invoices">("overview");
  const [agentRange, setAgentRange] = useState<"7d" | "30d" | "90d">("30d");
  const [budgetAlert, setBudgetAlert] = useState(80);
  const { agentCosts, budgets, fetch: fetchCosts } = useCostsStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCosts(); }, []);

  const thisMonth = 16481;
  const lastMonth = 15892;
  const monthlyBudget = 20500;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.max(now.getDate(), 1);
  const projected = Math.round((thisMonth / daysElapsed) * daysInMonth);
  const underBudget = monthlyBudget - projected;
  const budgetPct = Math.round((thisMonth / monthlyBudget) * 100);

  const totalAgentSpend = agentCosts.reduce((s, a) => s + a.totalCost, 0);
  const sortedAgents = [...agentCosts].sort((a, b) => b.totalCost - a.totalCost);

  const donutData = [
    { name: "AI APIs", value: 2847, color: "#00D4FF" },
    { name: "Infrastructure", value: 1245, color: "#A855F7" },
    { name: "Third-Party", value: 389, color: "#F59E0B" },
    { name: "Labor", value: 12000, color: "#39FF14" },
  ];

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "agents" as const, label: "By Agent" },
    { id: "budget" as const, label: "Budget" },
    { id: "invoices" as const, label: "Invoices" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Costs & Billing" description="API spend, compute costs, and budget tracking" />

      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn("pb-2.5 text-sm font-medium transition-colors relative", tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70")}
            >
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="This Month" value={thisMonth} format="currency" trend={((thisMonth - lastMonth) / lastMonth) * 100} icon={DollarSign} color="#00D4FF" />
            <MetricCard label="Last Month" value={lastMonth} format="currency" icon={TrendingUp} color="#A855F7" />
            <GlassPanel padding="md">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="size-3.5 text-green-400" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Monthly Budget</span>
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-mono text-xl font-semibold text-foreground">{formatCurrency(monthlyBudget)}</span>
                <span className="text-xs text-muted-foreground">{budgetPct}% used</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/50">
                <div
                  className={cn("h-2 rounded-full transition-all", budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-amber-500" : "bg-green-500")}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
            </GlassPanel>
          </div>

          {/* Projection */}
          <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/[0.06] px-4 py-2.5 text-sm font-medium text-green-400">
            <CheckCircle2 className="size-4 shrink-0" />
            On track — projected {formatCurrency(projected)} ({formatCurrency(underBudget)} under budget)
          </div>

          {/* Charts row: 2/3 + 1/3 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Daily costs chart */}
            <GlassPanel padding="lg" className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading text-sm font-semibold text-foreground">Daily Costs</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Last 30 days — dashed line = daily budget ({formatCurrency(DAILY_BUDGET)}/day)</p>
                </div>
              </div>
              <AreaChartWidget data={DAILY_COSTS} color="#00D4FF" height={240} formatValue={(v) => formatCurrency(v)} />
            </GlassPanel>

            {/* Donut + legend */}
            <GlassPanel padding="lg">
              <h3 className="font-heading text-sm font-semibold text-foreground mb-4">Cost Breakdown</h3>
              <div className="flex justify-center">
                <DonutChartWidget data={donutData} size={200} formatValue={(v) => formatCurrency(v)} />
              </div>
              <div className="mt-4 space-y-2">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-foreground">{formatCurrency(d.value)}</span>
                      <span className="font-mono text-muted-foreground text-[10px]">
                        {Math.round((d.value / donutData.reduce((s, x) => s + x.value, 0)) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          {/* Top Spenders */}
          <GlassPanel padding="lg">
            <h2 className="text-sm font-semibold text-foreground mb-4">Top Spenders by Agent</h2>
            <div className="space-y-0">
              {sortedAgents.map((agent, idx) => {
                const pctOfTotal = (agent.totalCost / totalAgentSpend) * 100;
                const spark = Array.from({ length: 7 }, () => agent.totalCost / 30 + (Math.random() - 0.5) * agent.totalCost / 60);
                return (
                  <div
                    key={agent.agentId}
                    className={cn(
                      "relative flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors",
                      idx === 0 && "border-l-[3px] border-l-amber-400"
                    )}
                  >
                    {/* Background bar */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg bg-muted/20"
                      style={{ width: `${pctOfTotal}%` }}
                    />

                    <span className="relative z-10 text-xs font-mono text-muted-foreground w-6 text-right shrink-0">{idx + 1}</span>
                    <span className="relative z-10 text-sm text-foreground flex-1 truncate font-medium">{agent.agentName}</span>
                    <ModelBadge model={AGENT_MODELS[agent.agentName] || "Custom"} size="sm" />
                    <span className="relative z-10 font-mono text-[11px] text-muted-foreground shrink-0 w-16 text-right">{formatCurrency(agent.costPerRun)}/run</span>
                    <span className="relative z-10 font-mono text-[11px] text-muted-foreground shrink-0 w-14 text-right">{agent.totalRuns.toLocaleString()}</span>
                    <span className="relative z-10 font-mono text-xs font-bold text-foreground shrink-0 w-16 text-right">{formatCurrency(agent.totalCost)}</span>
                    <SparklineChart data={spark} color={agent.trend > 0 ? "#EF4444" : "#39FF14"} width={48} height={16} />
                    <span className="relative z-10 font-mono text-[10px] text-muted-foreground shrink-0 w-10 text-right">{pctOfTotal.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ═══ BY AGENT ═══ */}
      {tab === "agents" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setAgentRange(r)}
                  className={cn("rounded-md px-3 py-1 text-xs font-medium transition-colors", agentRange === r ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <GlassPanel padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["#", "Agent", "Model", "Cost/Run", "Runs", "Total Cost", "Trend", "% Total"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map((agent, idx) => (
                  <tr key={agent.agentId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{agent.agentName}</td>
                    <td className="px-4 py-2.5"><ModelBadge model={AGENT_MODELS[agent.agentName] || "Custom"} size="sm" /></td>
                    <td className="px-4 py-2.5 font-mono text-xs">{formatCurrency(agent.costPerRun)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{agent.totalRuns.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold">{formatCurrency(agent.totalCost)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs font-medium", agent.trend >= 0 ? "text-red-400" : "text-green-400")}>
                        {agent.trend >= 0 ? "+" : ""}{agent.trend.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{((agent.totalCost / totalAgentSpend) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        </div>
      )}

      {/* ═══ BUDGET ═══ */}
      {tab === "budget" && (
        <div className="space-y-6">
          {/* Total budget */}
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Total Monthly Budget</h3>
            <div className="flex items-center gap-4">
              <span className="font-mono text-3xl font-bold text-foreground">{formatCurrency(monthlyBudget)}</span>
              <div className="flex-1">
                <div className="w-full h-3 rounded-full bg-muted/50">
                  <div className="h-3 rounded-full bg-green-500 transition-all" style={{ width: `${budgetPct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">{formatCurrency(thisMonth)} spent · {budgetPct}% used · {formatCurrency(underBudget)} remaining</span>
              </div>
            </div>
          </GlassPanel>

          {/* Per-category budgets */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Category Budgets</h3>
            {budgets.map((b) => {
              const pct = Math.round((b.spent / b.limit) * 100);
              const color = pct > 90 ? "#EF4444" : pct > 70 ? "#F59E0B" : "#39FF14";
              return (
                <GlassPanel key={b.category} padding="md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">{b.category}</h4>
                    <span className="font-mono text-xs text-muted-foreground">{formatCurrency(b.spent)} / {formatCurrency(b.limit)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted/50">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{pct}% used</span>
                    <span className="text-[10px] text-muted-foreground">Alert at {b.alertThreshold}%</span>
                  </div>
                </GlassPanel>
              );
            })}
          </div>

          {/* Alert threshold */}
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Alert Threshold</h3>
            <p className="text-xs text-muted-foreground mb-3">Notify when total spend reaches this % of budget</p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={50}
                max={100}
                value={budgetAlert}
                onChange={(e) => setBudgetAlert(Number(e.target.value))}
                className="flex-1 accent-[#00D4FF]"
              />
              <span className="font-mono text-sm text-foreground w-12 text-right">{budgetAlert}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Alert triggers at {formatCurrency(Math.round(monthlyBudget * budgetAlert / 100))} spend
            </p>
          </GlassPanel>

          {/* Projected */}
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-2">End-of-Month Projection</h3>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-green-400">{formatCurrency(projected)}</span>
              <span className="text-xs text-muted-foreground">±{formatCurrency(Math.round(projected * 0.03))} confidence interval</span>
            </div>
            <p className="text-xs text-green-400 mt-1">{formatCurrency(underBudget)} under {formatCurrency(monthlyBudget)} budget</p>
          </GlassPanel>
        </div>
      )}

      {/* ═══ INVOICES ═══ */}
      {tab === "invoices" && (
        <GlassPanel padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Invoice", "Month", "Amount", "Status", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{inv.id}</td>
                  <td className="px-4 py-3 text-foreground">{inv.month}</td>
                  <td className="px-4 py-3 font-mono text-xs font-medium">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status === "paid" ? "success" : "paused"} size="sm" /></td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="xs" onClick={() => toast.success("Invoice downloaded")}>
                      <Download className="size-3 mr-1" /> PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassPanel>
      )}
    </div>
  );
}
