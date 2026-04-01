"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Eye } from "lucide-react";
import { useAgentsStore } from "@/stores/agents-store";
import { formatRelativeTime, formatNumber, formatCurrency } from "@/lib/format";
import {
  PageHeader,
  LiveIndicator,
  DataTable,
  StatusBadge,
  ModelBadge,
} from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { Agent } from "@/types/agents";

const columns = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (item: Agent) => (
      <div className="min-w-0">
        <div className="font-semibold text-foreground truncate">{item.name}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
          {item.description}
        </div>
      </div>
    ),
  },
  {
    key: "model",
    label: "Model",
    sortable: true,
    render: (item: Agent) => <ModelBadge model={item.model} size="sm" />,
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (item: Agent) => <StatusBadge status={item.status} size="sm" />,
  },
  {
    key: "tasksCompleted",
    label: "Tasks",
    sortable: true,
    render: (item: Agent) => (
      <span className="font-mono text-sm">{item.tasksCompleted.toLocaleString()}</span>
    ),
  },
  {
    key: "errorRate",
    label: "Error Rate",
    sortable: true,
    render: (item: Agent) => (
      <span
        className={`font-mono text-sm ${
          item.errorRate > 5
            ? "text-red-400"
            : item.errorRate > 2
            ? "text-amber-400"
            : "text-green-400"
        }`}
      >
        {item.errorRate.toFixed(1)}%
      </span>
    ),
  },
  {
    key: "tokenUsage",
    label: "Tokens",
    sortable: true,
    render: (item: Agent) => (
      <span className="font-mono text-sm">{formatNumber(item.tokenUsage)}</span>
    ),
  },
  {
    key: "avgLatency",
    label: "Avg Latency",
    sortable: true,
    render: (item: Agent) => (
      <span className="font-mono text-sm">{item.avgLatency}ms</span>
    ),
  },
  {
    key: "costPerHour",
    label: "Cost/hr",
    sortable: true,
    render: (item: Agent) => (
      <span className="font-mono text-sm">{formatCurrency(item.costPerHour)}</span>
    ),
  },
  {
    key: "lastRun",
    label: "Last Run",
    sortable: true,
    render: (item: Agent) => (
      <span className="text-xs text-muted-foreground" suppressHydrationWarning>
        {formatRelativeTime(item.lastRun)}
      </span>
    ),
  },
  {
    key: "actions",
    label: "",
    render: (item: Agent) => (
      <Link href={`/agents/${item.id}`} onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon-xs">
          <Eye className="size-3.5" />
        </Button>
      </Link>
    ),
  },
];

export default function AgentsPage() {
  const router = useRouter();
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    modelFilter,
    setModelFilter,
    getFilteredAgents,
    fetch: fetchAgents,
  } = useAgentsStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAgents(); }, []);

  const agents = getFilteredAgents();

  return (
    <div className="space-y-6">
      <PageHeader title="AI Agents" description="Monitor, manage, and deploy autonomous AI agents">
        <LiveIndicator />
        <Link href="/agents/builder">
          <Button size="sm">
            <Plus className="size-3.5 mr-1" />
            Create Agent
          </Button>
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(val) =>
            val && setStatusFilter(val as typeof statusFilter)
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="idle">Idle</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="deploying">Deploying</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={modelFilter}
          onValueChange={(val) =>
            val && setModelFilter(val as typeof modelFilter)
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            <SelectItem value="Claude">Claude</SelectItem>
            <SelectItem value="GPT-4">GPT-4</SelectItem>
            <SelectItem value="Gemini">Gemini</SelectItem>
            <SelectItem value="Custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <DataTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        columns={columns as any}
        data={agents as unknown as Record<string, unknown>[]}
        onRowClick={(item) => {
          const agent = item as unknown as Agent;
          router.push(`/agents/${agent.id}`);
        }}
        emptyMessage="No agents match your filters."
      />
    </div>
  );
}
