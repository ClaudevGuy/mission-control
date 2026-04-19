"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical, Plus, Bot, Play, Trash2, Loader2, BarChart3, Clock, Trophy, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModalShell } from "@/components/ui/modal-shell";
import { apiFetch } from "@/lib/api-client";
import { useAgentsStore } from "@/stores/agents-store";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/format";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

// ── Types ──

interface EvalSuiteSummary {
  id: string;
  name: string;
  description: string | null;
  agentId: string;
  createdAt: string;
  _count: { cases: number; runs: number };
  runs: { score: number | null; startedAt: string; status: string }[];
}

// ── Score color helper ──
function scoreColor(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground/30";
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number | null | undefined) {
  if (score == null) return "bg-muted/20";
  if (score >= 80) return "bg-green-500/10";
  if (score >= 60) return "bg-amber-500/10";
  return "bg-red-500/10";
}

// ── Main Page ──

export default function EvalsPage() {
  const router = useRouter();
  const [suites, setSuites] = useState<EvalSuiteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetch);

  const fetchSuites = useCallback(async () => {
    try {
      const res = await apiFetch("/api/evals");
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setSuites(data.suites || []);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSuites(); fetchAgents(); }, [fetchSuites, fetchAgents]);

  const handleRun = async (suiteId: string) => {
    setRunningIds((prev) => new Set(prev).add(suiteId));
    try {
      const res = await apiFetch(`/api/evals/${suiteId}/run`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Run failed"); }
      const { data } = await res.json();
      toast.success(`Eval completed: ${data.score}% (${data.passed}/${data.total})`);
      await fetchSuites();
    } catch (err) {
      toast.error((err as Error).message);
    }
    setRunningIds((prev) => { const n = new Set(prev); n.delete(suiteId); return n; });
  };

  const handleDelete = async (suiteId: string) => {
    if (!confirm("Delete this eval suite and all its runs?")) return;
    await apiFetch(`/api/evals/${suiteId}`, { method: "DELETE" });
    await fetchSuites();
    toast.success("Suite deleted");
  };

  // Stats
  const totalRuns = suites.reduce((s, x) => s + x._count.runs, 0);
  const allScores = suites.flatMap(s => s.runs.filter(r => r.score != null).map(r => r.score!));
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;
  const lastRun = suites.flatMap(s => s.runs).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];

  return (
    <div className="space-y-6">
      {/* Header — editorial PageHeader (matches /workflows, /deployments, etc.).
          New Eval Suite button only shows once there's data — empty state has
          its own centered hero CTA so users have a single clear path. */}
      <PageHeader
        title="Evals"
        description="Automated test suites for measuring agent quality"
      >
        {suites.length > 0 && (
          <Button
            className="bg-brand hover:bg-brand/90 text-primary-foreground gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" /> New Eval Suite
          </Button>
        )}
      </PageHeader>

      {/* Stats bar */}
      {suites.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10"><Hash className="size-3.5 text-brand" /></div>
            <div><p className="text-lg font-bold text-foreground">{suites.length}</p><p className="text-[10px] text-muted-foreground/50">Suites</p></div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10"><BarChart3 className="size-3.5 text-purple-400" /></div>
            <div><p className="text-lg font-bold text-foreground">{totalRuns}</p><p className="text-[10px] text-muted-foreground/50">Total Runs</p></div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
            <div className={cn("flex size-8 items-center justify-center rounded-lg", scoreBg(avgScore))}><Trophy className={cn("size-3.5", scoreColor(avgScore))} /></div>
            <div><p className={cn("text-lg font-bold", scoreColor(avgScore))}>{avgScore != null ? `${avgScore}%` : "—"}</p><p className="text-[10px] text-muted-foreground/50">Avg Score</p></div>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10"><Clock className="size-3.5 text-blue-400" /></div>
            <div><p className="text-sm font-medium text-foreground" suppressHydrationWarning>{lastRun ? formatRelativeTime(lastRun.startedAt) : "Never"}</p><p className="text-[10px] text-muted-foreground/50">Last Run</p></div>
          </div>
        </div>
      )}

      {/* Suite cards or empty state */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground/40"><Loader2 className="size-5 animate-spin" /></div>
      ) : suites.length === 0 ? (
        /* Editorial hero — explain what Evals do + invite action */
        <div className="flex items-center justify-center py-12 px-4">
          <div className="max-w-xl w-full text-center">
            {/* Eyebrow */}
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono tracking-[0.22em] uppercase text-muted-foreground/70 mb-4">
              <span className="h-px w-6" style={{ background: "rgb(var(--ink-rgb) / 0.2)" }} />
              <FlaskConical className="size-3 text-brand" />
              <span>Evals</span>
              <span className="h-px w-6" style={{ background: "rgb(var(--ink-rgb) / 0.2)" }} />
            </div>

            {/* Big editorial headline */}
            <h1 className="font-serif text-3xl sm:text-4xl leading-[1.1] tracking-[-0.02em] text-foreground">
              Measure agent quality<br />
              <span className="italic text-muted-foreground">before it drifts.</span>
            </h1>
            <p className="mt-4 font-serif italic text-[15px] leading-relaxed text-muted-foreground/80 max-w-md mx-auto">
              Test suites run every agent against your expectations. Two scoring engines — deterministic string matching plus Claude-as-judge for tone and nuance.
            </p>

            {/* Feature tiles */}
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-lg mx-auto">
              {[
                { icon: Hash, label: "String match", desc: "Deterministic checks" },
                { icon: Bot, label: "AI judge", desc: "Tone and nuance" },
                { icon: BarChart3, label: "Track drift", desc: "Score history over time" },
              ].map((f) => (
                <div key={f.label} className="rounded-lg border border-border/60 bg-card/40 px-3 py-3 text-left">
                  <div className="flex size-7 items-center justify-center rounded-md bg-brand/10 text-brand mb-2">
                    <f.icon className="size-3.5" />
                  </div>
                  <p className="text-[11px] font-semibold text-foreground leading-tight">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-tight">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8">
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-brand hover:bg-brand/90 text-primary-foreground"
              >
                <Plus className="size-4 mr-1.5" />
                Create your first eval suite
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {suites.map((suite) => {
            const lastScore = suite.runs[0]?.score;
            const isRunning = runningIds.has(suite.id) || suite.runs[0]?.status === "running";
            const agent = agents.find(a => a.id === suite.agentId);
            const sparkScores = suite.runs.filter(r => r.score != null).slice(0, 5).reverse().map(r => r.score!);

            return (
              <div
                key={suite.id}
                className="rounded-xl border border-border bg-card p-5 hover:border-border/80 transition-colors cursor-pointer group"
                onClick={() => router.push(`/evals/${suite.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{suite.name}</h3>
                    {agent && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Bot className="size-3 text-muted-foreground/40" />
                        <span className="text-[10px] text-muted-foreground/50">{agent.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {isRunning ? (
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <Loader2 className="size-3.5 animate-spin" />
                        <span className="text-xs font-medium">Running...</span>
                      </div>
                    ) : (
                      <p className={cn("text-2xl font-bold font-mono", scoreColor(lastScore))}>
                        {lastScore != null ? `${lastScore}%` : "—"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sparkline */}
                {sparkScores.length > 1 && (
                  <div className="flex items-end gap-[3px] h-5 mb-3">
                    {sparkScores.map((s, i) => (
                      <div key={i} className={cn("flex-1 rounded-sm", s >= 80 ? "bg-green-500/40" : s >= 60 ? "bg-amber-500/40" : "bg-red-500/40")} style={{ height: `${Math.max(3, (s / 100) * 20)}px` }} />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
                    <span>{suite._count.cases} cases</span>
                    <span>{suite._count.runs} runs</span>
                    {suite.runs[0] && <span suppressHydrationWarning>{formatRelativeTime(suite.runs[0].startedAt)}</span>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleRun(suite.id)} disabled={isRunning} className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-brand bg-brand/10 hover:bg-brand/20 transition-colors disabled:opacity-40">
                      <Play className="size-2.5" /> Run
                    </button>
                    <button onClick={() => handleDelete(suite.id)} className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 className="size-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {createOpen && (
        <CreateEvalModal
          agents={agents}
          onClose={() => setCreateOpen(false)}
          onCreated={async (suiteId, runImmediately) => {
            setCreateOpen(false);
            await fetchSuites();
            if (runImmediately) {
              handleRun(suiteId);
            }
            router.push(`/evals/${suiteId}`);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE EVAL MODAL (3-step wizard)
// ═══════════════════════════════════════════════════════════════════════════════

function CreateEvalModal({
  agents, onClose, onCreated,
}: {
  agents: { id: string; name: string; model: string }[];
  onClose: () => void;
  onCreated: (suiteId: string, runImmediately: boolean) => void;
}) {
  const [wizardStep, setWizardStep] = useState(0);
  const [suiteName, setSuiteName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [cases, setCases] = useState<{ input: string; expectedOutput: string; criteria: string[] }[]>([]);
  const [runAfterCreate, setRunAfterCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Case form state
  const [caseInput, setCaseInput] = useState("");
  const [caseExpected, setCaseExpected] = useState("");
  const [caseCriteria, setCaseCriteria] = useState<string[]>([]);
  const [criterionInput, setCriterionInput] = useState("");

  const addCriterion = (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !caseCriteria.includes(trimmed)) {
      setCaseCriteria([...caseCriteria, trimmed]);
    }
    setCriterionInput("");
  };

  const addCase = () => {
    if (!caseInput.trim() || caseCriteria.length === 0) {
      toast.error("Input and at least 1 criterion required");
      return;
    }
    setCases([...cases, { input: caseInput, expectedOutput: caseExpected, criteria: [...caseCriteria] }]);
    setCaseInput("");
    setCaseExpected("");
    setCaseCriteria([]);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await apiFetch("/api/evals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: suiteName,
          description: description || undefined,
          agentId,
          cases: cases.map(c => ({
            input: c.input,
            expectedOutput: c.expectedOutput || undefined,
            criteria: c.criteria,
          })),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      const { data } = await res.json();
      toast.success("Eval suite created");
      onCreated(data.suite.id, runAfterCreate);
    } catch (err) {
      toast.error((err as Error).message);
    }
    setCreating(false);
  };

  const CRITERIA_SUGGESTIONS = [
    "mentions [topic]", "under 100 words", "includes code block",
    "is professional tone", "answers the question", "does not mention [X]",
    "starts with a greeting", "includes a summary",
  ];

  return (
    <ModalShell open={true} onClose={onClose} dismissable={!creating}>
      <div className="w-[600px] max-h-[85vh] rounded-xl border border-border bg-card shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">New Eval Suite</h2>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Step {wizardStep + 1} of 3</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={cn("h-1 w-8 rounded-full", i <= wizardStep ? "bg-brand" : "bg-muted/30")} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {wizardStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Suite Name</label>
                <Input value={suiteName} onChange={(e) => setSuiteName(e.target.value)} placeholder="e.g. Code Review Quality" autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Description (optional)</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this eval measure?" className="min-h-[60px]" />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Agent to test</label>
                <Select value={agentId} onValueChange={(v) => v && setAgentId(v)}>
                  <SelectTrigger><SelectValue placeholder="Select an agent..." /></SelectTrigger>
                  <SelectContent>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-foreground">Add test cases</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Each case sends input to the agent and checks output against your criteria</p>
              </div>

              {/* Case input form */}
              <div className="space-y-3 rounded-lg border border-border/50 p-4 bg-muted/10">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1 block">Agent input / task</label>
                  <Textarea value={caseInput} onChange={(e) => setCaseInput(e.target.value)} placeholder="Enter the task you want to send to the agent..." className="min-h-[60px] text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1 block">Expected output (optional)</label>
                  <Textarea value={caseExpected} onChange={(e) => setCaseExpected(e.target.value)} placeholder="Describe what a good response looks like..." className="min-h-[40px] text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-1 block">Pass criteria</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={criterionInput}
                      onChange={(e) => setCriterionInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCriterion(criterionInput))}
                      placeholder="Add criterion and press Enter"
                      className="text-xs"
                    />
                    <Button size="sm" variant="outline" className="shrink-0 text-xs h-9" onClick={() => addCriterion(criterionInput)}>Add</Button>
                  </div>
                  {/* Criteria pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {caseCriteria.map((c, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-medium text-brand">
                        {c}
                        <button onClick={() => setCaseCriteria(caseCriteria.filter((_, j) => j !== i))} className="text-brand/50 hover:text-brand">×</button>
                      </span>
                    ))}
                  </div>
                  {/* Suggestions */}
                  <div className="flex flex-wrap gap-1">
                    {CRITERIA_SUGGESTIONS.filter(s => !caseCriteria.includes(s)).map((s) => (
                      <button key={s} onClick={() => addCriterion(s)} className="rounded-full border border-border/40 px-2 py-0.5 text-[9px] text-muted-foreground/40 hover:text-muted-foreground hover:border-border transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs" onClick={addCase}>+ Add Case</Button>
              </div>

              {/* Cases list */}
              {cases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">{cases.length} case{cases.length > 1 ? "s" : ""} added</p>
                  {cases.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border/40 p-3">
                      <span className="text-[10px] font-mono text-muted-foreground/30 mt-0.5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground line-clamp-1">{c.input}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {c.criteria.map((cr, j) => (
                            <span key={j} className="rounded bg-muted/30 px-1.5 py-0.5 text-[9px] text-muted-foreground/50">{cr}</span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setCases(cases.filter((_, j) => j !== i))} className="text-muted-foreground/30 hover:text-red-400 transition-colors">
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-foreground">Review</p>
              <div className="rounded-lg border border-border/50 p-4 space-y-2 bg-muted/10">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground/50">Suite name</span><span className="text-foreground font-medium">{suiteName}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground/50">Agent</span><span className="text-foreground font-medium">{agents.find(a => a.id === agentId)?.name || agentId}</span></div>
                <div className="flex justify-between text-xs"><span className="text-muted-foreground/50">Test cases</span><span className="text-foreground font-medium">{cases.length}</span></div>
              </div>
              <p className="text-[10px] text-muted-foreground/40">Start with {cases.length} cases. You can add more cases after creating the suite.</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={runAfterCreate} onChange={(e) => setRunAfterCreate(e.target.checked)} className="rounded accent-brand" />
                <span className="text-xs text-muted-foreground">Run immediately after creating</span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 shrink-0">
          <Button variant="ghost" size="sm" onClick={wizardStep === 0 ? onClose : () => setWizardStep(wizardStep - 1)}>
            {wizardStep === 0 ? "Cancel" : "← Back"}
          </Button>
          {wizardStep < 2 ? (
            <Button
              size="sm"
              className="bg-brand hover:bg-brand/90 text-primary-foreground"
              disabled={wizardStep === 0 ? (!suiteName.trim() || !agentId) : cases.length === 0}
              onClick={() => setWizardStep(wizardStep + 1)}
            >
              Next →
            </Button>
          ) : (
            <Button size="sm" className="bg-brand hover:bg-brand/90 text-primary-foreground" onClick={handleCreate} disabled={creating}>
              {creating ? <><Loader2 className="size-3 mr-1 animate-spin" /> Creating...</> : "Create Suite"}
            </Button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
