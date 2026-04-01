"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared";
import { useCostsStore } from "@/stores/costs-store";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Tooltip style ─────────────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    fontSize: 12,
  },
  labelStyle: { color: "hsl(var(--muted-foreground))" },
};

// ── Mock data helpers ─────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function makeRunsData() {
  return DAYS.map((day) => ({
    day,
    successful: Math.floor(Math.random() * 80 + 40),
    failed: Math.floor(Math.random() * 12 + 2),
  }));
}

function makeTokenData() {
  return DAYS.map((day) => ({
    day,
    input: Math.floor(Math.random() * 200000 + 100000),
    output: Math.floor(Math.random() * 80000 + 20000),
  }));
}

const AGENT_NAMES = ["BugHunter", "CodeReview", "Deployer", "Monitor", "Tester"];

function makeAgentRunCounts() {
  return AGENT_NAMES.map((name) => ({ name, runs: Math.floor(Math.random() * 120 + 20) }));
}

function makeAgentCosts() {
  return AGENT_NAMES.map((name) => ({
    name,
    cost: parseFloat((Math.random() * 18 + 2).toFixed(2)),
  }));
}

const MODEL_BREAKDOWN = [
  { model: "claude-3-5-sonnet", calls: 312 },
  { model: "claude-3-5-haiku",  calls: 189 },
  { model: "gpt-4o",           calls: 74  },
  { model: "gemini-1.5-pro",   calls: 28  },
];
const MODEL_TOTAL = MODEL_BREAKDOWN.reduce((s, m) => s + m.calls, 0);

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = "performance" | "costs" | "usage";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("performance");
  const fetchCosts = useCostsStore((s) => s.fetch);
  const dailyCosts = useCostsStore((s) => s.dailyCosts);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  // Stable mock data (computed once, not inside render)
  const [runsData]    = useState(makeRunsData);
  const [tokenData]   = useState(makeTokenData);
  const [agentRuns]   = useState(makeAgentRunCounts);
  const [agentCosts]  = useState(makeAgentCosts);

  const burnData = dailyCosts.slice(-7).map((d) => ({
    day: d.date ? d.date.slice(5) : "",
    cost: d.value ?? 0,
  }));

  const tabs: { id: Tab; label: string }[] = [
    { id: "performance", label: "Performance" },
    { id: "costs",       label: "Costs"       },
    { id: "usage",       label: "Usage"       },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Analytics"
        description="Performance, cost, and usage metrics across all agents"
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Performance ───────────────────────────────────────────────────── */}
      {tab === "performance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Runs (7d)"  value="847"   sub="+12% vs last week" />
            <StatCard label="Success Rate"     value="94.2%" sub="↑ 1.3pp" />
            <StatCard label="Avg Run Duration" value="1m 23s" sub="↓ 8s vs last week" />
            <StatCard label="Agents Active"    value="5"     sub="of 8 deployed" />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-sm font-medium text-foreground">Agent Runs — Last 7 Days</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={runsData}>
                <defs>
                  <linearGradient id="gradSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00D4FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="successful" stroke="#00D4FF" strokeWidth={2} fill="url(#gradSuccess)" name="Successful" />
                <Area type="monotone" dataKey="failed"     stroke="#EF4444" strokeWidth={2} fill="url(#gradFailed)"  name="Failed"     />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-sm font-medium text-foreground">Runs by Agent</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentRuns} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number"   tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="runs" fill="#00D4FF" radius={[0, 4, 4, 0]} name="Runs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Costs ─────────────────────────────────────────────────────────── */}
      {tab === "costs" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Spend (7d)"     value="$284.50"   sub="budget: $500"       />
            <StatCard label="Cost per Run"         value="$0.34"     sub="↑ $0.02"             />
            <StatCard label="Most Expensive Agent" value="BugHunter" sub="$98.20 this week"    />
            <StatCard label="Cost Efficiency"      value="2.8x"      sub="successful runs per $1" />
          </div>

          {burnData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="mb-4 text-sm font-medium text-foreground">Daily Cost Burn</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={burnData}>
                  <defs>
                    <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00D4FF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip {...tooltipStyle} formatter={(v: unknown) => [`$${(v as number).toFixed(2)}`, "Cost"]} />
                  <Area type="monotone" dataKey="cost" stroke="#00D4FF" strokeWidth={2} fill="url(#gradCost)" name="Cost" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-sm font-medium text-foreground">Cost by Agent (7d)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agentCosts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number"   tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip {...tooltipStyle} formatter={(v: unknown) => [`$${(v as number).toFixed(2)}`, "Cost"]} />
                <Bar dataKey="cost" fill="#00D4FF" radius={[0, 4, 4, 0]} name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Usage ─────────────────────────────────────────────────────────── */}
      {tab === "usage" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Tokens (7d)"  value="4.2M"  sub="input + output"      />
            <StatCard label="Avg Tokens / Run"   value="4,960" sub="↓ 3% vs last week"   />
            <StatCard label="Context Hits Limit" value="12"    sub="runs truncated"       />
            <StatCard label="Model Calls"        value="603"   sub="across 4 models"      />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-sm font-medium text-foreground">Token Usage — Last 7 Days</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={tokenData}>
                <defs>
                  <linearGradient id="gradInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00D4FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00D4FF" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gradOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#A855F7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v: unknown) => [`${((v as number) / 1000).toFixed(1)}k tokens`, ""]} />
                <Area type="monotone" dataKey="input"  stroke="#00D4FF" strokeWidth={2} fill="url(#gradInput)"  name="Input tokens"  />
                <Area type="monotone" dataKey="output" stroke="#A855F7" strokeWidth={2} fill="url(#gradOutput)" name="Output tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-4 text-sm font-medium text-foreground">Model Breakdown</p>
            <div className="space-y-3">
              {MODEL_BREAKDOWN.map((m) => {
                const pct = Math.round((m.calls / MODEL_TOTAL) * 100);
                return (
                  <div key={m.model} className="flex items-center gap-3">
                    <span className="w-44 text-xs text-muted-foreground font-mono truncate">{m.model}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-cyan" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs text-muted-foreground">{m.calls}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
