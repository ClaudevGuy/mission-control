"use client";

import React, { useState, useCallback } from "react";
import { MetricCard } from "@/components/shared";
import { useAgentsStore } from "@/stores/agents-store";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { usePolling } from "@/lib/hooks/use-polling";
import {
  Bot,
  Zap,
  Coins,
  DollarSign,
  Users,
  Rocket,
  AlertTriangle,
  Activity,
} from "lucide-react";

function simpleJitter(value: number, pct: number) {
  return value + (Math.random() - 0.5) * 2 * (value * pct / 100);
}

function makeSparkData(base: number, len = 12) {
  const data: number[] = [];
  let v = base;
  for (let i = 0; i < len; i++) {
    v = simpleJitter(v, 5);
    data.push(Math.round(v));
  }
  return data;
}

export function LiveStatsRow() {
  const agents = useAgentsStore((s) => s.agents);
  const deployments = useDeploymentsStore((s) => s.deployments);
  const incidents = useIncidentsStore((s) => s.incidents);

  const activeAgents = agents.filter((a) => a.status === "running").length;
  const prodDeploys = deployments.filter((d) => d.environment === "production" && d.status === "success").length;
  const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "investigating").length;

  const [mockStats, setMockStats] = useState({
    apiCalls: 45200,
    tokenUsage: 2800000,
    costToday: 127.43,
    activeUsers: 342,
    uptime: 99.97,
  });

  const [sparklines, setSparklines] = useState({
    agents: makeSparkData(activeAgents),
    api: makeSparkData(45200),
    tokens: makeSparkData(2800000),
    cost: makeSparkData(127),
    users: makeSparkData(342),
    deploys: makeSparkData(prodDeploys),
    incidents: makeSparkData(openIncidents),
    uptime: makeSparkData(99.97),
  });

  const tick = useCallback(() => {
    setMockStats((prev) => ({
      apiCalls: Math.round(simpleJitter(prev.apiCalls, 2)),
      tokenUsage: Math.round(simpleJitter(prev.tokenUsage, 1)),
      costToday: parseFloat(simpleJitter(prev.costToday, 1.5).toFixed(2)),
      activeUsers: Math.round(simpleJitter(prev.activeUsers, 3)),
      uptime: parseFloat(Math.min(100, simpleJitter(prev.uptime, 0.01)).toFixed(2)),
    }));
    setSparklines((prev) => ({
      agents: [...prev.agents.slice(1), activeAgents],
      api: [...prev.api.slice(1), Math.round(simpleJitter(45200, 2))],
      tokens: [...prev.tokens.slice(1), Math.round(simpleJitter(2800000, 1))],
      cost: [...prev.cost.slice(1), Math.round(simpleJitter(127, 1.5))],
      users: [...prev.users.slice(1), Math.round(simpleJitter(342, 3))],
      deploys: [...prev.deploys.slice(1), prodDeploys],
      incidents: [...prev.incidents.slice(1), openIncidents],
      uptime: [...prev.uptime.slice(1), parseFloat(simpleJitter(99.97, 0.01).toFixed(2))],
    }));
  }, [activeAgents, prodDeploys, openIncidents]);

  usePolling(tick, 4000);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MetricCard
        label="Active Agents"
        value={activeAgents}
        icon={Bot}
        color="#22C55E"
        trend={2.4}
        sparkData={sparklines.agents}
      />
      <MetricCard
        label="API Calls 24h"
        value={mockStats.apiCalls}
        icon={Zap}
        color="#00D4FF"
        trend={5.1}
        sparkData={sparklines.api}
      />
      <MetricCard
        label="Token Usage 24h"
        value={mockStats.tokenUsage}
        format="tokens"
        icon={Coins}
        color="#A855F7"
        trend={-1.2}
        sparkData={sparklines.tokens}
      />
      <MetricCard
        label="Total Cost Today"
        value={mockStats.costToday}
        format="currency"
        icon={DollarSign}
        color="#F59E0B"
        trend={3.8}
        sparkData={sparklines.cost}
      />
      <MetricCard
        label="Active Users"
        value={mockStats.activeUsers}
        icon={Users}
        color="#06B6D4"
        trend={1.7}
        sparkData={sparklines.users}
      />
      <MetricCard
        label="Deployments Live"
        value={prodDeploys}
        icon={Rocket}
        color="#00D4FF"
        trend={0}
        sparkData={sparklines.deploys}
      />
      <MetricCard
        label="Incidents Open"
        value={openIncidents}
        icon={AlertTriangle}
        color="#EF4444"
        trend={-8.3}
        sparkData={sparklines.incidents}
      />
      <MetricCard
        label="Uptime %"
        value={mockStats.uptime}
        format="percent"
        icon={Activity}
        color="#22C55E"
        trend={0.01}
        sparkData={sparklines.uptime}
      />
    </div>
  );
}
