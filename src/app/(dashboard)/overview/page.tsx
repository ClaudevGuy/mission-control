"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, GlassPanel } from "@/components/shared";
import { SystemHealthBar } from "@/components/overview/SystemHealthBar";
import { LiveStatsRow } from "@/components/overview/LiveStatsRow";
import { QuickActions } from "@/components/overview/QuickActions";
import { AgentStatusGrid } from "@/components/overview/AgentStatusGrid";
import { CostBurnChart } from "@/components/overview/CostBurnChart";
import { TopIssues } from "@/components/overview/TopIssues";
import { ExternalAgentsWidget } from "@/components/overview/ExternalAgents";
import { useAgentsStore } from "@/stores/agents-store";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useCostsStore } from "@/stores/costs-store";
import { useNotificationsStore } from "@/stores/notifications-store";
import { TrendingDown, Plug, ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";
// ─────────────────────────────────────────────────────────────
// Using the Zustand hook directly (not via selector) so we can read agents count

function SavingsBanner() {
  const [savings, setSavings] = useState<{ actual: number; tier1: number; saved: number; percent: number } | null>(null);

  useEffect(() => {
    fetch("/api/costs/model-savings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.tier1Cost > 0) {
          const saved = data.tier1Cost - data.actualCost;
          setSavings({
            actual: data.actualCost,
            tier1: data.tier1Cost,
            saved: Math.max(0, saved),
            percent: Math.round((saved / data.tier1Cost) * 100),
          });
        }
      })
      .catch(() => {});
  }, []);

  if (!savings || savings.saved <= 0) return null;

  return (
    <div className="rounded-xl border border-brand/20 bg-brand/[0.04] p-4 flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10">
        <TrendingDown className="size-5 text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-brand">
          Auto-selection saved you ${savings.saved.toFixed(2)} this month
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {savings.percent}% less than always using premium models &middot; Actual: ${savings.actual.toFixed(2)} vs ${savings.tier1.toFixed(2)} at Tier 1
        </p>
      </div>
      <Link href="/costs" className="text-[10px] text-brand hover:underline shrink-0">View details</Link>
    </div>
  );
}

// Lightweight JS/TS tokenizer for the SDK snippet — no dependencies.
// Recognizes: keywords, strings, numbers, class identifiers (PascalCase),
// method calls (ident followed by `(`), object keys (ident followed by `:`),
// comments, and punctuation.
const TOKEN_COLORS = {
  keyword:   "#A855F7",                 // purple — import, const, from, new, await
  string:    "#00d992",                 // emerald — string literals
  number:    "#F59E0B",                 // amber — numeric literals
  klass:     "#00D4FF",                 // cyan — PascalCase identifiers
  fn:        "#F5A97F",                 // apricot — method/function calls
  property:  "#EC4899",                 // pink — object keys
  comment:   "rgb(var(--ink-rgb) / 0.35)",
  punct:     "rgb(var(--ink-rgb) / 0.55)",
  ident:     "rgb(var(--ink-rgb) / 0.82)",
} as const;

const KEYWORDS = new Set([
  "import", "from", "const", "let", "var", "new", "await", "async",
  "function", "return", "if", "else", "export", "default", "true", "false", "null",
]);

type Tok = { text: string; color: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const re =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\s])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const [, cmt, str, num, id, ws, punct] = m;
    if (cmt) out.push({ text: cmt, color: TOKEN_COLORS.comment });
    else if (str) out.push({ text: str, color: TOKEN_COLORS.string });
    else if (num) out.push({ text: num, color: TOKEN_COLORS.number });
    else if (id) {
      // Decide: keyword | class | fn-call | property | ident.
      let color: string = TOKEN_COLORS.ident;
      if (KEYWORDS.has(id)) color = TOKEN_COLORS.keyword;
      else if (/^[A-Z]/.test(id)) color = TOKEN_COLORS.klass;
      else {
        // Peek the next non-whitespace character: `(` → fn, `:` → property.
        const rest = src.slice(re.lastIndex);
        const next = rest.match(/^\s*(\S)/)?.[1];
        if (next === "(") color = TOKEN_COLORS.fn;
        else if (next === ":") color = TOKEN_COLORS.property;
      }
      out.push({ text: id, color });
    } else if (ws) {
      out.push({ text: ws, color: "inherit" });
    } else if (punct) {
      out.push({ text: punct, color: TOKEN_COLORS.punct });
    }
  }
  return out;
}

function CodeBlock({ code }: { code: string }) {
  const tokens = React.useMemo(() => tokenize(code), [code]);
  return (
    <pre
      className="rounded-lg border p-4 pr-12 text-[11px] font-mono leading-[1.65] overflow-x-auto"
      style={{
        background: "linear-gradient(180deg, rgb(6, 6, 10) 0%, rgb(10, 10, 14) 100%)",
        borderColor: "rgb(var(--ink-rgb) / 0.1)",
        color: "rgb(var(--ink-rgb) / 0.82)",
        boxShadow: "inset 0 0 0 1px rgb(var(--ink-rgb) / 0.015), 0 2px 14px rgba(0,0,0,0.45)",
      }}
    >
      <code>
        {tokens.map((t, i) => (
          <span key={i} style={{ color: t.color }}>{t.text}</span>
        ))}
      </code>
    </pre>
  );
}

function ConnectExternalAgentsCTA() {
  const [origin, setOrigin] = useState("https://your-app.com");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const snippet = `import { Mothership } from '@mothership/sdk'

const mc = new Mothership({
  url: '${origin}',
  apiKey: 'mc_your_key',
  source: 'my-app',
})

await mc.trackRun({
  agent: { id: 'agent-1', name: 'MyAgent' },
  status: 'completed',
  cost: 0.05,
})`;

  return (
    <GlassPanel padding="md">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Plug className="size-5 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Connect Your Existing Agents</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Track agents from CrewAI, LangGraph, Paperclip, or any custom framework in MOTHERSHIP
            </p>
          </div>
          <div className="relative">
            <CodeBlock code={snippet} />
            <button
              onClick={() => { navigator.clipboard.writeText(snippet); toast.success("Copied to clipboard"); }}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-md border text-muted-foreground hover:text-foreground transition-colors"
              style={{
                background: "rgb(6, 6, 10)",
                borderColor: "rgb(var(--ink-rgb) / 0.12)",
              }}
              aria-label="Copy code"
            >
              <Copy className="size-3" />
            </button>
          </div>
          <Link href="/tutorial?section=external-agents" className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:underline">
            Full SDK documentation <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </GlassPanel>
  );
}

export default function OverviewPage() {
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetch);
  const fetchDeployments = useDeploymentsStore((s) => s.fetch);
  const fetchIncidents = useIncidentsStore((s) => s.fetch);
  const fetchCosts = useCostsStore((s) => s.fetch);
  const fetchNotifications = useNotificationsStore((s) => s.fetch);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAgents();
    fetchDeployments();
    fetchIncidents();
    fetchCosts();
    fetchNotifications();
  }, []);

  const hasAgents = agents.length > 0;

  // Unified layout: QuickActions only appears once there are agents to act on.
  // Before that, the Step 1 card in AgentStatusGrid is the single clear CTA.
  return (
    <div className="space-y-6">
      <PageHeader title="MOTHERSHIP" description="Real-time operational overview" />
      <SystemHealthBar />
      <LiveStatsRow />
      <SavingsBanner />
      {hasAgents && <QuickActions />}
      <AgentStatusGrid />
      <ExternalAgentsWidget />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CostBurnChart />
        <TopIssues />
      </div>
      <ConnectExternalAgentsCTA />
    </div>
  );
}
