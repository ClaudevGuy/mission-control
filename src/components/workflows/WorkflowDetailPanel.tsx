"use client";

import React, { useState, useEffect } from "react";
import { X, Play, Pencil, Clock, Hand, Webhook, Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel, StatusBadge } from "@/components/shared";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/stores/workflows-store";

interface WorkflowRun {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  stepResults: unknown;
  triggeredBy: string | null;
  error: string | null;
}

const statusMap: Record<string, string> = {
  idle: "idle",
  running: "running",
  completed: "success",
  failed: "error",
};

const TRIGGER_ICONS: Record<string, typeof Clock> = {
  schedule: Clock,
  webhook: Webhook,
  manual: Hand,
  event: Zap,
};

interface Props {
  workflow: Workflow;
  onClose: () => void;
  onRun: () => void;
}

export function WorkflowDetailPanel({ workflow, onClose, onRun }: Props) {
  const [tab, setTab] = useState<"overview" | "history" | "settings">("overview");
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  // Fetch runs when history tab is selected
  useEffect(() => {
    if (tab === "history") {
      setRunsLoading(true);
      fetch(`/api/workflows/${workflow.id}/runs`)
        .then((r) => r.json())
        .then((d) => setRuns(d.data?.runs || []))
        .catch(() => setRuns([]))
        .finally(() => setRunsLoading(false));
    }
  }, [tab, workflow.id]);

  const trigger = (workflow as unknown as Record<string, unknown>).trigger as { type?: string } | null;
  const triggerType = trigger?.type || "manual";
  const TriggerIcon = TRIGGER_ICONS[triggerType] || Hand;

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "history" as const, label: "Run History" },
    { id: "settings" as const, label: "Settings" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[600px] border-l border-border bg-card shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border shrink-0">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-semibold text-foreground truncate">{workflow.name}</h2>
              <StatusBadge status={statusMap[workflow.status] as "idle" | "running" | "success" | "error"} size="sm" />
            </div>
            {workflow.description && (
              <p className="text-sm text-muted-foreground">{workflow.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Button size="sm" className="bg-brand hover:bg-brand/90 text-primary-foreground" onClick={onRun}>
              <Play className="size-3.5 mr-1" /> Run Now
            </Button>
            <Button size="sm" variant="outline">
              <Pencil className="size-3.5 mr-1" /> Edit
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6 shrink-0">
          <div className="flex gap-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "pb-2.5 pt-3 text-sm font-medium transition-colors relative",
                  tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
                )}
              >
                {t.label}
                {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <>
              {/* Pipeline diagram */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pipeline</p>
                <div className="space-y-0">
                  {/* Trigger */}
                  <div className="flex items-center gap-3 rounded-lg border border-[#A855F7]/20 bg-[#A855F7]/[0.04] px-4 py-3">
                    <TriggerIcon className="size-4 text-[#A855F7] shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[#A855F7] uppercase tracking-wider">Trigger</p>
                      <p className="text-[11px] text-foreground/70 capitalize">{triggerType}</p>
                    </div>
                  </div>

                  {/* Steps */}
                  {workflow.steps.map((step, i) => (
                    <React.Fragment key={step.id}>
                      <div className="flex justify-center py-1">
                        <div className="w-px h-4 bg-brand/30" />
                      </div>
                      <div className="rounded-lg border border-border bg-card px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground/50">#{i + 1}</span>
                            <span className="text-sm font-medium text-foreground">{step.agentName}</span>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* End */}
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-[#39FF14]/30" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-[#39FF14]/20 bg-[#39FF14]/[0.03] px-4 py-2.5">
                    <CheckCircle2 className="size-4 text-[#39FF14]/70" />
                    <span className="text-xs font-semibold text-[#39FF14]/80 uppercase tracking-wider">End</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Statistics</p>
                {workflow.totalRuns > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase">Total Runs</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{workflow.totalRuns}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase">Steps</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{workflow.steps.length}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-[10px] text-muted-foreground uppercase">Last Run</p>
                      <p className="text-sm font-medium text-foreground mt-0.5" suppressHydrationWarning>
                        {workflow.lastRun ? formatRelativeTime(workflow.lastRun) : "\u2014"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/50 bg-muted/10 p-4 text-center">
                    <p className="text-xs text-muted-foreground">No runs yet — run this workflow to see performance data</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* RUN HISTORY TAB */}
          {tab === "history" && (
            <>
              {runsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-4 mr-2 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading runs...</span>
                </div>
              ) : runs.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Clock className="size-8 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">No runs yet</p>
                  <p className="text-xs text-muted-foreground/60">Run this workflow to see execution history</p>
                </div>
              ) : (
                <GlassPanel padding="none">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Run ID", "Status", "Started", "Duration", "Triggered By"].map((h) => (
                          <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => (
                        <tr key={run.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{run.id.slice(0, 12)}...</td>
                          <td className="px-4 py-2.5">
                            <span className={cn(
                              "inline-flex items-center gap-1 text-xs font-medium",
                              run.status === "completed" ? "text-green-400" :
                              run.status === "failed" ? "text-red-400" :
                              run.status === "running" ? "text-brand" :
                              "text-muted-foreground"
                            )}>
                              {run.status === "completed" && <CheckCircle2 className="size-3" />}
                              {run.status === "failed" && <XCircle className="size-3" />}
                              {run.status === "running" && <Loader2 className="size-3 animate-spin" />}
                              {run.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground" suppressHydrationWarning>
                            {formatRelativeTime(run.startedAt)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            {run.duration ? `${(run.duration / 1000).toFixed(1)}s` : "\u2014"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {run.triggeredBy || "Manual"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </GlassPanel>
              )}
            </>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Trigger</p>
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5">
                  <TriggerIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm text-foreground capitalize">{triggerType}</span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">On Failure</p>
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <option value="stop">Stop pipeline</option>
                  <option value="continue">Continue to next step</option>
                  <option value="retry">Retry failed step</option>
                  <option value="alert">Alert team and stop</option>
                </select>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Timeout (seconds)</p>
                <input
                  type="number"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  placeholder="300"
                  defaultValue={300}
                />
              </div>

              <Button className="w-full" variant="outline">
                Save Settings
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
