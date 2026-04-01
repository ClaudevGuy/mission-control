"use client";

import React from "react";
import { MetricCard } from "@/components/shared";
import { useAgentsStore } from "@/stores/agents-store";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { Bot, Rocket, AlertTriangle } from "lucide-react";

export function LiveStatsRow() {
  const agents = useAgentsStore((s) => s.agents);
  const deployments = useDeploymentsStore((s) => s.deployments);
  const incidents = useIncidentsStore((s) => s.incidents);

  const activeAgents = agents.filter((a) => a.status === "running").length;
  const prodDeploys = deployments.filter((d) => d.environment === "production" && d.status === "success").length;
  const openIncidents = incidents.filter((i) => i.status === "open" || i.status === "investigating").length;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <MetricCard
        label="Active Agents"
        value={activeAgents}
        icon={Bot}
        color="#22C55E"
      />
      <MetricCard
        label="Deployments Live"
        value={prodDeploys}
        icon={Rocket}
        color="#00D4FF"
      />
      <MetricCard
        label="Incidents Open"
        value={openIncidents}
        icon={AlertTriangle}
        color="#EF4444"
      />
    </div>
  );
}
