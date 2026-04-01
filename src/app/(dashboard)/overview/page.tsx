"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/shared";
import { SystemHealthBar } from "@/components/overview/SystemHealthBar";
import { LiveStatsRow } from "@/components/overview/LiveStatsRow";
import { QuickActions } from "@/components/overview/QuickActions";
import { AgentStatusGrid } from "@/components/overview/AgentStatusGrid";
import { CostBurnChart } from "@/components/overview/CostBurnChart";
import { TopIssues } from "@/components/overview/TopIssues";
import { RecentDeploys } from "@/components/overview/RecentDeploys";
import { useAgentsStore } from "@/stores/agents-store";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useCostsStore } from "@/stores/costs-store";
import { useNotificationsStore } from "@/stores/notifications-store";

export default function OverviewPage() {
  const fetchAgents = useAgentsStore((s) => s.fetch);
  const fetchDeployments = useDeploymentsStore((s) => s.fetch);
  const fetchIncidents = useIncidentsStore((s) => s.fetch);
  const fetchCosts = useCostsStore((s) => s.fetch);
  const fetchNotifications = useNotificationsStore((s) => s.fetch);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAgents();
    fetchDeployments();
    fetchIncidents();
    fetchCosts();
    fetchNotifications();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Mission Control" description="Real-time operational overview" />
      <SystemHealthBar />
      <LiveStatsRow />
      <QuickActions />
      <AgentStatusGrid />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CostBurnChart />
        <TopIssues />
        <RecentDeploys />
      </div>
    </div>
  );
}
