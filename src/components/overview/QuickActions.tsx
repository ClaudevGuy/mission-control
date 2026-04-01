"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/shared";
import { RunEvalDialog } from "./RunEvalDialog";
import { NewWorkflowModal } from "./NewWorkflowModal";
import { Rocket, FlaskConical, GitBranch, Power } from "lucide-react";
import { toast } from "sonner";
import { useAgentsStore } from "@/stores/agents-store";

export function QuickActions() {
  const router = useRouter();
  const killAllAgents = useAgentsStore((s) => s.killAllAgents);
  const [killOpen, setKillOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);

  const handleKillAll = async () => {
    try {
      const stopped = await killAllAgents();
      if (stopped === 0) {
        toast.info("No running agents to stop");
      } else {
        toast.error(`Kill switch activated — ${stopped} agent${stopped !== 1 ? "s" : ""} stopped`);
      }
    } catch {
      toast.error("Failed to stop agents");
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Deploy Agent — primary CTA, subtle cyan accent */}
        <button
          onClick={() => router.push("/agents/builder")}
          className="glow-cyan group flex flex-col items-center gap-2 rounded-xl border border-border bg-card/80 p-4 transition-all hover:border-cyan/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Rocket className="size-6 text-cyan" />
          <span className="text-xs font-medium text-foreground">Deploy Agent</span>
        </button>

        {/* Run Eval — neutral */}
        <button
          onClick={() => setEvalOpen(true)}
          className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card/80 p-4 transition-all hover:border-border/80 hover:bg-muted/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <FlaskConical className="size-6 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-xs font-medium text-foreground">Run Eval</span>
        </button>

        {/* New Workflow — neutral */}
        <button
          onClick={() => setWorkflowOpen(true)}
          className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card/80 p-4 transition-all hover:border-border/80 hover:bg-muted/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <GitBranch className="size-6 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-xs font-medium text-foreground">New Workflow</span>
        </button>

        {/* Kill Switch — danger red only */}
        <button
          onClick={() => setKillOpen(true)}
          className="group flex flex-col items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 shadow-[0_0_12px_rgba(239,68,68,0.15)] transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Power className="size-6 text-red-500" />
          <span className="text-xs font-medium text-red-400">Kill Switch</span>
        </button>
      </div>

      <RunEvalDialog open={evalOpen} onOpenChange={setEvalOpen} />
      <NewWorkflowModal open={workflowOpen} onOpenChange={setWorkflowOpen} />

      <ConfirmDialog
        open={killOpen}
        onOpenChange={setKillOpen}
        title="Emergency Kill Switch"
        description="This will immediately stop ALL running agents. This action cannot be undone. Are you sure?"
        confirmLabel="Stop All Agents"
        variant="danger"
        onConfirm={handleKillAll}
      />
    </>
  );
}
