"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Eye, Trash2, Code2, Shield, FileText, Database, TestTube, Gauge, Globe, Flame, ChevronLeft, ChevronRight as ChevronRightIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAgentsStore } from "@/stores/agents-store";
import { formatRelativeTime, formatNumber, formatCurrency } from "@/lib/format";
import { invalidate } from "@/lib/store-cache";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  ModelBadge,
  ConfirmDialog,
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
    render: (item: Agent) => <AgentRowActions agent={item} />,
  },
];

function AgentRowActions({ agent }: { agent: Agent }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed to delete" }));
        throw new Error(data.error || "Failed to delete");
      }
      toast.success(`Agent "${agent.name}" deleted`);
      invalidate("agents");
      useAgentsStore.getState().fetch();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-0.5">
        <Link href={`/agents/${agent.id}`} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon-xs" title="View agent">
            <Eye className="size-3.5" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => { e.stopPropagation(); setConfirmOpen(true); }}
          disabled={deleting}
          title="Delete agent"
          className="text-muted-foreground hover:text-red-400"
        >
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete agent?"
        description={`This will permanently delete "${agent.name}" and all its runs, evals, and execution history. This cannot be undone.`}
        confirmLabel="Yes, delete"
        variant="danger"
        onConfirm={handleConfirm}
      />
    </>
  );
}

// ── Agent Templates ──

const TEMPLATES = [
  {
    name: "Code Reviewer",
    description: "Reviews code for bugs, security issues, and best practices",
    icon: Code2,
    model: "CLAUDE",
    modelLabel: "Sonnet",
    strategy: "auto",
    systemPrompt: "You are an expert code reviewer. Analyze the provided code for bugs, security vulnerabilities, performance issues, and adherence to best practices. Provide specific, actionable feedback with line references. Prioritize critical issues first, then suggestions for improvement. Be thorough but constructive.",
  },
  {
    name: "Security Scanner",
    description: "Analyzes code and configs for security vulnerabilities",
    icon: Shield,
    model: "CLAUDE",
    modelLabel: "Opus",
    strategy: "quality_first",
    systemPrompt: "You are a security analysis expert. Scan the provided code, configuration files, or infrastructure definitions for security vulnerabilities. Check for OWASP Top 10 issues, secrets exposure, insecure defaults, missing authentication/authorization, injection flaws, and misconfigurations. Rate each finding by severity (Critical, High, Medium, Low) and provide remediation steps.",
  },
  {
    name: "Documentation Writer",
    description: "Generates clear technical documentation from code and specs",
    icon: FileText,
    model: "CLAUDE",
    modelLabel: "Haiku",
    strategy: "cost_first",
    systemPrompt: "You are a technical documentation specialist. Generate clear, well-structured documentation from the provided code, API specs, or system descriptions. Use consistent formatting with headers, code examples, parameter tables, and return value descriptions. Write for a developer audience. Include usage examples and common pitfalls.",
  },
  {
    name: "Data Pipeline Agent",
    description: "Processes, transforms, and validates data pipelines",
    icon: Database,
    model: "CLAUDE",
    modelLabel: "Haiku",
    strategy: "cost_first",
    systemPrompt: "You are a data engineering expert. Analyze, design, and troubleshoot data pipelines. Help with ETL/ELT processes, data transformations, schema design, data validation rules, and pipeline optimization. Provide SQL queries, transformation logic, and data quality checks as needed.",
  },
  {
    name: "Test Writer",
    description: "Generates comprehensive test suites for existing code",
    icon: TestTube,
    model: "CLAUDE",
    modelLabel: "Sonnet",
    strategy: "auto",
    systemPrompt: "You are a test engineering expert. Generate comprehensive test suites for the provided code. Write unit tests, integration tests, and edge case tests. Use the appropriate testing framework for the language. Ensure high coverage of branches and edge cases. Include setup/teardown, mocks where needed, and descriptive test names.",
  },
  {
    name: "Performance Optimizer",
    description: "Identifies and fixes performance bottlenecks in code",
    icon: Gauge,
    model: "CLAUDE",
    modelLabel: "Sonnet",
    strategy: "auto",
    systemPrompt: "You are a performance optimization expert. Analyze the provided code for performance bottlenecks, memory leaks, unnecessary allocations, N+1 queries, slow algorithms, and missing caching opportunities. Provide specific optimization recommendations with before/after code examples and estimated impact.",
  },
  {
    name: "API Designer",
    description: "Designs RESTful and GraphQL APIs with best practices",
    icon: Globe,
    model: "CLAUDE",
    modelLabel: "Sonnet",
    strategy: "auto",
    systemPrompt: "You are an API design expert. Design clean, consistent, and well-documented REST or GraphQL APIs. Follow best practices for resource naming, HTTP methods, status codes, pagination, filtering, error responses, and versioning. Provide OpenAPI/Swagger specs or GraphQL schema definitions with examples.",
  },
  {
    name: "Incident Responder",
    description: "Analyzes incidents, finds root cause, and suggests fixes",
    icon: Flame,
    model: "CLAUDE",
    modelLabel: "Opus",
    strategy: "quality_first",
    systemPrompt: "You are an incident response expert. Analyze the provided error logs, metrics, alerts, or system state to identify root causes of incidents. Follow a structured approach: 1) Assess severity and blast radius, 2) Identify the root cause, 3) Suggest immediate mitigation, 4) Recommend long-term fixes, 5) Draft a post-mortem summary. Be decisive and prioritize speed of resolution.",
  },
];

function TemplatesRow() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasDragged = useRef(false);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX;
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const walk = e.pageX - startX.current;
    if (Math.abs(walk) > 8) {
      hasDragged.current = true;
      scrollRef.current!.style.cursor = "grabbing";
    }
    if (hasDragged.current) {
      scrollRef.current!.scrollLeft = scrollLeft.current - walk;
    }
  };

  const onPointerUp = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  };

  const handleUseTemplate = async (t: typeof TEMPLATES[0]) => {
    if (hasDragged.current) return; // Ignore clicks at the end of a drag
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: t.name,
          description: t.description,
          model: t.model,
          modelStrategy: t.strategy,
          systemPrompt: t.systemPrompt,
          temperature: 0.7,
          maxTokens: 4096,
          tools: [],
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const agent = await res.json();
      invalidate("agents");
      router.push(`/agents/${agent.id}`);
    } catch {
      // Fallback to wizard if quick-create fails
      const params = new URLSearchParams({
        name: t.name,
        model: t.model,
        strategy: t.strategy,
        systemPrompt: t.systemPrompt,
        description: t.description,
      });
      router.push(`/agents/builder?${params.toString()}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Templates</h3>
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">Pre-built agents you can deploy in 1 click</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => scroll("left")} className="flex size-6 items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30 transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => scroll("right")} className="flex size-6 items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30 transition-colors">
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1 cursor-grab select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.name}
              className="group flex flex-col justify-between min-w-[220px] max-w-[220px] rounded-xl border border-border/50 bg-card/40 p-4 hover:border-brand/20 hover:bg-brand/[0.02] hover:[box-shadow:var(--card-shadow-hover)] transition-all shrink-0"
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-brand/8 border border-brand/15">
                    <Icon className="size-3.5 text-brand/70" />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/40 bg-muted/30 px-1.5 py-0.5 rounded">{t.modelLabel}</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1 line-clamp-2 leading-relaxed">{t.description}</p>
              </div>
              <button
                onClick={() => handleUseTemplate(t)}
                className="mt-3 w-full h-7 rounded-md border border-brand/20 bg-brand/5 text-[10px] font-medium text-brand hover:bg-brand/10 transition-colors"
              >
                Use Template
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim() || !prompt.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: "",
          model: "CLAUDE",
          modelStrategy: "auto",
          systemPrompt: prompt.trim(),
          temperature: 0.7,
          maxTokens: 4096,
          tools: [],
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(data.error || "Failed to create agent");
      }
      const agent = await res.json();
      invalidate("agents");
      router.push(`/agents/${agent.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Quick Create Agent</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Name it, prompt it, run it. Configure more later.</p>
          </div>
          <Link href="/agents/builder" className="text-[10px] text-brand hover:underline">
            Advanced Setup
          </Link>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Agent Name</label>
            <Input
              placeholder="e.g. Code Reviewer, Data Analyst..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">System Prompt</label>
            <textarea
              placeholder="You are an expert..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-brand/50"
              rows={4}
            />
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Model: Auto (selects best tier per task) &middot; Trigger: Manual &middot; Memory: Session
            </p>
          </div>
        </div>

        {error && (
          <p className="text-[10px] text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-brand text-primary-foreground hover:bg-brand/90"
            onClick={handleCreate}
            disabled={!name.trim() || !prompt.trim() || creating}
          >
            {creating ? (
              <><Loader2 className="size-3 mr-1.5 animate-spin" /> Creating...</>
            ) : (
              <><Plus className="size-3 mr-1.5" /> Create & Open</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const router = useRouter();
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
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
        <Button size="sm" onClick={() => setQuickCreateOpen(true)}>
          <Plus className="size-3.5 mr-1" />
          Create Agent
        </Button>
      </PageHeader>

      <QuickCreateModal open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)} />

      {/* Templates */}
      <TemplatesRow />

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
