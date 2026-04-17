"use client";

import React, { useState } from "react";
import { useAgentsStore } from "@/stores/agents-store";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useCostsStore } from "@/stores/costs-store";
import {
  Bot, AlertCircle, DollarSign, Activity,
  Zap, Coins, Rocket, AlertTriangle,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Stat card — editorial, restrained, monochrome with semantic accents ──
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tone?: "neutral" | "success" | "danger" | "warn";
  pulse?: boolean;
  delta?: { value: number; unit?: "%" | "" };
  caption?: string;
}

function StatCard({ label, value, icon: Icon, tone = "neutral", pulse, delta, caption }: StatCardProps) {
  const toneColor =
    tone === "success" ? "#00d992" :
    tone === "danger"  ? "#EF4444" :
    tone === "warn"    ? "#F59E0B" :
    "var(--primary)";

  const toneRgb =
    tone === "success" ? "0, 217, 146" :
    tone === "danger"  ? "239, 68, 68" :
    tone === "warn"    ? "245, 158, 11" :
    "var(--brand-rgb-raw, 245, 241, 232)";

  const deltaPositive = delta && delta.value > 0;
  const deltaTone =
    !delta ? null :
    delta.value === 0 ? "text-muted-foreground/50" :
    deltaPositive ? (tone === "danger" ? "text-[#EF4444]" : "text-[#00d992]") :
    (tone === "danger" ? "text-[#00d992]" : "text-muted-foreground/60");

  return (
    <div
      className="group relative overflow-hidden rounded-xl border bg-card/60 px-4 py-4 transition-all duration-300"
      style={{
        borderColor: "rgb(var(--ink-rgb) / 0.08)",
        boxShadow: "0 0 0 rgba(0,0,0,0)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 1px rgb(${toneRgb} / 0.25), 0 6px 20px rgb(${toneRgb} / 0.06)`;
        e.currentTarget.style.borderColor = `rgb(${toneRgb} / 0.22)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 0 0 rgba(0,0,0,0)";
        e.currentTarget.style.borderColor = "rgb(var(--ink-rgb) / 0.08)";
      }}
    >
      {/* Accent hairline at the top, glows in on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-4 right-4 top-0 h-px opacity-40 transition-opacity duration-300 group-hover:opacity-90"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${toneColor} 50%, transparent 100%)` }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-3 min-w-0">
          {/* Label + icon */}
          <div className="flex items-center gap-2">
            <span
              className="relative inline-flex size-6 items-center justify-center rounded-md"
              style={{
                background: `rgb(${toneRgb} / 0.1)`,
                border: `1px solid rgb(${toneRgb} / 0.18)`,
              }}
            >
              <Icon className="size-3" style={{ color: toneColor }} />
              {pulse && (
                <span className="absolute -top-0.5 -right-0.5 flex size-1.5">
                  <span
                    className="absolute inline-flex size-full rounded-full opacity-75 animate-ping"
                    style={{ background: toneColor, animationDuration: "2s" }}
                  />
                  <span
                    className="relative inline-flex size-1.5 rounded-full"
                    style={{ background: toneColor }}
                  />
                </span>
              )}
            </span>
            <p className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground/70">{label}</p>
          </div>

          {/* Value */}
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-serif text-[28px] leading-[1] tracking-[-0.02em] text-foreground tabular-nums truncate">
              {value}
            </span>
            {delta && (
              <span className={cn("flex items-center gap-0.5 font-mono text-[10px] tabular-nums", deltaTone)}>
                {delta.value > 0 ? <ArrowUpRight className="size-3" /> :
                 delta.value < 0 ? <ArrowDownRight className="size-3" /> : null}
                {Math.abs(delta.value).toFixed(delta.unit === "%" ? 0 : 2)}{delta.unit ?? ""}
              </span>
            )}
          </div>

          {caption && (
            <p className="text-[10px] text-muted-foreground/55 leading-snug -mt-1.5">{caption}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function LiveStatsRow() {
  const [showMore, setShowMore] = useState(false);
  const agents = useAgentsStore((s) => s.agents);
  const deployments = useDeploymentsStore((s) => s.deployments);
  const incidents = useIncidentsStore((s) => s.incidents);
  const dailyCosts = useCostsStore((s) => s.dailyCosts);

  const activeAgents = agents.filter((a) => a.status === "running").length;
  const failingAgents = agents.filter((a) => a.status === "error").length;
  const prodDeploys = deployments.filter((d) => d.environment === "production" && d.status === "success").length;
  const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "investigating").length;
  const todayCost = dailyCosts.length > 0 ? dailyCosts[dailyCosts.length - 1].value : 0;
  const yesterdayCost = dailyCosts.length > 1 ? dailyCosts[dailyCosts.length - 2].value : 0;
  const costDeltaPct = yesterdayCost > 0 ? ((todayCost - yesterdayCost) / yesterdayCost) * 100 : 0;
  const totalTokens = agents.reduce((sum, a) => sum + (a.tokenUsage || 0), 0);
  const apiCalls = totalTokens > 0 ? Math.ceil(totalTokens / 2000) : 0;
  const totalRuns = agents.reduce((sum, a) => sum + (a.tasksCompleted || 0), 0);

  return (
    <div className="space-y-3">
      {/* Primary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Active Agents"
          value={activeAgents}
          icon={Bot}
          tone="success"
          pulse={activeAgents > 0}
          caption={activeAgents === 0 ? "Nothing is running" : `${activeAgents} running right now`}
        />
        <StatCard
          label="Failing Agents"
          value={failingAgents}
          icon={AlertCircle}
          tone={failingAgents > 0 ? "danger" : "neutral"}
          pulse={failingAgents > 0}
          caption={failingAgents === 0 ? "All green" : "Needs attention"}
        />
        <StatCard
          label="Cost Today"
          value={todayCost > 0 ? `$${todayCost.toFixed(2)}` : "$0"}
          icon={DollarSign}
          tone="warn"
          delta={yesterdayCost > 0 ? { value: costDeltaPct, unit: "%" } : undefined}
          caption={yesterdayCost > 0 ? "vs. yesterday" : "No history yet"}
        />
        <StatCard
          label="Runs Today"
          value={totalRuns.toLocaleString()}
          icon={Activity}
          tone="neutral"
          caption={totalRuns === 0 ? "No runs yet" : `Lifetime across all agents`}
        />
      </div>

      {/* Collapsible secondary */}
      <div className="flex items-center gap-3 pl-1">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground/45 hover:text-muted-foreground transition-colors"
        >
          {showMore ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {showMore ? "Hide" : "More stats"}
        </button>
        <span className="h-px flex-1 bg-border/40" />
      </div>

      {showMore && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <StatCard label="API Calls 24h" value={apiCalls > 0 ? apiCalls.toLocaleString() : "0"} icon={Zap} tone="neutral" />
          <StatCard label="Tokens 24h" value={totalTokens > 0 ? `${(totalTokens / 1000).toFixed(1)}k` : "0"} icon={Coins} tone="neutral" />
          <StatCard label="Deploys Live" value={prodDeploys} icon={Rocket} tone="neutral" />
          <StatCard label="Incidents Open" value={openIncidents} icon={AlertTriangle} tone={openIncidents > 0 ? "danger" : "neutral"} />
        </div>
      )}
    </div>
  );
}
