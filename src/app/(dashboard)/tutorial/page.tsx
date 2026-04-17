/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  FileCode,
  FlaskConical,
  Shield,
  TrendingDown,
  Check,
  ChevronRight,
  ChevronLeft,
  Terminal,
  Sparkles,
  Circle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ══════════════════════════════════════════════════════════════════════════════
// Tutorial — a linear 7-step onboarding flow.
// Each step walks the user from zero to a streaming agent with tier-routed
// savings, a versioned prompt, an eval, and safeguards turned on.
// Progress persists to localStorage (`mothership.tutorial.completed`).
// ══════════════════════════════════════════════════════════════════════════════

// Monochrome brand + strict semantic palette
const BRAND = "var(--primary)";      // warm cream — primary / interactive / active
const EMERALD = "#00d992";    // semantic success — savings, passing, live
const OXBLOOD = BRAND;        // alias retained so mini-plates below keep compiling
const STORAGE_KEY = "mothership.tutorial.completed";

interface TutorialStep {
  id: string;
  n: number;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  readTime: string;
  ctaLabel: string;
  ctaHref: string;
  body: React.ReactNode;
  plate: React.ReactNode;
}

// ── Step 1 — The Install ─────────────────────────────────────────────────────
function PlateTerminal() {
  return (
    <div className="rounded-md border border-[#3d3a39] bg-[#0d0c0a] shadow-[6px_6px_0_rgba(0,0,0,0.4)] overflow-hidden font-mono text-[12.5px] leading-[1.7]">
      <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#e96d5a]" />
          <span className="size-2.5 rounded-full bg-[#e8b24d]" />
          <span className="size-2.5 rounded-full bg-[#5fbf7a]" />
        </div>
        <span className="text-[10px] tracking-[0.22em] text-white/30 uppercase ml-auto">terminal</span>
      </div>
      <div className="px-5 py-4 text-[#e7e2d3] space-y-0.5">
        <div><span className="text-[#d8442e] font-medium">$</span> <span className="text-[#f0a87a]">git</span> clone <span className="text-[#5fbf7a]">https://github.com/ClaudevGuy/MotherShip</span></div>
        <div className="pl-5 text-white/45 text-[11.5px]">Cloning into 'MotherShip'… ✓ 18,426 lines</div>
        <div className="mt-2"><span className="text-[#d8442e] font-medium">$</span> cd MotherShip &amp;&amp; <span className="text-[#f0a87a]">npm</span> install</div>
        <div className="pl-5 text-white/45 text-[11.5px]">added 827 packages in 14s ✓</div>
        <div className="mt-2"><span className="text-[#d8442e] font-medium">$</span> <span className="text-[#f0a87a]">npm</span> run dev</div>
        <div className="pl-5 text-white/55 text-[11.5px]"><span className="text-[#5fbf7a]">▲ Next.js 14</span> — ready on <span className="text-[#f0a87a]">http://localhost:3000</span></div>
      </div>
    </div>
  );
}

// ── Step 2 — Create an Agent ─────────────────────────────────────────────────
function PlateQuickCreate() {
  return (
    <div className="rounded-md border border-[#3d3a39] bg-[#0d0c0a] shadow-[6px_6px_0_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-2.5">
        <Sparkles className="size-3.5" style={{ color: OXBLOOD }} />
        <span className="text-xs font-medium text-[#e7e2d3]">Create an Agent</span>
        <span className="ml-auto text-[10px] tracking-[0.2em] text-white/30 uppercase">Modal</span>
      </div>
      <div className="p-5 space-y-3.5">
        <div className="space-y-1.5">
          <label className="block text-[10px] tracking-[0.2em] text-white/40 uppercase font-mono">Agent name</label>
          <div className="rounded border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-[#e7e2d3]">Marcus — code reviewer</div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] tracking-[0.2em] text-white/40 uppercase font-mono">System prompt</label>
          <div className="rounded border border-white/10 bg-white/[0.02] px-3 py-2 text-[12.5px] text-[#e7e2d3]/80 leading-relaxed font-mono">
            You review GitHub PRs for SQL injection, hardcoded secrets, and<br/>async error handling. You respond in under 200 words…
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] tracking-[0.16em] text-[#5fbf7a] uppercase font-mono px-2 py-0.5 rounded border border-[#5fbf7a]/30 bg-[#5fbf7a]/10">
            Auto-route · Tier 3 likely
          </span>
          <span className="ml-auto text-[11px] text-white/50 font-mono">~ $0.002 / run</span>
        </div>
        <div className="flex gap-2 pt-2">
          <button className="flex-1 rounded px-3 py-2 text-xs font-medium text-white/60 border border-white/10">Cancel</button>
          <button className="flex-1 rounded px-3 py-2 text-xs font-semibold" style={{ background: BRAND, color: "var(--primary-foreground)" }}>Create &amp; Run →</button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3 — Live Execution ───────────────────────────────────────────────────
function PlateLiveRun() {
  return (
    <div className="rounded-md border border-[#3d3a39] bg-[#0d0c0a] shadow-[6px_6px_0_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <div className="size-8 rounded-full grid place-items-center text-[#0d0c0a] font-serif italic text-[15px] font-medium" style={{ background: `linear-gradient(135deg, ${OXBLOOD}, #e85a3d)` }}>M</div>
        <div>
          <div className="text-xs font-medium text-[#e7e2d3]">Marcus — code reviewer</div>
        </div>
        <span className="ml-auto text-[10px] tracking-[0.18em] uppercase font-mono px-2 py-0.5 rounded border border-[#5fbf7a]/30 bg-[#5fbf7a]/10 text-[#5fbf7a]">Tier 3 · Haiku</span>
      </div>
      <div className="px-5 py-4 space-y-3 text-sm leading-relaxed">
        <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
          <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase font-mono mt-0.5">You</span>
          <div className="text-[#e7e2d3]">Review <span className="px-1.5 py-0.5 rounded bg-[#f0a87a]/10 text-[#f0a87a] font-mono text-[12px]">PR #247</span> — auth rewrite.</div>
        </div>
        <div className="grid grid-cols-[40px_1fr] gap-3 items-start">
          <span className="text-[10px] tracking-[0.2em] uppercase font-mono mt-0.5" style={{ color: OXBLOOD }}>Marcus</span>
          <div className="text-[#e7e2d3]">
            Scanning diff — <strong className="font-medium text-white">auth.ts:47</strong> concatenates input into SQL. Use parameterized queries<span className="inline-block w-[7px] h-[14px] ml-0.5 align-text-bottom animate-pulse" style={{ background: OXBLOOD }} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 border-t border-white/5 bg-white/[0.015]">
        <div className="px-3.5 py-2.5 border-r border-white/5"><div className="text-[9.5px] tracking-[0.18em] text-white/40 uppercase font-mono mb-1">Tokens</div><div className="text-[15px] font-serif text-white">842</div></div>
        <div className="px-3.5 py-2.5 border-r border-white/5"><div className="text-[9.5px] tracking-[0.18em] text-white/40 uppercase font-mono mb-1">Cost</div><div className="text-[15px] font-serif text-white">$0.0023</div></div>
        <div className="px-3.5 py-2.5 border-r border-white/5"><div className="text-[9.5px] tracking-[0.18em] text-[#5fbf7a] uppercase font-mono mb-1">Saved</div><div className="text-[15px] font-serif italic" style={{ color: EMERALD }}>$0.0891</div></div>
        <div className="px-3.5 py-2.5"><div className="text-[9.5px] tracking-[0.18em] text-white/40 uppercase font-mono mb-1">Elapsed</div><div className="text-[15px] font-serif text-white">1.4s</div></div>
      </div>
    </div>
  );
}

// ── Step 4 — See Savings ──────────────────────────────────────────────────────
function PlateCostChart() {
  return (
    <div className="rounded-md border border-[#3d3a39] bg-[#0d0c0a] shadow-[6px_6px_0_rgba(0,0,0,0.4)] overflow-hidden p-5">
      <div className="flex items-baseline justify-between mb-3 pb-3 border-b border-white/5">
        <div>
          <div className="text-xs font-medium text-[#e7e2d3]">Monthly savings</div>
          <div className="text-[10px] tracking-[0.18em] text-white/40 uppercase font-mono mt-1">vs pinned-Opus baseline</div>
        </div>
        <div className="font-serif italic text-2xl" style={{ color: EMERALD }}>$858</div>
      </div>
      <svg viewBox="0 0 400 110" className="w-full">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={EMERALD} stopOpacity="0.35"/>
            <stop offset="100%" stopColor={EMERALD} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <line x1="0" y1="30" x2="400" y2="30" stroke="rgb(var(--ink-rgb) / 0.05)" strokeDasharray="2 3"/>
        <line x1="0" y1="60" x2="400" y2="60" stroke="rgb(var(--ink-rgb) / 0.05)" strokeDasharray="2 3"/>
        <line x1="0" y1="90" x2="400" y2="90" stroke="rgb(var(--ink-rgb) / 0.05)" strokeDasharray="2 3"/>
        <path d="M0,92 L20,88 L40,84 L60,76 L80,70 L100,60 L120,58 L140,48 L160,52 L180,40 L200,34 L220,30 L240,34 L260,26 L280,22 L300,18 L320,24 L340,18 L360,12 L380,14 L400,8 L400,110 L0,110 Z" fill="url(#area)"/>
        <path d="M0,92 L20,88 L40,84 L60,76 L80,70 L100,60 L120,58 L140,48 L160,52 L180,40 L200,34 L220,30 L240,34 L260,26 L280,22 L300,18 L320,24 L340,18 L360,12 L380,14 L400,8" fill="none" stroke={EMERALD} strokeWidth="1.5"/>
        <circle cx="400" cy="8" r="3.5" fill={EMERALD}/>
      </svg>
      <div className="grid grid-cols-3 mt-4 pt-3 border-t border-white/5 text-[11px]">
        <div><div className="text-white/40 font-mono text-[9.5px] tracking-[0.18em] uppercase mb-1">Baseline</div><div className="text-white/80 font-serif text-[15px]">$1,247</div></div>
        <div><div className="text-white/40 font-mono text-[9.5px] tracking-[0.18em] uppercase mb-1">Actual</div><div className="text-white/80 font-serif text-[15px]">$389</div></div>
        <div><div className="font-mono text-[9.5px] tracking-[0.18em] uppercase mb-1" style={{ color: EMERALD }}>Recovered</div><div className="font-serif italic text-[15px]" style={{ color: EMERALD }}>68.8%</div></div>
      </div>
    </div>
  );
}

// ── Step 5 — Version the Prompt ──────────────────────────────────────────────
function PlatePromptStudio() {
  return (
    <div className="rounded-md border border-[#3d3a39] bg-[#0d0c0a] shadow-[6px_6px_0_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-2.5">
        <FileCode className="size-3.5" style={{ color: OXBLOOD }} />
        <span className="text-xs font-medium text-[#e7e2d3]">marcus-reviewer</span>
        <span className="ml-auto text-[10px] tracking-[0.2em] text-white/30 uppercase font-mono">42 versions</span>
      </div>
      <div className="divide-y divide-white/5">
        {[
          { v: "v12", tag: "live", tagColor: OXBLOOD, time: "4d ago", note: "Added JWT_SECRET rule", active: true },
          { v: "v11", tag: null, tagColor: null, time: "8d ago", note: "Tightened tone to under 200 words" },
          { v: "v10", tag: null, tagColor: null, time: "12d ago", note: "Added async error handler check" },
          { v: "v9",  tag: null, tagColor: null, time: "2w ago",  note: "Initial prompt" },
        ].map((row) => (
          <div key={row.v} className={cn("flex items-center gap-3 px-4 py-2.5", row.active && "bg-[#d8442e]/[0.05]")}>
            <span className="font-mono text-[11px] text-white/60 w-8">{row.v}</span>
            {row.tag && (
              <span className="text-[9px] tracking-[0.18em] uppercase font-mono px-1.5 py-0.5 rounded" style={{ background: `${row.tagColor}20`, color: row.tagColor, border: `1px solid ${row.tagColor}40` }}>{row.tag}</span>
            )}
            <span className="text-[12px] text-[#e7e2d3]/80 flex-1 truncate">{row.note}</span>
            <span className="text-[10px] text-white/35 font-mono">{row.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 6 — Write an Eval ───────────────────────────────────────────────────
function PlateEval() {
  return (
    <div className="rounded-md border border-[#3d3a39] bg-[#0d0c0a] shadow-[6px_6px_0_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-white/5 px-4 py-2.5">
        <FlaskConical className="size-3.5" style={{ color: OXBLOOD }} />
        <span className="text-xs font-medium text-[#e7e2d3]">code-review.eval.ts</span>
        <span className="ml-auto text-[10px] font-mono tracking-[0.18em] uppercase" style={{ color: EMERALD }}>94% passing</span>
      </div>
      <div className="p-4 space-y-2">
        {[
          { id: "01", desc: "catches SQL injection", pass: true },
          { id: "02", desc: "catches hardcoded secrets", pass: true },
          { id: "03", desc: "under 200 words", pass: true },
          { id: "04", desc: "mentions line numbers", pass: true },
          { id: "05", desc: "proposes concrete fix", pass: false },
        ].map((c) => (
          <div key={c.id} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
            <span className="font-mono text-[10px] text-white/35">{c.id}</span>
            {c.pass ? <Check className="size-3.5" style={{ color: EMERALD }} /> : <div className="size-3.5 rounded-full border border-[#e96d5a] flex items-center justify-center"><div className="size-1.5 rounded-full bg-[#e96d5a]"/></div>}
            <span className="text-[12px] text-[#e7e2d3]/85 flex-1">{c.desc}</span>
            <span className="font-mono text-[10px] text-white/40">42 cases</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 7 — Safeguards ──────────────────────────────────────────────────────
function PlateSafeguards() {
  return (
    <div className="rounded-md border border-[#3d3a39] bg-[#0d0c0a] shadow-[6px_6px_0_rgba(0,0,0,0.4)] overflow-hidden p-5">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/5">
        <Shield className="size-4" style={{ color: OXBLOOD }} />
        <span className="text-xs font-medium text-[#e7e2d3]">Safeguards</span>
        <span className="ml-auto text-[10px] tracking-[0.2em] text-white/30 uppercase font-mono">Admin</span>
      </div>
      <div className="space-y-3">
        <div className="p-3 rounded border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="size-1.5 rounded-full" style={{ background: EMERALD, boxShadow: `0 0 6px ${EMERALD}` }} />
            <span className="text-[11px] font-medium text-[#e7e2d3]">Audit log · live</span>
          </div>
          <div className="text-[10.5px] text-white/50 font-mono leading-relaxed">
            14:32 · <span className="text-[#e7e2d3]">david@mothership</span> activated prompt v12<br/>
            14:08 · <span className="text-[#e7e2d3]">david@mothership</span> updated Marcus tier policy
          </div>
        </div>
        <button className="w-full rounded px-3 py-3 text-xs font-semibold text-white border-2 flex items-center justify-center gap-2" style={{ borderColor: "#e96d5a", background: "rgba(233,109,90,0.08)", color: "#e96d5a" }}>
          <Zap className="size-3.5" />
          EMERGENCY KILL SWITCH
        </button>
        <div className="text-[10px] text-white/40 text-center font-mono tracking-[0.1em] uppercase">
          Admin · confirmed · logged · under one second
        </div>
      </div>
    </div>
  );
}

// ── Steps data ────────────────────────────────────────────────────────────────
const STEPS: TutorialStep[] = [
  {
    id: "install",
    n: 1,
    icon: Terminal,
    title: "Install Mothership on your machine",
    subtitle: "Three commands. Roughly ninety seconds from clone to dashboard.",
    readTime: "2 min",
    ctaLabel: "Open the repository",
    ctaHref: "https://github.com/ClaudevGuy/MotherShip",
    body: (
      <>
        <p>Mothership is self-hosted by design — no signup, no hosted tier, no email wall. You get the repo, the schema, and the SDK. Your keys stay on your machine.</p>
        <p>The only requirements are Node 20 and a Postgres database — a local instance, Neon, or Supabase all work. After <code>npm run dev</code>, the console is live on <code>localhost:3000</code>.</p>
        <p className="text-[11.5px] text-muted-foreground italic">You're already here — which means this step is done. Mark it complete and continue.</p>
      </>
    ),
    plate: <PlateTerminal />,
  },
  {
    id: "create-agent",
    n: 2,
    icon: Sparkles,
    title: "Create your first agent",
    subtitle: "Name it, give it a system prompt, and let auto-routing pick the model.",
    readTime: "3 min",
    ctaLabel: "Open the agent builder",
    ctaHref: "/agents",
    body: (
      <>
        <p>The quick-create takes two things: a name and a system prompt. That's it. Auto-routing will profile the first few runs and select the cheapest tier that still passes your eval threshold — so you don't have to pick between Opus and Haiku yourself.</p>
        <p>Templates are available if you want to start from a known pattern (code reviewer, support classifier, document triager). You can always switch the prompt or the model policy after the first run.</p>
        <p>Cost cap is optional but recommended on first setup — cap per-run tokens or daily spend so a runaway agent can't drain your budget.</p>
      </>
    ),
    plate: <PlateQuickCreate />,
  },
  {
    id: "live-run",
    n: 3,
    icon: Zap,
    title: "Run it — watch the tokens stream",
    subtitle: "Multi-turn by default. Every token, every decision, every cost visible as it happens.",
    readTime: "2 min",
    ctaLabel: "Go to agents",
    ctaHref: "/agents",
    body: (
      <>
        <p>Click <strong>Run</strong> on any agent and the live panel opens. Tokens stream in real time. The tier badge at the top shows which model the routing engine chose, and why — click it to see the reasoning.</p>
        <p>The stats bar at the bottom updates every few tokens: input tokens, output tokens, running cost, and — the interesting one — savings versus a pinned Tier 1 policy. That number accrues run by run.</p>
        <p>Runs are multi-turn. Reply, continue, branch. Every turn is saved to the run record, searchable forever.</p>
      </>
    ),
    plate: <PlateLiveRun />,
  },
  {
    id: "savings",
    n: 4,
    icon: TrendingDown,
    title: "See what auto-routing saved you",
    subtitle: "The cost dashboard shows baseline vs actual, rolled up per agent, per team, per month.",
    readTime: "2 min",
    ctaLabel: "Open Costs",
    ctaHref: "/costs",
    body: (
      <>
        <p>Auto-routing is the flagship feature — every task is profiled on the way in (complexity, expected output size, production-touching) and routed to the lowest tier that still passes your evals. Opus for the work that matters. Haiku for the classification most teams quietly overpay for.</p>
        <p>The dashboard shows two numbers: <strong>baseline</strong> (what a pinned-Opus policy would have cost) and <strong>actual</strong> (what Mothership's routing delivered). The delta is the <em>recovered</em> spend.</p>
        <p>Finance stops asking. Engineering stops defending.</p>
      </>
    ),
    plate: <PlateCostChart />,
  },
  {
    id: "prompt-studio",
    n: 5,
    icon: FileCode,
    title: "Version your prompt like code",
    subtitle: "Save, diff, activate. Each version is immutable and searchable. Roll back in one click.",
    readTime: "3 min",
    ctaLabel: "Open Prompt Studio",
    ctaHref: "/prompts",
    body: (
      <>
        <p>Prompts drift. One good edit leaves six in its wake — and by the time someone asks "what did we change last Tuesday," the context is gone. Prompt Studio treats prompts the way git treats code: every version saved, every version diffable, every version recoverable.</p>
        <p>Activating a version changes what the agent uses on the next run — no deploy. You can link a prompt to one agent or many, and upgrade them all in flight.</p>
        <p>Every activation is audit-logged — who, when, from which version to which.</p>
      </>
    ),
    plate: <PlatePromptStudio />,
  },
  {
    id: "evals",
    n: 6,
    icon: FlaskConical,
    title: "Write your first eval",
    subtitle: "Two scorers, no theatre — deterministic rules plus Claude-as-judge.",
    readTime: "4 min",
    ctaLabel: "Open Evals",
    ctaHref: "/evals",
    body: (
      <>
        <p>Evals are how you catch regressions before your customers do. Mothership supports two kinds of scorers: <strong>deterministic</strong> (string matches, length bounds, schema checks) and <strong>judge-based</strong> (Claude grading tone, completeness, or adherence).</p>
        <p>Write a suite as a set of cases — input, expected behavior, scorer. Each run produces a score per case and a rollup for the suite. Attach a suite to a prompt version and the score shows up on the Prompt Studio timeline next to that version.</p>
        <p>Routing uses eval scores to decide when Haiku can substitute for Opus on a given task. 94% parity on 42 cases? Haiku is allowed.</p>
      </>
    ),
    plate: <PlateEval />,
  },
  {
    id: "safeguards",
    n: 7,
    icon: Shield,
    title: "Turn on the safeguards",
    subtitle: "An audit log that logs everything, and a kill switch that stops everything.",
    readTime: "2 min",
    ctaLabel: "Open Settings",
    ctaHref: "/settings",
    body: (
      <>
        <p>Two settings you should turn on before your first real run. <strong>Audit log</strong> is already on — every create, update, delete is recorded with who, when, and what. Search it in Settings → Audit.</p>
        <p>The <strong>kill switch</strong> is for the moment an agent decides to recurse forever at 3 a.m. or a prompt change drops a zero off a pricing field. One admin-scoped button stops every running agent in under a second. Confirmed. Logged. Quiet.</p>
        <p>That's the tutorial. You've created an agent, watched it stream, seen it save money, versioned its prompt, written an eval, and turned on the safeguards. Open the overview and get to work.</p>
      </>
    ),
    plate: <PlateSafeguards />,
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function TutorialPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setCompleted(new Set(JSON.parse(raw)));
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completed)));
    } catch {
      // ignore storage errors
    }
  }, [completed, hydrated]);

  const step = STEPS[activeIdx];
  const StepIcon = step.icon;
  const percent = Math.round((completed.size / STEPS.length) * 100);
  const isStepDone = completed.has(step.id);
  const isFinal = percent === 100;

  const toggleDone = () => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(step.id)) next.delete(step.id);
      else next.add(step.id);
      return next;
    });
  };

  const markDoneAndAdvance = () => {
    setCompleted((prev) => new Set(prev).add(step.id));
    if (activeIdx < STEPS.length - 1) setActiveIdx(activeIdx + 1);
  };

  return (
    <div className="min-h-screen relative">
      {/* Ambient brand glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[280px]" style={{ background: `radial-gradient(ellipse 60% 100% at 50% 0%, ${OXBLOOD}10, transparent 70%)` }} />

      <div className="relative px-8 py-10 max-w-6xl mx-auto">
        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-3 font-mono text-[10.5px] tracking-[0.24em] uppercase text-muted-foreground">
            <div className="h-px w-8" style={{ background: OXBLOOD }} />
            <span style={{ color: OXBLOOD }}>Tutorial</span>
            <span className="text-muted-foreground/40">·</span>
            <span>From clone to streaming agent in seven steps</span>
          </div>
          <h1 className="font-serif text-[44px] leading-[1.05] tracking-[-0.02em] text-foreground max-w-[20ch]">
            Get your first agent running.
          </h1>
        </div>

        {/* ── Progress bar ──────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-end justify-between mb-3">
            <div className="flex items-baseline gap-4">
              <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-muted-foreground">
                Step {activeIdx + 1} of {STEPS.length}
                {hydrated && (
                  <span className="ml-3 text-muted-foreground/60">· {completed.size} complete</span>
                )}
              </div>
            </div>
            <div
              className="font-serif text-[22px] leading-none tracking-[-0.02em] tabular-nums"
              style={{
                color: percent === 100 ? EMERALD : BRAND,
                fontVariationSettings: '"opsz" 48, "wght" 500',
              }}
              suppressHydrationWarning
            >
              {percent}
              <span className="font-mono text-[11px] ml-0.5 opacity-70">%</span>
            </div>
          </div>
          <div
            className="relative h-[5px] rounded-full overflow-hidden"
            style={{ background: "rgb(var(--ink-rgb) / 0.08)" }}
          >
            <div
              className="relative h-full transition-all duration-700 ease-out rounded-full overflow-hidden"
              style={{
                width: `${percent}%`,
                background:
                  percent === 100
                    ? `linear-gradient(90deg, ${EMERALD}cc 0%, ${EMERALD} 100%)`
                    : `linear-gradient(90deg, ${BRAND}aa 0%, ${BRAND} 100%)`,
                boxShadow: `0 0 10px ${percent === 100 ? EMERALD : BRAND}66, inset 0 1px 0 ${percent === 100 ? EMERALD : BRAND}aa`,
              }}
            >
              {percent > 0 && percent < 100 && (
                <span
                  className="absolute inset-y-0 w-[30%] animate-progress-shimmer"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, ${BRAND}66 50%, transparent 100%)`,
                  }}
                />
              )}
            </div>
          </div>
          {/* Step rail — circles on a continuous track with connector segments */}
          <div className="relative mt-5">
            <div className="flex items-start">
              {STEPS.map((s, i) => {
                const done = hydrated && completed.has(s.id);
                const active = i === activeIdx;
                const isLast = i === STEPS.length - 1;
                const nextDone = hydrated && i < STEPS.length - 1 && completed.has(STEPS[i + 1].id);
                // Segment state: "done" both sides complete, "active" bridge to current, "future" muted
                let segState: "done" | "active" | "future" = "future";
                if (done && nextDone) segState = "done";
                else if (done || (active && i < STEPS.length - 1)) segState = "active";

                return (
                  <React.Fragment key={s.id}>
                    {/* Step node — circle + label */}
                    <button
                      onClick={() => setActiveIdx(i)}
                      className={cn(
                        "group flex flex-col items-center gap-2.5 transition-opacity shrink-0",
                        active ? "opacity-100" : done ? "opacity-95" : "opacity-65 hover:opacity-90"
                      )}
                      style={{ width: 92 }}
                    >
                      <div className="relative">
                        {/* Pulsing halo behind the active step circle */}
                        {active && (
                          <span
                            className="absolute inset-0 rounded-full animate-ping"
                            style={{ background: `${BRAND}20`, animationDuration: "2.2s" }}
                          />
                        )}
                        <div
                          className={cn(
                            "relative size-8 rounded-full border flex items-center justify-center transition-all",
                            active && "scale-110"
                          )}
                          style={{
                            borderColor: done
                              ? EMERALD
                              : active
                              ? BRAND
                              : "rgb(var(--ink-rgb) / 0.18)",
                            borderWidth: done || active ? 2 : 1,
                            background: done
                              ? `${EMERALD}18`
                              : active
                              ? `${BRAND}14`
                              : "rgb(var(--ink-rgb) / 0.015)",
                            boxShadow: active
                              ? `0 0 0 4px ${BRAND}08, 0 2px 10px ${BRAND}20`
                              : done
                              ? `0 0 10px ${EMERALD}30`
                              : "none",
                          }}
                        >
                          {done ? (
                            <Check className="size-3.5" style={{ color: EMERALD }} strokeWidth={2.5} />
                          ) : (
                            <span
                              className="font-mono text-[11px] font-bold"
                              style={{
                                color: active ? BRAND : "rgb(var(--ink-rgb) / 0.5)",
                              }}
                            >
                              {s.n}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "font-mono text-[9px] tracking-[0.16em] uppercase text-center leading-[1.3] max-w-[82px] min-h-[2.1em] flex items-start justify-center",
                          active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground/55"
                        )}
                      >
                        {s.id.replace("-", " ")}
                      </span>
                    </button>

                    {/* Connector segment between this step and the next */}
                    {!isLast && (
                      <div className="relative flex-1 flex items-center self-start mt-4">
                        {/* Baseline rail — always present, subtle */}
                        <div className="h-px w-full" style={{ background: "rgb(var(--ink-rgb) / 0.12)" }} />

                        {/* Progress overlay */}
                        <div
                          className="absolute inset-0 flex items-center transition-opacity duration-500"
                          style={{ opacity: segState === "future" ? 0 : 1 }}
                        >
                          <div
                            className={cn(
                              "h-px w-full transition-all duration-700",
                              segState === "active" && "animate-segment-shimmer"
                            )}
                            style={{
                              background:
                                segState === "done"
                                  ? EMERALD
                                  : segState === "active"
                                  ? done
                                    ? `linear-gradient(90deg, ${EMERALD}dd 0%, ${EMERALD}55 55%, ${BRAND}30 100%)`
                                    : `linear-gradient(90deg, ${BRAND}cc 0%, ${BRAND}30 60%, transparent 100%)`
                                  : "transparent",
                              boxShadow:
                                segState === "done"
                                  ? `0 0 6px ${EMERALD}66, 0 0 12px ${EMERALD}30`
                                  : segState === "active"
                                  ? done
                                    ? `0 0 8px ${EMERALD}55, 0 0 14px ${EMERALD}22`
                                    : `0 0 6px ${BRAND}40`
                                  : "none",
                            }}
                          />
                        </div>

                        {/* Center arrow glyph — serif italic */}
                        <span
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-heading italic pointer-events-none transition-colors"
                          style={{
                            fontSize: 16,
                            fontVariationSettings: '"opsz" 24, "SOFT" 100, "wght" 420',
                            color:
                              segState === "done"
                                ? EMERALD
                                : segState === "active"
                                ? done
                                  ? EMERALD
                                  : BRAND
                                : "rgb(var(--ink-rgb) / 0.38)",
                            textShadow:
                              segState === "done" || (segState === "active" && done)
                                ? `0 0 8px ${EMERALD}88, 0 0 14px ${EMERALD}44`
                                : segState === "active"
                                ? `0 0 8px ${BRAND}44`
                                : "none",
                            letterSpacing: "-0.02em",
                            background: "var(--background)",
                            padding: "0 6px",
                          }}
                        >
                          →
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Active step body ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 mb-8 pt-6 border-t border-border/60">
          {/* Left: text */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="size-11 rounded-lg border grid place-items-center"
                style={{ borderColor: `${OXBLOOD}35`, background: `${OXBLOOD}10` }}
              >
                <StepIcon className="size-5" style={{ color: OXBLOOD }} />
              </div>
              <div>
                <div className="font-mono text-[10px] tracking-[0.22em] uppercase" style={{ color: OXBLOOD }}>
                  Step {step.n} · {step.readTime}
                </div>
              </div>
            </div>
            <h2 className="font-serif text-[30px] leading-[1.12] tracking-[-0.018em] text-foreground mb-3 max-w-[22ch]">
              {step.title}
            </h2>
            <p className="font-serif italic text-[16px] leading-[1.5] text-muted-foreground mb-6 max-w-[46ch]">
              {step.subtitle}
            </p>
            <div className="prose prose-invert max-w-none text-[14px] leading-[1.65] text-[#c7c3c0] space-y-3.5 [&_strong]:text-foreground [&_strong]:font-medium [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-[#d8442e]/10 [&_code]:text-[#d8442e]">
              {step.body}
            </div>

            {/* Action + done checkbox */}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              {step.ctaHref.startsWith("http") ? (
                <a
                  href={step.ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold transition-transform hover:-translate-y-px"
                  style={{ background: BRAND, color: "var(--primary-foreground)", boxShadow: `0 2px 10px ${BRAND}22` }}
                >
                  {step.ctaLabel} <ArrowRight className="size-3.5" />
                </a>
              ) : (
                <Link
                  href={step.ctaHref}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold transition-transform hover:-translate-y-px"
                  style={{ background: BRAND, color: "var(--primary-foreground)", boxShadow: `0 2px 10px ${BRAND}22` }}
                >
                  {step.ctaLabel} <ArrowRight className="size-3.5" />
                </Link>
              )}

              <button
                onClick={toggleDone}
                className="inline-flex items-center gap-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {isStepDone ? (
                  <CheckCircle2 className="size-5" style={{ color: EMERALD }} />
                ) : (
                  <Circle className="size-5 text-muted-foreground/40" />
                )}
                <span>{isStepDone ? "Completed" : "Mark as complete"}</span>
              </button>
            </div>
          </div>

          {/* Right: plate mockup */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-serif italic text-[14px]" style={{ color: OXBLOOD }}>
                Plate {["I","II","III","IV","V","VI","VII"][activeIdx]}.
              </span>
              <span className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-muted-foreground/50">
                Preview · {step.id}
              </span>
            </div>
            <div>{step.plate}</div>
          </div>
        </div>

        {/* ── Footer navigation ───────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-border/60">
          <button
            onClick={() => setActiveIdx(Math.max(0, activeIdx - 1))}
            disabled={activeIdx === 0}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="size-4" />
            Previous step
          </button>

          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground/50">
            {step.id.replace("-", " · ")}
          </div>

          {activeIdx < STEPS.length - 1 ? (
            <button
              onClick={markDoneAndAdvance}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold text-foreground border border-border hover:border-[#d8442e]/60 hover:bg-[#d8442e]/5 transition-colors"
            >
              Next step
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              onClick={toggleDone}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold"
              style={{ background: isStepDone ? EMERALD : BRAND, color: "var(--primary-foreground)" }}
            >
              {isStepDone ? "Tutorial complete ✓" : "Finish tutorial"}
            </button>
          )}
        </div>

        {/* ── Completion banner ───────────────────────────────────── */}
        {hydrated && isFinal && (
          <div
            className="mt-10 rounded-lg border p-5 flex items-start gap-4"
            style={{ borderColor: `${EMERALD}40`, background: `${EMERALD}08` }}
          >
            <CheckCircle2 className="size-5 shrink-0 mt-0.5" style={{ color: EMERALD }} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                All seven steps complete. Mothership is yours to run.
              </p>
              <p className="text-[13px] text-muted-foreground mt-1">
                The overview is where you'll live now. Your first agent is streaming, your prompt is versioned, and the kill switch is one click away. Open the console and get to work.
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  href="/overview"
                  className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                  style={{ color: EMERALD }}
                >
                  Go to overview <ArrowRight className="size-3" />
                </Link>
                <button
                  onClick={() => { setCompleted(new Set()); setActiveIdx(0); }}
                  className="ml-4 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Reset progress
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
