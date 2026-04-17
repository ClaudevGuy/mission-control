"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Play, Bot, Loader2, CheckCircle2, XCircle, Trash2, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/format";
import { useAgentsStore } from "@/stores/agents-store";

function scoreColor(s: number | null | undefined) {
  if (s == null) return "text-muted-foreground/30";
  if (s >= 80) return "text-green-400";
  if (s >= 60) return "text-amber-400";
  return "text-red-400";
}

interface EvalCase { id: string; input: string; expectedOutput: string | null; criteria: string[]; weight: number; createdAt: string }
interface EvalRun { id: string; status: string; score: number | null; results: unknown; model: string | null; totalCost: number | null; duration: number | null; startedAt: string; completedAt: string | null }
interface Suite { id: string; name: string; description: string | null; agentId: string; cases: EvalCase[]; runs: EvalRun[]; createdAt: string }

export default function EvalSuiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [suite, setSuite] = useState<Suite | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "cases" | "history">("overview");
  const [running, setRunning] = useState(false);
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetch);

  // Add case state
  const [addOpen, setAddOpen] = useState(false);
  const [newInput, setNewInput] = useState("");
  const [newExpected, setNewExpected] = useState("");
  const [newCriteria, setNewCriteria] = useState<string[]>([]);
  const [criterionBuf, setCriterionBuf] = useState("");

  const fetchSuite = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/evals/${id}`);
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setSuite(data.suite);
    } catch { /* empty */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchSuite(); fetchAgents(); }, [fetchSuite, fetchAgents]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await apiFetch(`/api/evals/${id}/run`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      const { data } = await res.json();
      toast.success(`Scored ${data.score}% (${data.passed}/${data.total})`);
      await fetchSuite();
    } catch (err) { toast.error((err as Error).message); }
    setRunning(false);
  };

  const addCase = async () => {
    if (!newInput.trim() || newCriteria.length === 0) { toast.error("Input and criteria required"); return; }
    try {
      await apiFetch(`/api/evals/${id}/cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: newInput, expectedOutput: newExpected || undefined, criteria: newCriteria }),
      });
      setNewInput(""); setNewExpected(""); setNewCriteria([]); setAddOpen(false);
      toast.success("Case added");
      await fetchSuite();
    } catch { toast.error("Failed to add case"); }
  };

  const deleteCase = async (caseId: string) => {
    await apiFetch(`/api/evals/${id}/cases/${caseId}`, { method: "DELETE" });
    await fetchSuite();
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground/30" /></div>;
  if (!suite) return <div className="py-20 text-center text-muted-foreground">Suite not found</div>;

  const agent = agents.find(a => a.id === suite.agentId);
  const lastRun = suite.runs[0];
  const lastResults = (lastRun?.results || []) as { caseId: string; passed: boolean; input: string; output: string; criteriaResults: { criterion: string; passed: boolean; method: string }[]; cost: number; duration: number; tokensIn: number; tokensOut: number }[];
  const passedCount = Array.isArray(lastResults) ? lastResults.filter(r => r.passed).length : 0;
  const failedCount = Array.isArray(lastResults) ? lastResults.filter(r => !r.passed).length : 0;
  const allScores = suite.runs.filter(r => r.score != null).map(r => r.score!);
  const bestScore = allScores.length > 0 ? Math.max(...allScores) : null;
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;
  const totalCost = suite.runs.reduce((s, r) => s + (r.totalCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/evals" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"><ArrowLeft className="size-3" /> Evals</Link>
          <h1 className="text-xl font-bold text-foreground">{suite.name}</h1>
          {agent && <div className="flex items-center gap-1.5 mt-1"><Bot className="size-3 text-muted-foreground/40" /><span className="text-xs text-muted-foreground/50">{agent.name}</span></div>}
        </div>
        <Button size="sm" className="bg-brand hover:bg-brand/90 text-primary-foreground gap-1.5" onClick={handleRun} disabled={running}>
          {running ? <><Loader2 className="size-3 animate-spin" /> Running...</> : <><Play className="size-3" /> Run Now</>}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {(["overview", "cases", "history"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn("pb-2.5 text-sm font-medium capitalize relative transition-colors", tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground/70")}>
              {t === "cases" ? "Test Cases" : t === "history" ? "Run History" : "Overview"}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand" />}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Score + stats */}
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className={cn("text-6xl font-bold font-mono", scoreColor(lastRun?.score))}>{lastRun?.score != null ? `${lastRun.score}%` : "—"}</p>
              <p className="text-[10px] text-muted-foreground/40 mt-1">{lastRun ? "Based on last run" : "No runs yet"}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground/50">Total Runs</p><p className="text-lg font-bold text-foreground">{suite.runs.length}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground/50">Best Score</p><p className={cn("text-lg font-bold font-mono", scoreColor(bestScore))}>{bestScore != null ? `${bestScore}%` : "—"}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground/50">Avg Score (all)</p><p className={cn("text-lg font-bold font-mono", scoreColor(avgScore))}>{avgScore != null ? `${avgScore}%` : "—"}</p></div>
              <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground/50">Total Cost</p><p className="text-lg font-bold font-mono text-foreground">${totalCost.toFixed(4)}</p></div>
            </div>
          </div>

          {/* Score history bar chart */}
          {allScores.length > 1 && (
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-foreground mb-3">Score History</p>
              <div className="flex items-end gap-2 h-24">
                {suite.runs.filter(r => r.score != null).slice(0, 10).reverse().map((r, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={cn("w-full rounded-t-sm", r.score! >= 80 ? "bg-green-500/50" : r.score! >= 60 ? "bg-amber-500/50" : "bg-red-500/50")} style={{ height: `${Math.max(4, (r.score! / 100) * 96)}px` }} />
                    <span className="text-[8px] font-mono text-muted-foreground/30">{r.score}%</span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-border/30 mt-1 relative"><span className="absolute right-0 -top-2 text-[8px] text-muted-foreground/20">Target: 80%</span></div>
            </div>
          )}

          {/* Last run breakdown */}
          {lastRun && Array.isArray(lastResults) && lastResults.length > 0 && (
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold text-foreground mb-3">Last Run: {passedCount} passed / {failedCount} failed / {lastResults.length} total</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div className="bg-green-500 h-full" style={{ width: `${(passedCount / lastResults.length) * 100}%` }} />
                <div className="bg-red-500 h-full" style={{ width: `${(failedCount / lastResults.length) * 100}%` }} />
              </div>
              {failedCount > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-[10px] font-medium text-red-400/70 uppercase tracking-wider">Failed cases</p>
                  {lastResults.filter(r => !r.passed).map((r, i) => (
                    <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/[0.03] p-3">
                      <p className="text-xs text-foreground line-clamp-1">{r.input}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.criteriaResults.filter(c => !c.passed).map((c, j) => (
                          <span key={j} className="text-[9px] text-red-400/70 bg-red-500/10 px-1.5 py-0.5 rounded">✗ {c.criterion}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TEST CASES TAB */}
      {tab === "cases" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAddOpen(!addOpen)}>
              <Plus className="size-3" /> Add Case
            </Button>
          </div>

          {addOpen && (
            <div className="rounded-lg border border-brand/20 bg-brand/[0.02] p-4 space-y-3">
              <Textarea value={newInput} onChange={(e) => setNewInput(e.target.value)} placeholder="Agent input / task..." className="text-xs min-h-[60px]" />
              <Textarea value={newExpected} onChange={(e) => setNewExpected(e.target.value)} placeholder="Expected output (optional)..." className="text-xs min-h-[40px]" />
              <div className="flex gap-2">
                <Input value={criterionBuf} onChange={(e) => setCriterionBuf(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (criterionBuf.trim()) { setNewCriteria([...newCriteria, criterionBuf.trim()]); setCriterionBuf(""); } } }} placeholder="Add criterion, press Enter" className="text-xs" />
              </div>
              <div className="flex flex-wrap gap-1">
                {newCriteria.map((c, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-brand">
                    {c} <button onClick={() => setNewCriteria(newCriteria.filter((_, j) => j !== i))}>×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-brand hover:bg-brand/90 text-primary-foreground text-xs" onClick={addCase}>Add Case</Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setAddOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {suite.cases.length === 0 ? (
            <p className="text-xs text-muted-foreground/40 text-center py-10">No test cases yet</p>
          ) : (
            <div className="space-y-2">
              {suite.cases.map((c, i) => {
                const result = Array.isArray(lastResults) ? lastResults.find(r => r.caseId === c.id) : null;
                return (
                  <div key={c.id} className="flex items-start gap-3 rounded-lg border border-border/50 p-3 group">
                    <span className="text-[10px] font-mono text-muted-foreground/20 mt-0.5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground line-clamp-2">{c.input}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.criteria.map((cr, j) => (
                          <span key={j} className="rounded bg-muted/30 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{cr}</span>
                        ))}
                      </div>
                    </div>
                    {result && (
                      result.passed
                        ? <CheckCircle2 className="size-4 text-green-400 shrink-0" />
                        : <XCircle className="size-4 text-red-400 shrink-0" />
                    )}
                    <button onClick={() => deleteCase(c.id)} className="text-muted-foreground/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RUN HISTORY TAB */}
      {tab === "history" && (
        <div className="space-y-2">
          {suite.runs.length === 0 ? (
            <p className="text-xs text-muted-foreground/40 text-center py-10">No runs yet. Click &quot;Run Now&quot; to execute.</p>
          ) : (
            suite.runs.map((run, i) => (
              <div
                key={run.id}
                className="flex items-center gap-4 rounded-lg border border-border/50 p-3 hover:bg-muted/10 cursor-pointer transition-colors"
                onClick={() => router.push(`/evals/${id}/runs/${run.id}`)}
              >
                <span className="text-xs font-mono text-muted-foreground/30 w-10">#{suite.runs.length - i}</span>
                <span className={cn("text-sm font-bold font-mono w-14", scoreColor(run.score))}>{run.score != null ? `${run.score}%` : "—"}</span>
                <span className={cn("text-[10px] rounded-full px-2 py-0.5 font-medium", run.status === "completed" ? "bg-green-500/10 text-green-400" : run.status === "failed" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400")}>{run.status}</span>
                <span className="text-[10px] text-muted-foreground/40 flex-1">{run.totalCost != null ? `$${run.totalCost.toFixed(4)}` : ""}</span>
                <span className="text-[10px] text-muted-foreground/40">{run.duration ? `${run.duration}ms` : ""}</span>
                <span className="text-[10px] text-muted-foreground/30" suppressHydrationWarning>{formatRelativeTime(run.startedAt)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
