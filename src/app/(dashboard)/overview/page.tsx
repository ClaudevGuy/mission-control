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
import { TrendingDown, Plug, ArrowRight, Copy, Package, Terminal } from "lucide-react";
import { toast } from "sonner";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
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
  const [sdkOpen, setSdkOpen] = useState(false);
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
          <button
            type="button"
            onClick={() => setSdkOpen(true)}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Full SDK documentation <ArrowRight className="size-3" />
          </button>
        </div>
      </div>

      {/* ── SDK Documentation modal ── */}
      <ModalShell open={sdkOpen} onClose={() => setSdkOpen(false)}>
        <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-brand" />
              <span className="text-sm font-semibold">Mothership SDK</span>
            </div>
            <button
              onClick={() => setSdkOpen(false)}
              className="text-muted-foreground hover:text-foreground text-lg leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <div className="px-5 py-5 space-y-5 text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Push run data from any agent framework into MOTHERSHIP. One client,
              one <code className="rounded bg-muted px-1 py-0.5 text-[11px] text-foreground">trackRun()</code> call per agent execution — you get unified observability
              across costs, latency, and outcomes.
            </p>

            {/* Install */}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 mb-2 flex items-center gap-1.5">
                <Terminal className="size-3" /> Install
              </p>
              <div className="relative">
                <pre className="rounded-lg border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-foreground overflow-x-auto">
                  npm install @mothership/sdk
                </pre>
                <button
                  onClick={() => { navigator.clipboard.writeText("npm install @mothership/sdk"); toast.success("Copied"); }}
                  className="absolute top-1.5 right-1.5 p-1 rounded border border-border bg-card/80 text-muted-foreground hover:text-foreground"
                  aria-label="Copy install command"
                >
                  <Copy className="size-3" />
                </button>
              </div>
            </div>

            {/* Core methods */}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 mb-2">Core methods</p>
              <div className="space-y-2">
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                  <code className="text-xs font-mono text-brand">new Mothership(&#123; url, apiKey, source &#125;)</code>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Initialize the client with your API key and source label.</p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                  <code className="text-xs font-mono text-brand">mc.trackRun(&#123; agent, status, cost &#125;)</code>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Report a completed agent run — logs to the dashboard in real time.</p>
                </div>
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                  <code className="text-xs font-mono text-brand">mc.trackStep(&#123; runId, name, output &#125;)</code>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Optional — log intermediate steps for granular tracing.</p>
                </div>
              </div>
            </div>

            {/* Frameworks */}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60 mb-2">Works with</p>
              <div className="flex flex-wrap gap-1.5">
                {["CrewAI", "LangGraph", "Paperclip", "AutoGen", "Custom"].map((f) => (
                  <span key={f} className="rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] font-medium text-foreground">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-brand/20 bg-brand/[0.04] px-3.5 py-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Next step:</span> Generate an API key under Team &rsaquo; API Keys, then drop the snippet above into your agent code.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 bg-muted/10">
            <Button variant="outline" size="sm" onClick={() => setSdkOpen(false)}>
              Close
            </Button>
            <Link href="/team?tab=keys" onClick={() => setSdkOpen(false)}>
              <Button size="sm" className="bg-brand hover:bg-brand/90 text-primary-foreground">
                Get API key
              </Button>
            </Link>
          </div>
        </div>
      </ModalShell>
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

  // ─── Personal greeting — hydrated from /api/profile, timezone-aware ───
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;

    const compute = (name: string, tz: string) => {
      // Read the hour as the user sees it, not as the server/browser does.
      // `toLocaleString` + { timeZone } is the reliable way to get wall-clock
      // hour in an arbitrary IANA zone without pulling in a date library.
      const hour = Number(
        new Date().toLocaleString("en-US", {
          timeZone: tz || "UTC",
          hour: "numeric",
          hour12: false,
        })
      );
      const period =
        hour < 5 ? "evening" :
        hour < 12 ? "morning" :
        hour < 17 ? "afternoon" :
        "evening";
      // First token only — "Daniel Smith" → "Daniel", "Kat" → "Kat"
      const first = (name || "").trim().split(/\s+/)[0] || "";
      return first ? `Good ${period}, ${first}` : `Good ${period}`;
    };

    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const user = data.data?.user;
        if (!user || cancelled) return;
        const name = user.displayName || user.name || "";
        const tz = user.timezone || "UTC";
        setGreeting(compute(name, tz));
      } catch { /* keep the fallback title */ }
    };

    load();
    // Re-compute every 5 minutes so the greeting updates naturally as the
    // user crosses noon / 5pm without needing a page refresh.
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const hasAgents = agents.length > 0;

  // Unified layout: QuickActions only appears once there are agents to act on.
  // Before that, the Step 1 card in AgentStatusGrid is the single clear CTA.
  return (
    <div className="space-y-6">
      <PageHeader
        title={greeting ?? "MOTHERSHIP"}
        eyebrow="MOTHERSHIP"
        description="Real-time operational overview"
      />
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
