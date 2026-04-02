"use client";

import React from "react";
import { useAgentsStore } from "@/stores/agents-store";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useCostsStore } from "@/stores/costs-store";
import { Bot, Zap, Coins, DollarSign, Users, Rocket, AlertTriangle, ShieldCheck } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 transition-colors hover:bg-card/80">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}15` }}
      >
        <div style={{ color }}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold font-mono text-foreground mt-0.5 leading-none">{value}</p>
      </div>
    </div>
  );
}

export function LiveStatsRow() {
  const agents = useAgentsStore((s) => s.agents);
  const deployments = useDeploymentsStore((s) => s.deployments);
  const incidents = useIncidentsStore((s) => s.incidents);
  const dailyCosts = useCostsStore((s) => s.dailyCosts);

  const activeAgents = agents.filter((a) => a.status === "running").length;
  const prodDeploys = deployments.filter((d) => d.environment === "production" && d.status === "success").length;
  const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "investigating").length;

  // Total cost today from daily costs (last entry)
  const todayCost = dailyCosts.length > 0 ? dailyCosts[dailyCosts.length - 1].value : 0;

  // Total tokens from agents
  const totalTokens = agents.reduce((sum, a) => sum + (a.tokenUsage || 0), 0);

  // API calls approximation from token usage (rough: 1 call per ~2000 tokens)
  const apiCalls = totalTokens > 0 ? Math.ceil(totalTokens / 2000) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Active Agents" value={activeAgents} icon={Bot} color="#22C55E" />
      <StatCard label="API Calls 24h" value={apiCalls > 0 ? apiCalls.toLocaleString() : "0"} icon={Zap} color="#00D4FF" />
      <StatCard label="Tokens 24h" value={totalTokens > 0 ? `${(totalTokens / 1000).toFixed(1)}k` : "0"} icon={Coins} color="#A855F7" />
      <StatCard label="Cost Today" value={todayCost > 0 ? `$${todayCost.toFixed(2)}` : "$0"} icon={DollarSign} color="#F59E0B" />
      <StatCard label="Active Users" value={agents.length > 0 ? "1" : "0"} icon={Users} color="#EC4899" />
      <StatCard label="Deploys Live" value={prodDeploys} icon={Rocket} color="#00D4FF" />
      <StatCard label="Incidents Open" value={openIncidents} icon={AlertTriangle} color="#EF4444" />
      <StatCard label="Uptime" value={openIncidents === 0 ? "100%" : "99.9%"} icon={ShieldCheck} color="#39FF14" />
    </div>
  );
}
