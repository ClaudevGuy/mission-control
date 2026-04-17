"use client";

import React, { useEffect, useState } from "react";
import { GitBranch, Play, Trash2, Plus, Loader2, ArrowRight, Clock, Hand, Webhook, Zap, Pencil, Copy, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkflowsStore, type Workflow } from "@/stores/workflows-store";
import { PageHeader, StatusBadge, GlassPanel, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { NewWorkflowModal } from "@/components/overview/NewWorkflowModal";
import { WorkflowDetailPanel } from "@/components/workflows/WorkflowDetailPanel";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";

/* ── Status mapping ── */
const statusMap: Record<Workflow["status"], string> = {
  idle: "idle",
  running: "running",
  completed: "success",
  failed: "error",
};

/* ── Trigger icons ── */
const TRIGGER_ICONS: Record<string, typeof Clock> = {
  schedule: Clock,
  webhook: Webhook,
  manual: Hand,
  event: Zap,
};

/* ── Model dot colors for agent chain ── */
const MODEL_DOT_COLORS: Record<string, string> = {
  Claude: "#CC785C",
  "GPT-4": "#10A37F",
  Gemini: "#4285F4",
  Custom: "#F59E0B",
};

/* ═══════════ RUN WORKFLOW PANEL ═══════════ */

function RunWorkflowPanel({ workflow, onClose }: { workflow: Workflow; onClose: () => void }) {
  const updateStatus = useWorkflowsStore((s) => s.updateWorkflowStatus);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{ agentName: string; output: string }[] | null>(null);

  const handleRun = async () => {
    if (!input.trim()) return toast.error("Input is required");
    setIsRunning(true);
    setResults(null);
    updateStatus(workflow.id, "running");
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Run failed");
      setResults(json.data.steps);
      updateStatus(workflow.id, "completed");
      toast.success("Workflow completed");
    } catch (err) {
      updateStatus(workflow.id, "failed");
      toast.error((err as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Play className="size-4 text-brand" />
            <span className="text-sm font-semibold">Run: {workflow.name}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/20 p-3">
            {workflow.steps.map((step, i) => (
              <React.Fragment key={step.id}>
                <span className="rounded bg-brand/10 border border-brand/20 px-2 py-0.5 text-xs font-medium text-brand">
                  {step.agentName}
                </span>
                {i < workflow.steps.length - 1 && (
                  <ArrowRight className="size-3 text-muted-foreground/50" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Initial input</p>
            <textarea
              className="w-full rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand/50 resize-none"
              rows={3}
              placeholder="Enter the initial prompt for the pipeline..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>

          {results && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold text-brand mb-1">Step {i + 1}: {r.agentName}</p>
                  <p className="text-xs text-foreground/80 whitespace-pre-wrap max-h-24 overflow-y-auto">{r.output}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={isRunning}>Cancel</Button>
          <Button
            onClick={handleRun}
            disabled={!input.trim() || isRunning}
            className="bg-brand hover:bg-brand/90 text-primary-foreground"
          >
            {isRunning ? (
              <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Running...</>
            ) : (
              <><Play className="size-3.5 mr-1.5" />Run Pipeline</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ WORKFLOW CARD ═══════════ */

function WorkflowCard({
  workflow,
  onRun,
  onDelete,
  onClick,
}: {
  workflow: Workflow;
  onRun: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const router = useRouter();
  const trigger = (workflow as unknown as Record<string, unknown>).trigger as { type?: string } | null;
  const triggerType = trigger?.type || "manual";
  const TriggerIcon = TRIGGER_ICONS[triggerType] || Hand;

  return (
    <GlassPanel hover padding="none" className="group overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Header — clickable area */}
        <div className="px-4 pt-4 pb-3 space-y-2.5 cursor-pointer" onClick={onClick}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{workflow.name}</p>
              {workflow.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{workflow.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={statusMap[workflow.status] as Parameters<typeof StatusBadge>[0]["status"]} size="sm" />
            </div>
          </div>

          {/* Agent chain preview */}
          <div className="flex flex-wrap items-center gap-1">
            {workflow.steps.slice(0, 3).map((step, i) => (
              <React.Fragment key={step.id}>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/40 border border-border/50 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 truncate max-w-[90px]">
                  <span className="size-1.5 rounded-full shrink-0" style={{ background: MODEL_DOT_COLORS["Claude"] || "#888" }} />
                  {step.agentName}
                </span>
                {i < Math.min(workflow.steps.length, 3) - 1 && (
                  <ArrowRight className="size-2.5 text-muted-foreground/30 shrink-0" />
                )}
              </React.Fragment>
            ))}
            {workflow.steps.length > 3 && (
              <span className="text-[10px] text-muted-foreground/50">+{workflow.steps.length - 3} more</span>
            )}
          </div>
        </div>

        {/* Metadata — clickable area */}
        <div className="px-4 py-2.5 border-t border-border/30 bg-muted/10 space-y-1.5 cursor-pointer" onClick={onClick}>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <TriggerIcon className="size-3 text-muted-foreground/50" />
              <span className="capitalize">{triggerType}</span>
            </div>
            <span>{workflow.steps.length} step{workflow.steps.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{workflow.totalRuns} run{workflow.totalRuns !== 1 ? "s" : ""}</span>
            <span suppressHydrationWarning>
              {workflow.lastRun ? `Last: ${formatRelativeTime(workflow.lastRun)}` : "Never run"}
            </span>
          </div>
        </div>

        {/* Actions — visible on hover */}
        <div className="px-3 py-2 border-t border-border/30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            className="flex-1 bg-brand hover:bg-brand/90 text-primary-foreground h-7 text-[11px]"
            onClick={onRun}
          >
            <Play className="size-3 mr-1" />
            Run
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/workflows/builder`)}
            title="Edit"
          >
            <Pencil className="size-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => toast.success(`"${workflow.name}" duplicated`)}
            title="Duplicate"
          >
            <Copy className="size-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400 hover:border-red-500/30"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}

/* ═══════════ MAIN PAGE ═══════════ */

export default function WorkflowsPage() {
  const router = useRouter();
  const { workflows, isLoading, fetch: fetchWorkflows, removeWorkflow } = useWorkflowsStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [runTarget, setRunTarget] = useState<Workflow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null);
  const [detailTarget, setDetailTarget] = useState<Workflow | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeWorkflow(deleteTarget.id);
    toast.success(`"${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  // Stats from real data
  const activeCount = workflows.filter((w) => w.status === "completed" || w.status === "running").length;
  const draftCount = workflows.filter((w) => w.status === "idle").length;
  const failedCount = workflows.filter((w) => w.status === "failed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Multi-agent pipelines that chain outputs between agents"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/workflows/builder")}
          >
            <GitBranch className="size-3.5 mr-1.5" />
            Visual Builder
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            size="sm"
            className="bg-brand hover:bg-brand/90 text-primary-foreground"
          >
            <Plus className="size-3.5 mr-1.5" />
            New Workflow
          </Button>
        </div>
      </PageHeader>

      {/* Stats bar — only when workflows exist */}
      {workflows.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3 text-green-400" />
              {activeCount} active
            </span>
          )}
          {draftCount > 0 && (
            <span className="flex items-center gap-1.5">
              <BarChart3 className="size-3 text-muted-foreground/50" />
              {draftCount} draft
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1.5">
              <XCircle className="size-3 text-red-400" />
              {failedCount} failed
            </span>
          )}
          <span className="text-muted-foreground/40">|</span>
          <span>{workflows.reduce((sum, w) => sum + w.totalRuns, 0)} total runs</span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 className="size-4 mr-2 animate-spin" />
          Loading workflows...
        </div>
      ) : workflows.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex items-center justify-center size-16 rounded-2xl bg-muted/30 border border-border/50">
            <GitBranch className="size-7 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">No workflows yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Chain multiple AI agents together into automated pipelines
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-brand hover:bg-brand/90 text-primary-foreground"
            >
              <Plus className="size-4 mr-1.5" />
              Create your first workflow
            </Button>
            <Link href="/tutorial" className="text-xs text-muted-foreground hover:text-brand transition-colors">
              Learn about workflows &rarr;
            </Link>
          </div>
        </div>
      ) : (
        /* ── Workflow grid ── */
        <div className="grid gap-4 sm:grid-cols-2">
          {workflows.map((w) => (
            <WorkflowCard
              key={w.id}
              workflow={w}
              onRun={() => setRunTarget(w)}
              onDelete={() => setDeleteTarget(w)}
              onClick={() => setDetailTarget(w)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <NewWorkflowModal open={createOpen} onOpenChange={setCreateOpen} />
      {runTarget && <RunWorkflowPanel workflow={runTarget} onClose={() => setRunTarget(null)} />}
      {detailTarget && (
        <WorkflowDetailPanel
          workflow={detailTarget}
          onClose={() => setDetailTarget(null)}
          onRun={() => { setDetailTarget(null); setRunTarget(detailTarget); }}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Workflow"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
