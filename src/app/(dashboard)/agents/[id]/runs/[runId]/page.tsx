"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Zap, DollarSign, Bot, CheckCircle2, XCircle, Loader2, Wrench, TrendingDown, Copy } from "lucide-react";
import { GlassPanel, PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ToolCall {
  name: string;
  input: unknown;
  output: unknown;
}

interface RunDetail {
  id: string;
  agentId: string;
  startedAt: string;
  duration: number;
  status: string;
  tokensUsed: number;
  tokensIn: number | null;
  tokensOut: number | null;
  cost: number;
  input: string | null;
  output: string;
  model: string | null;
  tier: number | null;
  toolCalls: ToolCall[] | null;
}

interface AgentSummary {
  id: string;
  name: string;
  model: string;
  systemPrompt: string | null;
}

interface SelectionInfo {
  selectedTier: number | null;
  selectionReason: string | null;
  wasUpgraded: boolean;
  originalTier: number | null;
  selectionDurationMs: number | null;
  model: string;
}

interface ApiResponse {
  run: RunDetail;
  agent: AgentSummary;
  selection: SelectionInfo | null;
}

function StatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "run_success" || s === "success") return <CheckCircle2 className="size-4 text-brand" />;
  if (s === "run_failed" || s === "failed" || s === "error") return <XCircle className="size-4 text-red-400" />;
  if (s === "run_running" || s === "running") return <Loader2 className="size-4 text-amber-400 animate-spin" />;
  return <Clock className="size-4 text-muted-foreground" />;
}

function CodeBlock({ children, language }: { children: string; language?: string }) {
  return (
    <div className="relative">
      <pre className="rounded-lg border border-[#3d3a39] bg-[#050507] p-4 text-[12px] font-mono text-[#f2f2f2] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto">
        {children || <span className="text-muted-foreground/40 italic">empty</span>}
      </pre>
      {children && (
        <button
          onClick={() => { navigator.clipboard.writeText(children); toast.success("Copied"); }}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-[#050507] border border-border text-muted-foreground hover:text-foreground transition-colors"
          title="Copy to clipboard"
        >
          <Copy className="size-3" />
        </button>
      )}
      {language && (
        <span className="absolute bottom-2 right-2 text-[9px] font-mono text-muted-foreground/40 uppercase tracking-wider">
          {language}
        </span>
      )}
    </div>
  );
}

export default function RunDetailPage({
  params,
}: {
  params: { id: string; runId: string };
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agents/${params.id}/runs/${params.runId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({ error: "Failed to load run" }));
          throw new Error(body.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((json) => setData(json.data as ApiResponse))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [params.id, params.runId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Run Details" description="Loading..." />
        <div className="flex items-center justify-center py-24">
          <div className="size-6 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Link href={`/agents/${params.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to agent
        </Link>
        <GlassPanel padding="lg">
          <p className="text-center text-red-400">{error || "Run not found"}</p>
        </GlassPanel>
      </div>
    );
  }

  const { run, agent, selection } = data;
  const tierColor = run.tier === 1 ? "bg-purple-500/15 text-purple-400 border-purple-500/30" :
                    run.tier === 2 ? "bg-brand/15 text-brand border-brand/30" :
                    run.tier === 3 ? "bg-green-500/15 text-green-400 border-green-500/30" : "";
  const toolCalls = run.toolCalls ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <Link href={`/agents/${params.id}`} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-3" /> {agent.name}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground font-mono">Run {run.id.slice(-8)}</h1>
            <StatusIcon status={run.status} />
          </div>
          <p className="text-[11px] text-muted-foreground" suppressHydrationWarning>
            {formatDate(new Date(run.startedAt))}
          </p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Clock} label="Duration" value={`${(run.duration / 1000).toFixed(2)}s`} color="#8b949e" />
        <StatTile icon={Zap} label="Tokens" value={formatNumber(run.tokensUsed)} color="var(--primary)"
          sub={run.tokensIn != null && run.tokensOut != null ? `${formatNumber(run.tokensIn)} in / ${formatNumber(run.tokensOut)} out` : undefined}
        />
        <StatTile icon={DollarSign} label="Cost" value={formatCurrency(run.cost)} color="#F59E0B" />
        <StatTile icon={Bot} label="Model" value={run.model ?? agent.model} color="#A855F7" truncate />
      </div>

      {/* Model selection details */}
      {(run.tier || selection) && (
        <GlassPanel padding="md">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Model Selection</p>
            {run.tier && (
              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border", tierColor)}>
                Tier {run.tier}
              </span>
            )}
          </div>
          {selection?.selectionReason && (
            <p className="text-xs text-muted-foreground">{selection.selectionReason}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted-foreground/60 font-mono">
            {selection?.selectionDurationMs != null && (
              <span>Selection took {selection.selectionDurationMs}ms</span>
            )}
            {selection?.wasUpgraded && selection.originalTier && (
              <span className="flex items-center gap-1 text-amber-400">
                <TrendingDown className="size-3 rotate-180" /> Upgraded from Tier {selection.originalTier}
              </span>
            )}
          </div>
        </GlassPanel>
      )}

      {/* Input */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Input</p>
        <CodeBlock>{run.input ?? "— (input not captured for this run)"}</CodeBlock>
      </div>

      {/* Output */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Output</p>
        <CodeBlock>{run.output}</CodeBlock>
      </div>

      {/* Tool calls — structure ready for when tool use is wired into execute route */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="size-3 text-muted-foreground" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tool Use</p>
          {toolCalls.length > 0 && <Badge variant="outline" className="text-[9px]">{toolCalls.length}</Badge>}
        </div>
        {toolCalls.length === 0 ? (
          <GlassPanel padding="md">
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Wrench className="size-6 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground/60">This run did not invoke any tools</p>
              <p className="text-[10px] text-muted-foreground/30 max-w-md">
                Tool use is configured per-agent but not yet executed during runs.
                When enabled, each tool invocation will appear here with its inputs and outputs.
              </p>
            </div>
          </GlassPanel>
        ) : (
          <div className="space-y-2">
            {toolCalls.map((call, i) => (
              <GlassPanel key={i} padding="md">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{call.name}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase mb-1">Input</p>
                    <pre className="text-[11px] font-mono bg-[#050507] border border-border rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">{JSON.stringify(call.input, null, 2)}</pre>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 uppercase mb-1">Output</p>
                    <pre className="text-[11px] font-mono bg-[#050507] border border-border rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">{JSON.stringify(call.output, null, 2)}</pre>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color, sub, truncate }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string; sub?: string; truncate?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}15` }}>
        <div style={{ color }}><Icon className="size-4" /></div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={cn("text-base font-bold font-mono text-foreground mt-0.5 leading-tight", truncate && "truncate")}>{value}</p>
        {sub && <p className="text-[9px] text-muted-foreground/50 font-mono mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}
