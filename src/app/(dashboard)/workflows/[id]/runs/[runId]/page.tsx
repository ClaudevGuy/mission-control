"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Clock, Minus, ChevronDown, ChevronRight, AlertTriangle, Zap, DollarSign } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StepResult {
  agentName: string;
  output: string;
  tokensUsed?: number;
  cost?: number;
  duration?: number;
  status?: string;
}

interface WorkflowRun {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  stepResults: StepResult[] | null;
  triggeredBy: string | null;
  error: string | null;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  steps: { id: string; agentName: string; position: number }[];
}

const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  success: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Clock,
  skipped: Minus,
};

const STATUS_COLOR: Record<string, string> = {
  completed: "text-green-400 bg-green-400/15 border-green-400/30",
  success: "text-green-400 bg-green-400/15 border-green-400/30",
  failed: "text-red-400 bg-red-400/15 border-red-400/30",
  running: "text-brand bg-brand/15 border-brand/30",
  pending: "text-muted-foreground bg-muted/30 border-border",
  skipped: "text-muted-foreground bg-muted/30 border-border",
};

export default function WorkflowRunDetailPage() {
  const params = useParams();
  const workflowId = params?.id as string;
  const runId = params?.runId as string;

  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!workflowId || !runId) return;

    Promise.all([
      fetch(`/api/workflows/${workflowId}`).then((r) => r.json()),
      fetch(`/api/workflows/${workflowId}/runs/${runId}`).then((r) => r.json()),
    ])
      .then(([wData, rData]) => {
        setWorkflow(wData.data ?? null);
        setRun(rData.data?.run ?? null);
        // Auto-expand failed steps
        const steps = rData.data?.run?.stepResults as StepResult[] | null;
        if (steps) {
          const failedIndexes = new Set<number>();
          steps.forEach((s, i) => {
            if (s.status === "failed") failedIndexes.add(i);
          });
          setExpandedSteps(failedIndexes);
        }
      })
      .catch(() => setError("Failed to load run details"))
      .finally(() => setLoading(false));
  }, [workflowId, runId]);

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-5 mr-2 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading run details...</span>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <AlertTriangle className="size-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{error || "Run not found"}</p>
        <Link href="/workflows" className="text-xs text-brand hover:underline">Back to Workflows</Link>
      </div>
    );
  }

  const steps = (run.stepResults as StepResult[]) || [];
  const totalTokens = steps.reduce((sum, s) => sum + (s.tokensUsed || 0), 0);
  const totalCost = steps.reduce((sum, s) => sum + (s.cost || 0), 0);
  const stepsCompleted = steps.filter((s) => s.status === "completed" || s.status === "success" || !s.status).length;
  const stepsFailed = steps.filter((s) => s.status === "failed").length;
  const isRunning = run.status === "running";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/workflows" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-foreground">
              {workflow?.name || "Workflow"} Run
            </h1>
            <StatusBadge
              status={run.status === "completed" ? "success" : run.status === "failed" ? "error" : run.status === "running" ? "running" : "idle"}
              size="sm"
            />
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-brand">
                <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{run.id}</p>
        </div>
      </div>

      {/* Timestamps */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span suppressHydrationWarning>Started: {formatRelativeTime(run.startedAt)}</span>
        {run.completedAt && <span suppressHydrationWarning>Completed: {formatRelativeTime(run.completedAt)}</span>}
        {run.duration != null && <span>Duration: {(run.duration / 1000).toFixed(1)}s</span>}
      </div>

      {/* Summary card */}
      {steps.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Steps</p>
            <p className="text-lg font-bold text-foreground">{steps.length}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Completed</p>
            <p className="text-lg font-bold text-green-400">{stepsCompleted}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Failed</p>
            <p className="text-lg font-bold text-red-400">{stepsFailed}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Tokens</p>
            <p className="text-lg font-bold text-foreground">{totalTokens > 0 ? totalTokens.toLocaleString() : "\u2014"}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] text-muted-foreground uppercase">Cost</p>
            <p className="text-lg font-bold text-foreground">{totalCost > 0 ? `$${totalCost.toFixed(4)}` : "\u2014"}</p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {run.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-4 py-3 flex items-start gap-2">
          <XCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Run Failed</p>
            <p className="text-xs text-foreground/70 mt-0.5">{run.error}</p>
          </div>
        </div>
      )}

      {/* Step timeline */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Step Timeline</p>

        {steps.length === 0 ? (
          <div className="rounded-lg border border-border/50 bg-muted/10 p-6 text-center">
            <p className="text-xs text-muted-foreground">No step data available for this run</p>
          </div>
        ) : (
          <div className="space-y-0">
            {steps.map((step, i) => {
              const stepStatus = step.status || "completed";
              const StatusIcon = STATUS_ICON[stepStatus] || CheckCircle2;
              const colorClass = STATUS_COLOR[stepStatus] || STATUS_COLOR.completed;
              const isExpanded = expandedSteps.has(i);
              const isActive = isRunning && i === steps.length - 1 && stepStatus === "running";

              return (
                <div key={i}>
                  {/* Connector line */}
                  {i > 0 && (
                    <div className="flex items-center pl-[18px]">
                      <div className={cn(
                        "w-px h-4",
                        stepStatus === "pending" ? "bg-border" : "bg-brand/30"
                      )} />
                    </div>
                  )}

                  {/* Step row */}
                  <div
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors cursor-pointer",
                      isActive ? "border-brand/30 bg-brand/[0.03] animate-pulse" : "border-border hover:bg-muted/20"
                    )}
                    onClick={() => toggleStep(i)}
                  >
                    {/* Status circle */}
                    <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border", colorClass)}>
                      <StatusIcon className={cn("size-4", stepStatus === "running" && "animate-spin")} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{step.agentName}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">{stepStatus}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                          {step.tokensUsed != null && step.tokensUsed > 0 && (
                            <span className="flex items-center gap-1 font-mono">
                              <Zap className="size-2.5" />{step.tokensUsed.toLocaleString()}
                            </span>
                          )}
                          {step.cost != null && step.cost > 0 && (
                            <span className="flex items-center gap-1 font-mono">
                              <DollarSign className="size-2.5" />${step.cost.toFixed(4)}
                            </span>
                          )}
                          {step.duration != null && (
                            <span className="font-mono">{(step.duration / 1000).toFixed(1)}s</span>
                          )}
                          {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </div>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Output</p>
                            <div className="rounded-md bg-muted/30 p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                              {step.output || "No output data"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
