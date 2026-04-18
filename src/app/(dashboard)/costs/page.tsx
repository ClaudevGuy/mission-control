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
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { DollarSign, TrendingUp, Target, Download, CheckCircle2, AlertTriangle, Sparkles, ArrowRight, X, Check, Pencil, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Agent model map for badges — populated from store data
const AGENT_MODELS: Record<string, string> = {};

// Daily costs — empty, wire to real backend
const DAILY_COSTS: { name: string; value: number }[] = [];
const DAILY_BUDGET = 0;

const INVOICES: { id: string; month: string; amount: number; status: string }[] = [];

export default function CostsPage() {
  const [tab, setTab] = useState<"overview" | "agents" | "budget" | "invoices">("overview");
  const [agentRange, setAgentRange] = useState<"7d" | "30d" | "90d">("30d");
  const { agentCosts, budgets, dailyCosts, fetch: fetchCosts, createBudget, updateBudget, deleteBudget } = useCostsStore();

  // ─── Budget modal state ───
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetForm, setBudgetForm] = useState({ category: "Monthly", limit: "", alertThreshold: 80 });
  const [budgetSaving, setBudgetSaving] = useState(false);

  const openCreateBudget = () => {
    setEditingBudgetId(null);
    setBudgetForm({ category: "Monthly", limit: "", alertThreshold: 80 });
    setBudgetModalOpen(true);
  };
  const openEditBudget = (b: { id: string; category: string; limit: number; alertThreshold: number }) => {
    setEditingBudgetId(b.id);
    setBudgetForm({
      category: b.category,
      limit: String(b.limit),
      alertThreshold: Math.round(b.alertThreshold * 100),
    });
    setBudgetModalOpen(true);
  };
  const saveBudget = async () => {
    const amount = parseFloat(budgetForm.limit);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a positive dollar amount");
      return;
    }
    if (!budgetForm.category.trim()) {
      toast.error("Category name is required");
      return;
    }
    setBudgetSaving(true);
    try {
      if (editingBudgetId) {
        await updateBudget(editingBudgetId, {
          limit: amount,
          alertThreshold: budgetForm.alertThreshold / 100,
        });
        toast.success("Budget updated");
      } else {
        await createBudget({
          category: budgetForm.category.trim(),
          limit: amount,
          alertThreshold: budgetForm.alertThreshold / 100,
        });
        toast.success("Budget created");
      }
      setBudgetModalOpen(false);
    } catch (e) {
      toast.error((e as Error).message || "Save failed");
    } finally {
      setBudgetSaving(false);
    }
  };
  const removeBudget = async (id: string, category: string) => {
    if (!confirm(`Remove the "${category}" budget? This won't affect past spend.`)) return;
    try {
      await deleteBudget(id);
      toast.success("Budget removed");
    } catch {
      toast.error("Failed to remove budget");
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCosts(); }, []);

  const [savings, setSavings] = useState<{
    actualCost: number; tier1Cost: number; savings: number; savingsPercent: number;
    upgradeEvents: number;
    tierDistribution: { tier1: { count: number; percent: number }; tier2: { count: number; percent: number }; tier3: { count: number; percent: number } };
    totalCalls: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/costs/model-savings").then(r => r.json()).then(d => setSavings(d.data)).catch(() => {});
  }, []);

  // ─── Auto-Downshift proposals ───
  interface DownshiftProposalRow {
    id: string;
    agentId: string;
    agentName: string;
    fromModel: string;
    toModel: string;
    fromTier: number;
    toTier: number;
    sampleSize: number;
    parityRatio: number;
    shadowMean: number;
    productionMean: number;
    estMonthlySavings: number;
    judgeMethod: string;
    status: string;
    createdAt: string;
  }
  const [dsProposals, setDsProposals] = useState<DownshiftProposalRow[]>([]);
  const [dsActing, setDsActing] = useState<string | null>(null);

  const loadProposals = async (refresh = false) => {
    try {
      const res = await fetch(`/api/downshift/proposals${refresh ? "?refresh=1" : ""}`);
      if (!res.ok) return;
      const data = await res.json();
      setDsProposals(data.data?.proposals ?? []);
    } catch { /* silent */ }
  };
  useEffect(() => { loadProposals(true); }, []);

  const decideProposal = async (id: string, action: "accept" | "reject") => {
    setDsActing(id);
    try {
      const res = await fetch(`/api/downshift/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Action failed" }));
        toast.error(err.error || "Action failed");
        return;
      }
      toast.success(action === "accept" ? "Downshift accepted" : "Proposal dismissed (30-day cooldown)");
      setDsProposals((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Network error");
    } finally {
      setDsActing(null);
    }
  };

  const totalAgentSpendRaw = agentCosts.reduce((s, a) => s + a.totalCost, 0);
  const thisMonth = totalAgentSpendRaw;
  const lastMonth = 0;
  const monthlyBudget = budgets.length > 0 ? budgets.reduce((s, b) => s + (b.limit || 0), 0) : 0;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.max(now.getDate(), 1);
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  // ─── Cost forecast (trailing 7-day average) ──────────────────────────────
  // Rationale: a flat "total-so-far / days-elapsed" projection misses trend
  // changes. The trailing 7-day window tracks current burn rate better.
  const last7 = dailyCosts.slice(-7);
  const last7Total = last7.reduce((s, d) => s + (d.value ?? 0), 0);
  const avgDaily7 = last7.length > 0 ? last7Total / last7.length : 0;
  // Compare to the 7 days before that to detect acceleration/deceleration
  const prev7 = dailyCosts.slice(-14, -7);
  const prev7Total = prev7.reduce((s, d) => s + (d.value ?? 0), 0);
  const avgDailyPrev7 = prev7.length > 0 ? prev7Total / prev7.length : 0;
  const trendPct = avgDailyPrev7 > 0
    ? Math.round(((avgDaily7 - avgDailyPrev7) / avgDailyPrev7) * 100)
    : 0;

  // Forecast = spend-to-date + (remaining days * trailing 7-day avg)
  // Falls back to the old total/daysElapsed method if we don't have 7 days of data.
  const hasTrailingWindow = last7.length >= 3;
  const projected = hasTrailingWindow
    ? Math.round((thisMonth + avgDaily7 * daysRemaining) * 100) / 100
    : daysElapsed > 0
      ? Math.round((thisMonth / daysElapsed) * daysInMonth * 100) / 100
      : 0;
  const underBudget = monthlyBudget > 0 ? monthlyBudget - projected : 0;
  const budgetPct = monthlyBudget > 0 ? Math.round((thisMonth / monthlyBudget) * 100) : 0;
  const projectedBudgetPct = monthlyBudget > 0 ? Math.round((projected / monthlyBudget) * 100) : 0;
  const willExceedBudget = monthlyBudget > 0 && projected > monthlyBudget;

  const totalAgentSpend = totalAgentSpendRaw;
  const sortedAgents = [...agentCosts].sort((a, b) => b.totalCost - a.totalCost);

  const donutData: { name: string; value: number; color: string }[] = [];

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
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Top stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="This Month" value={thisMonth} format="currency" trend={((thisMonth - lastMonth) / lastMonth) * 100} icon={DollarSign} color="var(--primary)" />
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

          {/* Forecast — trailing 7-day projection */}
          <GlassPanel padding="md" className={cn(
            willExceedBudget ? "border-red-500/30 bg-red-500/[0.04]" : "border-brand/20 bg-brand/[0.03]"
          )}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  willExceedBudget ? "bg-red-500/10" : "bg-brand/10"
                )}>
                  {willExceedBudget ? (
                    <AlertTriangle className="size-5 text-red-400" />
                  ) : (
                    <CheckCircle2 className="size-5 text-brand" />
                  )}
                </div>
                <div className="space-y-1 min-w-0">
                  <p className={cn(
                    "text-sm font-semibold",
                    willExceedBudget ? "text-red-400" : "text-brand"
                  )}>
                    {hasTrailingWindow
                      ? <>At this pace: <span className="font-mono">{formatCurrency(projected)}</span> this month</>
                      : "Not enough data for a forecast yet"
                    }
                  </p>
                  {hasTrailingWindow && (
                    <p className="text-[11px] text-muted-foreground">
                      Based on last 7 days &middot; avg {formatCurrency(avgDaily7)}/day &middot; {daysRemaining} days remaining
                      {trendPct !== 0 && prev7.length > 0 && (
                        <span className={cn(
                          "ml-2 font-mono",
                          trendPct > 10 ? "text-amber-400" : trendPct < -10 ? "text-brand" : "text-muted-foreground"
                        )}>
                          {trendPct > 0 ? "↑" : "↓"} {Math.abs(trendPct)}% vs prior week
                        </span>
                      )}
                    </p>
                  )}
                  {monthlyBudget > 0 && hasTrailingWindow && (
                    <p className="text-[11px]">
                      {willExceedBudget ? (
                        <span className="text-red-400">
                          <span className="font-mono">{formatCurrency(projected - monthlyBudget)}</span> over budget ({projectedBudgetPct}% of {formatCurrency(monthlyBudget)})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          <span className="font-mono text-brand">{formatCurrency(underBudget)}</span> under budget ({projectedBudgetPct}% of {formatCurrency(monthlyBudget)})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {hasTrailingWindow && monthlyBudget > 0 && (
                <div className="w-[180px] shrink-0">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    <span>Projected</span>
                    <span className="font-mono">{projectedBudgetPct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        willExceedBudget ? "bg-red-500" : projectedBudgetPct > 85 ? "bg-amber-500" : "bg-brand"
                      )}
                      style={{ width: `${Math.min(projectedBudgetPct, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </GlassPanel>

          {/* ─── Auto-Downshift proposals ─── */}
          {dsProposals.length > 0 && (
            <GlassPanel padding="lg" className="border-brand/30 bg-brand/[0.04]">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                    <Sparkles className="size-5 text-brand" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-0.5">
                      Auto-Downshift ready — {dsProposals.length} proposal{dsProposals.length === 1 ? "" : "s"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground/80">
                      Shadow tests show these agents would keep quality on a cheaper model. Approve to move them, dismiss to cool off for 30 days.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Potential savings</p>
                  <p className="font-mono text-lg font-semibold text-brand">
                    {formatCurrency(dsProposals.reduce((s, p) => s + p.estMonthlySavings, 0))}
                    <span className="text-[11px] font-normal text-muted-foreground ml-1">/mo</span>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {dsProposals.map((p) => {
                  const parityPct = Math.round(p.parityRatio * 100);
                  const isActing = dsActing === p.id;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-4 rounded-lg border border-border/70 bg-background/40 px-4 py-3"
                    >
                      {/* Agent name */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{p.agentName}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {p.sampleSize} scored shadow runs &middot; judge: {p.judgeMethod === "llm_judge" ? "LLM" : p.judgeMethod}
                        </p>
                      </div>

                      {/* Model transition */}
                      <div className="flex items-center gap-2 shrink-0">
                        <ModelBadge model={p.fromModel} size="sm" />
                        <ArrowRight className="size-3.5 text-muted-foreground/60" />
                        <ModelBadge model={p.toModel} size="sm" />
                      </div>

                      {/* Parity */}
                      <div className="text-right shrink-0 w-20">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Parity</p>
                        <p className={cn(
                          "font-mono text-xs font-semibold",
                          parityPct >= 100 ? "text-brand" : parityPct >= 98 ? "text-foreground" : "text-amber-400"
                        )}>
                          {parityPct}%
                        </p>
                      </div>

                      {/* Savings */}
                      <div className="text-right shrink-0 w-24">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Est. savings</p>
                        <p className="font-mono text-xs font-semibold text-brand">
                          {formatCurrency(p.estMonthlySavings)}/mo
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isActing}
                          onClick={() => decideProposal(p.id, "reject")}
                          className="h-7 px-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/[0.06]"
                          title="Dismiss (30-day cooldown)"
                        >
                          <X className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          disabled={isActing}
                          onClick={() => decideProposal(p.id, "accept")}
                          className="h-7 px-3 text-[11px] bg-brand text-primary-foreground hover:bg-brand/85"
                        >
                          <Check className="size-3 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>
          )}

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
              <AreaChartWidget data={DAILY_COSTS} color="var(--primary)" height={240} formatValue={(v) => formatCurrency(v)} />
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
                const pctOfTotal = totalAgentSpend > 0 ? (agent.totalCost / totalAgentSpend) * 100 : 0;
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

          {/* ── Model Auto-Selection Savings ── */}
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-4">Model Auto-Selection</h3>
            {savings ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">If Always Tier 1</p>
                    <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(savings.tier1Cost)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actual Cost</p>
                    <p className="text-lg font-bold text-brand mt-1">{formatCurrency(savings.actualCost)}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Savings</p>
                    <p className="text-lg font-bold text-[#39FF14] mt-1">{formatCurrency(savings.savings)} <span className="text-xs font-normal text-muted-foreground">({savings.savingsPercent}%)</span></p>
                  </div>
                </div>
                {/* Tier distribution bar */}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tier Distribution ({savings.totalCalls} calls)</p>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
                    {savings.tierDistribution.tier1.percent > 0 && (
                      <div className="bg-purple-500/70 transition-all" style={{ width: `${savings.tierDistribution.tier1.percent}%` }} title={`Tier 1: ${savings.tierDistribution.tier1.percent}%`} />
                    )}
                    {savings.tierDistribution.tier2.percent > 0 && (
                      <div className="bg-brand/70 transition-all" style={{ width: `${savings.tierDistribution.tier2.percent}%` }} title={`Tier 2: ${savings.tierDistribution.tier2.percent}%`} />
                    )}
                    {savings.tierDistribution.tier3.percent > 0 && (
                      <div className="bg-green-500/70 transition-all" style={{ width: `${savings.tierDistribution.tier3.percent}%` }} title={`Tier 3: ${savings.tierDistribution.tier3.percent}%`} />
                    )}
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-purple-500/70" />T1: {savings.tierDistribution.tier1.percent}%</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-brand/70" />T2: {savings.tierDistribution.tier2.percent}%</span>
                    <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-green-500/70" />T3: {savings.tierDistribution.tier3.percent}%</span>
                    {savings.upgradeEvents > 0 && <span className="text-amber-400">{savings.upgradeEvents} upgrade{savings.upgradeEvents !== 1 ? "s" : ""}</span>}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No auto-selection data yet. Run agents with Auto strategy to see savings.</p>
            )}
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
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{totalAgentSpend > 0 ? ((agent.totalCost / totalAgentSpend) * 100).toFixed(1) : "0.0"}%</td>
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
          {budgets.length > 0 ? (
            <>
              {/* Total budget overview */}
              <GlassPanel padding="lg">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Total Monthly Budget</h3>
                    <p className="text-[11px] text-muted-foreground/70">
                      Sum of all category limits · spend calculated live from LLM calls
                    </p>
                  </div>
                  <Button onClick={openCreateBudget} size="sm" className="bg-brand hover:bg-brand/90 text-primary-foreground">
                    <Target className="size-3.5 mr-1.5" /> Add Budget
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-3xl font-bold text-foreground shrink-0">
                    {formatCurrency(monthlyBudget)}
                  </span>
                  <div className="flex-1">
                    <div className="w-full h-3 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={cn(
                          "h-3 rounded-full transition-all",
                          budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(budgetPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-1.5 block">
                      {formatCurrency(thisMonth)} spent · {budgetPct}% used ·{" "}
                      <span className={cn(underBudget < 0 && "text-red-400")}>
                        {formatCurrency(Math.abs(underBudget))} {underBudget < 0 ? "over" : "remaining"}
                      </span>
                    </span>
                  </div>
                </div>
              </GlassPanel>

              {/* Per-category budget rows */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Budgets</h3>
                {budgets.map((b) => {
                  const pct = b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
                  const overBudget = pct > 100;
                  const atAlert = pct >= Math.round(b.alertThreshold * 100);
                  return (
                    <GlassPanel key={b.id} padding="md">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-sm font-medium text-foreground truncate">{b.category}</h4>
                          {overBudget && (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-red-400">
                              <AlertTriangle className="size-2.5" /> Over
                            </span>
                          )}
                          {!overBudget && atAlert && (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-400">
                              Alert
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditBudget(b)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit budget"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeBudget(b.id, b.category)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400"
                            title="Remove budget"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            pct > 100 ? "bg-red-500" : pct > 90 ? "bg-red-500" : pct >= b.alertThreshold * 100 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground/60">
                        <span>{pct}% used</span>
                        <span>Alert at {Math.round(b.alertThreshold * 100)}%</span>
                      </div>
                    </GlassPanel>
                  );
                })}
              </div>

              {/* End-of-month projection */}
              {hasTrailingWindow && (
                <GlassPanel padding="lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">End-of-Month Projection</h3>
                      <p className="text-[11px] text-muted-foreground/70">
                        Based on trailing 7-day average spend · {daysRemaining} days remaining
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "font-mono text-2xl font-bold",
                        willExceedBudget ? "text-red-400" : "text-emerald-400"
                      )}>
                        {formatCurrency(projected)}
                      </span>
                      {monthlyBudget > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {willExceedBudget
                            ? `${formatCurrency(projected - monthlyBudget)} over budget`
                            : `${formatCurrency(monthlyBudget - projected)} under budget`}
                        </p>
                      )}
                    </div>
                  </div>
                </GlassPanel>
              )}
            </>
          ) : (
            /* Empty state — no budget configured */
            <>
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="flex items-center justify-center size-14 rounded-2xl bg-muted/30 border border-border/50">
                  <Target className="size-7 text-muted-foreground/25" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">No budget configured</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Set a monthly budget to track spending limits and get alerts before you overspend
                  </p>
                </div>
                <Button onClick={openCreateBudget} className="bg-brand hover:bg-brand/90 text-primary-foreground mt-2">
                  <Target className="size-4 mr-1.5" /> Set Monthly Budget
                </Button>
              </div>

              {/* Show actual spend even without budget */}
              {thisMonth > 0 && (
                <GlassPanel padding="lg">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Current Spend</h3>
                  <span className="font-mono text-2xl font-bold text-foreground">{formatCurrency(thisMonth)}</span>
                  <p className="text-xs text-muted-foreground mt-1">Total spend this month (no budget limit set)</p>
                </GlassPanel>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ INVOICES ═══ */}
      {tab === "invoices" && (
        INVOICES.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Download className="size-8 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">No invoices yet</p>
            <p className="text-xs text-muted-foreground/50">Invoices will appear here at the end of each billing cycle</p>
          </div>
        ) : (
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
        )
      )}

      {/* ─── Budget modal ─── */}
      <ModalShell
        open={budgetModalOpen}
        onClose={() => !budgetSaving && setBudgetModalOpen(false)}
        dismissable={!budgetSaving}
        className="w-full max-w-md"
      >
        <div className="rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Target className="size-4 text-brand" />
              <h3 className="text-sm font-semibold text-foreground">
                {editingBudgetId ? "Edit budget" : "Set monthly budget"}
              </h3>
            </div>
            <button
              onClick={() => !budgetSaving && setBudgetModalOpen(false)}
              disabled={budgetSaving}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="px-5 py-5 space-y-5">
            {/* Category */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Category
              </label>
              <Input
                type="text"
                value={budgetForm.category}
                onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                placeholder="e.g. Monthly, Models, Compute"
                disabled={!!editingBudgetId || budgetSaving}
                className="h-9 text-sm"
              />
              {!editingBudgetId && (
                <p className="mt-1 text-[11px] text-muted-foreground/60">
                  Budgets with the same category replace each other. Create multiple for per-team / per-workload tracking.
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                Monthly limit (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60">$</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={budgetForm.limit}
                  onChange={(e) => setBudgetForm({ ...budgetForm, limit: e.target.value })}
                  placeholder="500"
                  disabled={budgetSaving}
                  className="h-9 text-sm pl-7 font-mono"
                  autoFocus
                />
              </div>
            </div>

            {/* Alert threshold */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Alert threshold
                </label>
                <span className="font-mono text-xs text-foreground">{budgetForm.alertThreshold}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={budgetForm.alertThreshold}
                onChange={(e) => setBudgetForm({ ...budgetForm, alertThreshold: Number(e.target.value) })}
                disabled={budgetSaving}
                className="w-full accent-brand disabled:opacity-50"
              />
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                {budgetForm.limit && parseFloat(budgetForm.limit) > 0
                  ? <>Warning fires at <span className="font-mono text-foreground/80">{formatCurrency(parseFloat(budgetForm.limit) * budgetForm.alertThreshold / 100)}</span> of spend</>
                  : "Warning fires when spend reaches this % of the limit"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              variant="ghost"
              onClick={() => setBudgetModalOpen(false)}
              disabled={budgetSaving}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={saveBudget}
              disabled={budgetSaving}
              className="bg-brand hover:bg-brand/90 text-primary-foreground min-w-[96px]"
            >
              {budgetSaving ? (
                <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Saving...</>
              ) : editingBudgetId ? "Save changes" : "Create budget"}
            </Button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
