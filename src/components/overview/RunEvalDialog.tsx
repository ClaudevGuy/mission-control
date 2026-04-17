"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FlaskConical, Loader2, Bot, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface EvalSuite {
  id: string;
  name: string;
  agentId: string;
  _count: { cases: number; runs: number };
  runs: { score: number | null; status: string }[];
}

interface RunEvalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RunEvalDialog({ open, onOpenChange }: RunEvalDialogProps) {
  const router = useRouter();
  const [suites, setSuites] = useState<EvalSuite[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([
      apiFetch("/api/evals").then(r => r.json()),
      apiFetch("/api/agents").then(r => r.json()),
    ]).then(([evalData, agentData]) => {
      setSuites(evalData.data?.suites || []);
      setAgents(agentData.data?.agents || []);
      const s = evalData.data?.suites;
      if (s?.length) setSelectedId(s[0].id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    setSelectedId(null);
  };

  const handleRun = async () => {
    if (!selectedId) return;
    setIsRunning(true);
    try {
      const res = await apiFetch(`/api/evals/${selectedId}/run`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { data } = await res.json();
      toast.success(`Eval completed: ${data.score}% (${data.passed}/${data.total})`);
      handleClose();
      router.push(`/evals/${selectedId}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
    setIsRunning(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-4 text-brand" />
            Run Eval
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground/30" /></div>
        ) : suites.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <FlaskConical className="size-8 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">No eval suites yet. Create one first.</p>
            <Button size="sm" variant="outline" onClick={() => { handleClose(); router.push("/evals"); }} className="gap-1.5">
              <ArrowRight className="size-3" /> Go to Evals
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {suites.map((suite) => {
              const agent = agents.find(a => a.id === suite.agentId);
              const lastScore = suite.runs[0]?.score;
              return (
                <button
                  key={suite.id}
                  onClick={() => setSelectedId(suite.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    selectedId === suite.id
                      ? "border-brand/40 bg-brand/[0.04]"
                      : "border-border hover:border-border/80"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">{suite.name}</p>
                    {agent && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Bot className="size-2.5 text-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground/50">{agent.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-bold font-mono", lastScore != null ? (lastScore >= 80 ? "text-green-400" : lastScore >= 60 ? "text-amber-400" : "text-red-400") : "text-muted-foreground/30")}>
                      {lastScore != null ? `${lastScore}%` : "—"}
                    </p>
                    <p className="text-[9px] text-muted-foreground/30">{suite._count.cases} cases</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {suites.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isRunning}>Cancel</Button>
            <Button
              onClick={handleRun}
              disabled={!selectedId || isRunning}
              className="bg-brand hover:bg-brand/90 text-primary-foreground"
            >
              {isRunning ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" /> Running...</> : "Run Now"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
