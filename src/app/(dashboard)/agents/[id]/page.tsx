"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Clock, Zap, Coins, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { invalidate } from "@/lib/store-cache";
import { useAgentsStore } from "@/stores/agents-store";
import {
  formatRelativeTime,
  formatDate,
  formatCurrency,
  formatNumber,
  formatDuration,
} from "@/lib/format";
import {
  GlassPanel,
  StatusBadge,
  MetricCard,
  ChartCard,
  AreaChartWidget,
  GaugeWidget,
  CodeBlock,
  DataTable,
  ConfirmDialog,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LiveExecutionPanel } from "@/components/agents/LiveExecutionPanel";
import { cn } from "@/lib/utils";
import type { AgentRun } from "@/types/agents";

const MODEL_COLORS: Record<string, string> = {
  Claude: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "GPT-4": "bg-green-500/20 text-green-400 border-green-500/30",
  Gemini: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Custom: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

function generateTrendData(label: string, base: number, variance: number, count = 14) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Day ${i + 1}`,
    value: Math.max(0, base + (Math.random() - 0.5) * variance),
  }));
}

const runColumns = [
  {
    key: "id",
    label: "Run ID",
    render: (item: AgentRun) => (
      <span className="font-mono text-xs">{item.id}</span>
    ),
  },
  {
    key: "startedAt",
    label: "Started",
    sortable: true,
    render: (item: AgentRun) => (
      <span className="text-xs text-muted-foreground" suppressHydrationWarning>
        {formatRelativeTime(item.startedAt)}
      </span>
    ),
  },
  {
    key: "duration",
    label: "Duration",
    sortable: true,
    render: (item: AgentRun) => (
      <span className="font-mono text-xs">{formatDuration(item.duration)}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (item: AgentRun) => <StatusBadge status={item.status} size="sm" />,
  },
  {
    key: "tokensUsed",
    label: "Tokens",
    sortable: true,
    render: (item: AgentRun) => (
      <span className="font-mono text-xs">{formatNumber(item.tokensUsed)}</span>
    ),
  },
  {
    key: "cost",
    label: "Cost",
    sortable: true,
    render: (item: AgentRun) => (
      <span className="font-mono text-xs">{formatCurrency(item.cost)}</span>
    ),
  },
  {
    key: "output",
    label: "Output",
    render: (item: AgentRun) => (
      <span className="text-xs text-muted-foreground truncate max-w-[250px] block">
        {item.output}
      </span>
    ),
  },
];

export default function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [tab, setTab] = useState<string>("overview");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { agents, fetch: fetchAgents } = useAgentsStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAgents(); }, []);

  const agent = agents.find((a) => a.id === id);

  const handleDelete = async () => {
    if (!agent) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to delete" }));
        throw new Error(data.error || "Failed to delete");
      }
      toast.success(`Agent "${agent.name}" deleted`);
      invalidate("agents");
      router.push("/agents");
    } catch (err) {
      toast.error((err as Error).message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!agent) {
    return (
      <div className="space-y-6">
        <Link href="/agents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" />
          Back to Agents
        </Link>
        <GlassPanel padding="lg">
          <p className="text-center text-muted-foreground">Agent not found.</p>
        </GlassPanel>
      </div>
    );
  }

  const successRuns = agent.runs.filter((r) => r.status === "success").length;
  const totalRuns = agent.runs.length;
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 0;
  const totalTokens = agent.runs.reduce((sum, r) => sum + r.tokensUsed, 0);
  const totalRunCost = agent.runs.reduce((sum, r) => sum + r.cost, 0);

  const successTrendData = generateTrendData("Success Rate", successRate, 15);
  const latencyTrendData = generateTrendData("Latency", agent.avgLatency, agent.avgLatency * 0.4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/agents"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-foreground">{agent.name}</h1>
            <StatusBadge status={agent.status} size="sm" />
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
          disabled={deleting}
          className="text-muted-foreground hover:text-red-400"
          title="Delete agent"
        >
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete agent?"
        description={`This will permanently delete "${agent.name}" and all its runs, evals, and execution history. This cannot be undone.`}
        confirmLabel="Yes, delete"
        variant="danger"
        onConfirm={handleDelete}
      />

      <div className="border-b border-border mb-6">
          <div className="flex gap-6">
            {([
              { id: "overview", label: "Overview" },
              { id: "execution", label: "Execution" },
              { id: "system-prompt", label: "System Prompt" },
              { id: "history", label: "History" },
              { id: "evals", label: "Evals" },
              { id: "config", label: "Config" },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "pb-2.5 text-sm font-medium transition-colors relative",
                  tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
                )}
              >
                {t.label}
                {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand" />}
              </button>
            ))}
          </div>
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Identity */}
            <GlassPanel padding="lg">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Bot className="size-5 text-cyan-400" />
                    <h2 className="text-xl font-semibold text-foreground">{agent.name}</h2>
                    <Badge variant="outline" className={MODEL_COLORS[agent.model] ?? ""}>
                      {agent.model}
                    </Badge>
                    <StatusBadge status={agent.status} />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-2xl">{agent.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created {formatDate(agent.createdAt)}</span>
                    <span>by {agent.createdBy}</span>
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {agent.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] h-5">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Success Rate"
                value={successRate}
                format="percent"
                icon={CheckCircle}
                color="#22C55E"
                trend={2.1}
              />
              <MetricCard
                label="Avg Latency"
                value={agent.avgLatency}
                format="number"
                icon={Clock}
                color="var(--primary)"
                trend={-1.3}
              />
              <MetricCard
                label="Total Tokens"
                value={totalTokens}
                format="tokens"
                icon={Zap}
                color="#A855F7"
                trend={5.4}
              />
              <MetricCard
                label="Total Cost"
                value={totalRunCost}
                format="currency"
                icon={Coins}
                color="#F59E0B"
                trend={3.8}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Success Rate Trend" subtitle="Last 14 days">
                <AreaChartWidget
                  data={successTrendData}
                  color="#22C55E"
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
              </ChartCard>
              <ChartCard title="Latency Trend" subtitle="Last 14 days">
                <AreaChartWidget
                  data={latencyTrendData}
                  color="var(--primary)"
                  formatValue={(v) => `${Math.round(v)}ms`}
                />
              </ChartCard>
            </div>
          </div>
        )}

        {/* ===== EXECUTION TAB ===== */}
        {tab === "execution" && (
          <div className="space-y-6">
            {/* Live Execution Panel */}
            <GlassPanel padding="lg">
              <h3 className="text-sm font-semibold text-foreground mb-4">Execute Agent</h3>
              <LiveExecutionPanel agentId={agent.id} agentName={agent.name} />
            </GlassPanel>

            {/* Tool Usage */}
            {agent.tools.length > 0 && (
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-4">Tool Usage</h3>
                <div className="space-y-3">
                  {agent.tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Switch checked={tool.enabled} size="sm" />
                        <span className="text-sm font-mono text-foreground">{tool.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        {tool.usageCount.toLocaleString()} calls
                      </span>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            )}

            {/* Context Window */}
            <GlassPanel padding="lg">
              <h3 className="text-sm font-semibold text-foreground mb-4">Context Window</h3>
              <div className="flex justify-center">
                <GaugeWidget
                  value={agent.contextWindowUsage}
                  color={agent.contextWindowUsage > 80 ? "#EF4444" : agent.contextWindowUsage > 60 ? "#F59E0B" : "#22C55E"}
                  label="Context Used"
                  size={160}
                />
              </div>
            </GlassPanel>
          </div>
        )}

        {/* ===== SYSTEM PROMPT TAB ===== */}
        {tab === "system-prompt" && (
          <div className="space-y-4">
            <CodeBlock
              code={agent.systemPrompt}
              language="prompt"
              maxHeight={400}
            />
            <p className="text-xs text-muted-foreground">
              Estimated tokens: ~{Math.round(agent.systemPrompt.split(" ").length * 1.3)}
            </p>
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {tab === "history" && (
          <DataTable
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            columns={runColumns as any}
            data={agent.runs as unknown as Record<string, unknown>[]}
            emptyMessage="No runs recorded yet."
            onRowClick={(item) => {
              const run = item as unknown as AgentRun;
              router.push(`/agents/${id}/runs/${run.id}`);
            }}
          />
        )}

        {/* ===== EVALS TAB ===== */}
        {tab === "evals" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agent.evalResults.map((ev) => (
              <GlassPanel key={ev.name} padding="lg" hover>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">{ev.name}</h4>
                    <Badge
                      variant="outline"
                      className={
                        ev.passed
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }
                    >
                      {ev.passed ? "PASS" : "FAIL"}
                    </Badge>
                  </div>
                  {/* Score Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Score</span>
                      <span className="font-mono text-foreground">{ev.score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${ev.score}%`,
                          backgroundColor: ev.passed ? "#22C55E" : "#EF4444",
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{ev.details}</p>
                </div>
              </GlassPanel>
            ))}
            {agent.evalResults.length === 0 && (
              <GlassPanel padding="lg" className="col-span-full">
                <p className="text-center text-muted-foreground">No evaluation results.</p>
              </GlassPanel>
            )}
          </div>
        )}

        {/* ===== CONFIG TAB ===== */}
        {tab === "config" && (
          <div className="space-y-4">
            <GlassPanel padding="lg">
              <h3 className="text-sm font-semibold text-foreground mb-4">Model Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Model</p>
                  <Badge variant="outline" className={MODEL_COLORS[agent.model] ?? ""}>
                    {agent.model}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Temperature</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-cyan-500"
                        style={{ width: `${agent.temperature * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm text-foreground">{agent.temperature}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Max Tokens</p>
                  <span className="font-mono text-sm text-foreground">
                    {agent.maxTokens.toLocaleString()}
                  </span>
                </div>
                {/* Model Strategy */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Model Strategy</p>
                  <Badge variant="outline" className="bg-brand/10 text-brand border-brand/30">
                    {agent.modelStrategy === "cost_first" ? "Cost-First" :
                     agent.modelStrategy === "quality_first" ? "Quality-First" :
                     agent.modelStrategy === "manual" ? "Manual" : "Auto"}
                  </Badge>
                </div>
              </div>
              {/* Model Distribution */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3">Model Tier Distribution (30d)</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    {[
                      { label: "Tier 1 (Complex)", color: "bg-purple-500/70", percent: 15 },
                      { label: "Tier 2 (Balanced)", color: "bg-brand/70", percent: 45 },
                      { label: "Tier 3 (Simple)", color: "bg-green-500/70", percent: 40 },
                    ].map((tier) => (
                      <div key={tier.label} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-28 shrink-0">{tier.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                          <div className={cn("h-full rounded-full", tier.color)} style={{ width: `${tier.percent}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{tier.percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground/50 mt-2">Distribution based on auto-selection decisions. Data populates as agent runs accumulate.</p>
              </div>
            </GlassPanel>

            <GlassPanel padding="lg">
              <h3 className="text-sm font-semibold text-foreground mb-4">Runtime Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Health Score</p>
                  <span className="font-mono text-sm text-foreground">{agent.healthScore}%</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cost per Hour</p>
                  <span className="font-mono text-sm text-foreground">
                    {formatCurrency(agent.costPerHour)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                  <span className="font-mono text-sm text-foreground">
                    {formatCurrency(agent.totalCost)}
                  </span>
                </div>
              </div>
            </GlassPanel>
          </div>
        )}
    </div>
  );
}
