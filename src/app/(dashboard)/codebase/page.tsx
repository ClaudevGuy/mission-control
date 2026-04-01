"use client";

import React, { useState, useEffect } from "react";
import { useCodebaseStore } from "@/stores/codebase-store";
import {
  PageHeader,
  GlassPanel,
  StatusBadge,
  DataTable,
  SparklineChart,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Bot, GitBranch, FolderOpen, FolderClosed, FileText, Star, CircleDot } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ── File Tree ── */
interface TreeNode { name: string; type: "folder" | "file"; children?: TreeNode[]; }

const FILE_TREE: TreeNode[] = [
  { name: "src", type: "folder", children: [
    { name: "app", type: "folder", children: [
      { name: "api", type: "folder", children: [
        { name: "claims/route.ts", type: "file" },
        { name: "auth/route.ts", type: "file" },
        { name: "webhooks/route.ts", type: "file" },
      ]},
      { name: "dashboard", type: "folder", children: [
        { name: "page.tsx", type: "file" },
        { name: "layout.tsx", type: "file" },
      ]},
      { name: "layout.tsx", type: "file" },
    ]},
    { name: "components", type: "folder", children: [
      { name: "ui", type: "folder", children: [] },
      { name: "shared", type: "folder", children: [] },
      { name: "features", type: "folder", children: [] },
    ]},
    { name: "lib", type: "folder", children: [
      { name: "utils.ts", type: "file" },
      { name: "api.ts", type: "file" },
      { name: "auth.ts", type: "file" },
    ]},
    { name: "stores", type: "folder", children: [{ name: "app-store.ts", type: "file" }] },
    { name: "types", type: "folder", children: [{ name: "index.ts", type: "file" }] },
  ]},
];

function FileTreeNode({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === "folder";
  return (
    <div>
      <button
        className={cn(
          "flex items-center gap-1.5 w-full text-left py-1 text-xs font-mono hover:bg-muted/40 rounded px-1.5 transition-colors",
          isFolder ? "text-foreground" : "text-muted-foreground"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => isFolder && setOpen(!open)}
      >
        {isFolder ? (
          open ? <FolderOpen className="size-3.5 text-[#00D4FF] shrink-0" /> : <FolderClosed className="size-3.5 text-[#00D4FF]/60 shrink-0" />
        ) : (
          <FileText className="size-3.5 text-muted-foreground/60 shrink-0" />
        )}
        {node.name}
      </button>
      {isFolder && open && node.children?.map((child) => (
        <FileTreeNode key={child.name} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

/* ── Commit type badge ── */
const COMMIT_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  feat: { bg: "rgba(66,133,244,0.12)", border: "rgba(66,133,244,0.3)", text: "#4285F4" },
  fix: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#EF4444" },
  perf: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", text: "#F59E0B" },
  test: { bg: "rgba(57,255,20,0.12)", border: "rgba(57,255,20,0.3)", text: "#39FF14" },
  docs: { bg: "rgba(128,128,128,0.05)", border: "rgba(128,128,128,0.12)", text: "#888" },
  chore: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", text: "#A855F7" },
  refactor: { bg: "rgba(0,212,255,0.12)", border: "rgba(0,212,255,0.3)", text: "#00D4FF" },
};

function getCommitType(message: string): string {
  const match = message.match(/^(feat|fix|perf|test|docs|chore|refactor)/i);
  return match ? match[1].toLowerCase() : "feat";
}

/* ── Health Score Ring ── */
function HealthRing({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score > 80 ? "#39FF14" : score > 60 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--border-subtle, rgba(255,255,255,0.06))" strokeWidth="6" />
        <circle
          cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-heading text-5xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

/* ── Health bar colors ── */
const HEALTH_COLORS: Record<string, string> = {
  testCoverage: "#4285F4",
  technicalDebt: "#F59E0B",
  securityIssues: "#EF4444",
  dependencyFreshness: "#39FF14",
  aiCodeRatio: "#A855F7",
};
const HEALTH_LABELS: Record<string, string> = {
  testCoverage: "Test Coverage",
  technicalDebt: "Technical Debt",
  securityIssues: "Security Issues",
  dependencyFreshness: "Dep. Freshness",
  aiCodeRatio: "AI Code Ratio",
};

/* ── Page ── */
export default function CodebasePage() {
  const [tab, setTab] = useState<"overview" | "commits" | "prs">("overview");
  const { repositories, getFilteredCommits, getFilteredPRs, codeHealth, fetch: fetchCodebase } = useCodebaseStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCodebase(); }, []);
  const commits = getFilteredCommits();
  const pullRequests = getFilteredPRs();

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "commits" as const, label: "Commits" },
    { id: "prs" as const, label: "Pull Requests" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Codebase" description="Repository intelligence and code quality metrics" />

      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "pb-2.5 text-sm font-medium transition-colors relative",
                tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              {t.label}
              {tab === t.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overview Tab ── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Repo cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {repositories.map((repo) => (
              <GlassPanel key={repo.id} hover padding="lg" className="transition-shadow hover:shadow-[0_0_12px_rgba(0,212,255,0.08)]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-mono text-sm font-bold text-foreground truncate">{repo.name}</h3>
                    <StatusBadge
                      status={repo.ciStatus === "passing" ? "success" : repo.ciStatus === "failing" ? "failed" : "pending"}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/40 border border-border">
                      <GitBranch className="size-2.5" /> {repo.branch}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{repo.language}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono" suppressHydrationWarning>{formatRelativeTime(repo.lastCommit)}</span>
                    <SparklineChart data={[3,5,2,7,4,6,8]} color="#00D4FF" width={40} height={16} />
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Star className="size-2.5" /> 128
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <CircleDot className="size-2.5" /> 12 issues
                    </span>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>

          {/* File Browser + Code Health */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <GlassPanel padding="lg" className="lg:col-span-2">
              <h2 className="text-sm font-semibold text-foreground mb-3">File Browser</h2>
              <div className="max-h-[400px] overflow-y-auto pr-1">
                {FILE_TREE.map((node) => <FileTreeNode key={node.name} node={node} />)}
              </div>
            </GlassPanel>

            <GlassPanel padding="lg" className="lg:col-span-3">
              <h2 className="text-sm font-semibold text-foreground mb-4">Code Health</h2>
              <div className="flex gap-8 items-start">
                <HealthRing score={codeHealth.overall} />
                <div className="flex-1 space-y-3 pt-2">
                  {Object.entries(HEALTH_LABELS).map(([key, label]) => {
                    const val = codeHealth[key as keyof typeof codeHealth];
                    const color = HEALTH_COLORS[key] || "#888";
                    const isCount = key === "securityIssues";
                    const barWidth = isCount ? Math.min(val * 10, 100) : val;
                    const displayColor = isCount ? (val === 0 ? "#39FF14" : "#EF4444") : color;

                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono text-foreground">{isCount ? val : `${val}%`}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted/50">
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%`, background: displayColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Insights */}
              <div className="mt-5 pt-4 border-t border-border">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">AI Insights</h3>
                <div className="space-y-1.5">
                  <p className="text-xs text-amber-400/80">⚠ BugHunter has modified 34% of core files this week</p>
                  <p className="text-xs text-green-400/80">✓ Test coverage increased 4% from last week</p>
                  <p className="text-xs text-[#00D4FF]/80">↑ Technical debt trending down — 3 modules refactored</p>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* Recent Commits Feed */}
          <GlassPanel padding="lg">
            <h2 className="text-sm font-semibold text-foreground mb-3">Recent Commits</h2>
            <div className="space-y-1">
              {commits.slice(0, 8).map((c) => {
                const commitType = getCommitType(c.message);
                const typeColor = COMMIT_TYPE_COLORS[commitType] || COMMIT_TYPE_COLORS.feat;
                return (
                  <div key={c.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <span className="font-mono text-xs text-[#00D4FF] shrink-0 w-16">{c.hash}</span>
                    <span
                      className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ background: typeColor.bg, border: `1px solid ${typeColor.border}`, color: typeColor.text }}
                    >
                      {commitType}
                    </span>
                    <span className="text-xs text-foreground truncate flex-1">{c.message}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.isAgent && <Bot className="size-3 text-[#00D4FF]" />}
                      <div className="size-5 rounded-full bg-muted/50 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-muted-foreground">{c.author.charAt(0)}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{c.author}</span>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground rounded px-1.5 py-0.5" style={{ background: "var(--bg-hover, rgba(255,255,255,0.06))", borderRadius: 4 }}>
                      {c.filesChanged} {c.filesChanged === 1 ? "file" : "files"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-20 text-right" suppressHydrationWarning>
                      {formatRelativeTime(c.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── Commits Tab ── */}
      {tab === "commits" && (
        <div className="space-y-1">
          {commits.map((c) => {
            const commitType = getCommitType(c.message);
            const typeColor = COMMIT_TYPE_COLORS[commitType] || COMMIT_TYPE_COLORS.feat;
            return (
              <div key={c.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                <span className="font-mono text-xs text-[#00D4FF] shrink-0 w-16">{c.hash}</span>
                <span
                  className="shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: typeColor.bg, border: `1px solid ${typeColor.border}`, color: typeColor.text }}
                >
                  {commitType}
                </span>
                <span className="text-sm text-foreground truncate flex-1">{c.message}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.isAgent && <Bot className="size-3 text-[#00D4FF]" />}
                  <div className="size-6 rounded-full bg-muted/50 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-muted-foreground">{c.author.charAt(0)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.author}</span>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground bg-muted/40 rounded px-1.5 py-0.5 font-mono">
                  {c.filesChanged} files
                </span>
                <span className="font-mono text-xs">
                  <span className="text-green-400">+{c.additions}</span>
                  <span className="text-muted-foreground mx-0.5">/</span>
                  <span className="text-red-400">-{c.deletions}</span>
                </span>
                <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-24 text-right" suppressHydrationWarning>
                  {formatRelativeTime(c.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PRs Tab ── */}
      {tab === "prs" && (
        <GlassPanel padding="none">
          <DataTable
            columns={[
              { key: "title", label: "Title", render: (r: Record<string, unknown>) => <span className="text-sm font-medium text-foreground">{r.title as string}</span> },
              { key: "author", label: "Author", sortable: true, render: (r: Record<string, unknown>) => <span className="text-xs text-muted-foreground">{r.author as string}</span> },
              { key: "status", label: "Status", sortable: true, render: (r: Record<string, unknown>) => <StatusBadge status={r.status as string} size="sm" /> },
              { key: "labels", label: "Labels", render: (r: Record<string, unknown>) => (
                <div className="flex gap-1 flex-wrap">{(r.labels as string[]).map((l) => <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>)}</div>
              )},
              { key: "createdAt", label: "Created", sortable: true, render: (r: Record<string, unknown>) => <span className="text-xs text-muted-foreground" suppressHydrationWarning>{formatRelativeTime(r.createdAt as string)}</span> },
              { key: "additions", label: "+/-", render: (r: Record<string, unknown>) => (
                <span className="font-mono text-xs"><span className="text-green-400">+{r.additions as number}</span>{" / "}<span className="text-red-400">-{r.deletions as number}</span></span>
              )},
            ]}
            data={pullRequests as unknown as Record<string, unknown>[]}
            pageSize={10}
          />
        </GlassPanel>
      )}
    </div>
  );
}
