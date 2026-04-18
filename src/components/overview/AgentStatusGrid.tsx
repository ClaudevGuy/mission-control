"use client";

import React from "react";
import Link from "next/link";
import { GlassPanel, StatusBadge } from "@/components/shared";
import { useAgentsStore } from "@/stores/agents-store";
import { formatRelativeTime, formatTokens } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Bot, Play, TestTube, ArrowRight, Check, Lock } from "lucide-react";

type StepState = "active" | "done" | "locked";

interface StepDef {
  num: number;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  href?: string;
  state: StepState;
  accent: string;
  accentRgb: string;
  cta: string;        // label for the footer action
  lockedReason?: string;
}

export function AgentStatusGrid() {
  const agents = useAgentsStore((s) => s.agents);

  // Real completion signals. `tasksCompleted` is the aggregate counter stored
  // on the Agent row; `runs` is the optionally-hydrated array. Checking both
  // so we count a run regardless of which representation is loaded.
  const hasAgent = agents.length > 0;
  const hasRun = agents.some(
    (a) => (a.tasksCompleted ?? 0) > 0 || (a.runs?.length ?? 0) > 0
  );
  const hasEval = agents.some((a) => (a.evalResults?.length ?? 0) > 0);
  const allDone = hasAgent && hasRun && hasEval;

  // Once all three onboarding milestones are reached, the getting-started
  // scaffolding graduates into the regular agents list. Before then, we
  // render the step cards so the user can see what comes next — even while
  // they've completed step 1 but haven't yet run anything.
  if (!allDone) {
    // Step 2's destination: the first agent's overview page. Its Overview tab
    // already has a "No runs yet → Run agent" empty-state that jumps into the
    // Execution panel — so one click from here lands the user exactly where
    // they need to be.
    const firstAgent = agents[0];
    const runHref = firstAgent ? `/agents/${firstAgent.id}` : undefined;

    const steps: StepDef[] = [
      {
        num: 1,
        label: "Create an Agent",
        desc: "Name it, paste a prompt, go.",
        icon: Bot,
        href: "/agents/builder",
        state: hasAgent ? "done" : "active",
        accent: "var(--primary)",
        accentRgb: "var(--brand-rgb)",
        cta: hasAgent ? "Revisit" : "Start here",
      },
      {
        num: 2,
        label: "Run it",
        desc: "Real-time streaming with cost tracking.",
        icon: Play,
        href: runHref,
        state: !hasAgent ? "locked" : hasRun ? "done" : "active",
        accent: "#A855F7",
        accentRgb: "168 85 247",
        cta: hasRun ? "Revisit" : hasAgent ? "Run now" : "Locked",
        lockedReason: "Create an agent first",
      },
      {
        num: 3,
        label: "Evaluate it",
        desc: "Automated test suites with an AI judge.",
        icon: TestTube,
        href: "/evals",
        state: !hasRun ? "locked" : hasEval ? "done" : "active",
        accent: "#00d992",
        accentRgb: "0 217 146",
        cta: hasEval ? "Revisit" : hasRun ? "Evaluate" : "Locked",
        lockedReason: hasAgent ? "Run an agent first" : "Create and run an agent first",
      },
    ];

    const activeIndex = steps.findIndex((s) => s.state === "active");

    return (
      <section>
        {/* Section eyebrow with hairlines */}
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-muted-foreground/60">
            Agents · Getting Started
          </span>
          <span className="h-px flex-1" style={{ background: "rgb(var(--ink-rgb) / 0.08)" }} />
          <span className="font-serif italic text-[11px] text-muted-foreground/50">
            {steps.filter((s) => s.state === "done").length} of 3 complete
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <StepCard key={s.num} step={s} isNext={i === activeIndex} />
          ))}
        </div>
      </section>
    );
  }

  // All three steps complete → show the real agents grid (unchanged).
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Agents</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {agents.map((agent) => (
          <Link key={agent.id} href={`/agents/${agent.id}`}>
            <GlassPanel
              hover
              padding="md"
              glow={agent.status === "running" ? "green" : agent.status === "error" ? "crimson" : undefined}
              className="h-full cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground truncate pr-2">{agent.name}</h4>
                <StatusBadge status={agent.status} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{agent.model}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tokens</span>
                  <span className="font-mono text-foreground">{formatTokens(agent.tokenUsage)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Health</span>
                  <span className="font-mono text-foreground">{agent.healthScore}%</span>
                </div>
                <Progress value={agent.healthScore} className="h-1" />
                <div className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                  Last run {formatRelativeTime(agent.lastRun)}
                </div>
              </div>
            </GlassPanel>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders a single onboarding card in one of three states:
 *  - active  → full-accent "current next step" treatment, clickable Link
 *  - done    → checkmark, dimmed accent, still clickable so user can revisit
 *  - locked  → lock icon, neutral muted palette, not clickable, cursor-not-allowed
 *
 * `isNext` flags the single step that should receive the "primary" visual
 * emphasis (accent glow + strong border). At most one step is `isNext` at
 * any time — it's the next actionable step for the user.
 */
function StepCard({ step, isNext }: { step: StepDef; isNext: boolean }) {
  const { num, label, desc, icon: Icon, href, state, accent, accentRgb, cta, lockedReason } = step;
  const isDone = state === "done";
  const isLocked = state === "locked";

  // Locked cards render as a plain <div> — no navigation, no hover lift.
  // Active and done cards stay as <Link>s; users can revisit completed steps
  // for reference, and the active step is the primary CTA on this view.
  const clickable = !isLocked && !!href;

  const content = (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-2xl border px-5 pt-5 pb-5 transition-all duration-300 ${
        clickable ? "cursor-pointer hover:-translate-y-0.5" : isLocked ? "cursor-not-allowed" : ""
      }`}
      style={{
        background: isLocked
          ? "rgb(var(--ink-rgb) / 0.02)"
          : isNext
          ? `linear-gradient(180deg, rgb(${accentRgb} / 0.05) 0%, rgb(${accentRgb} / 0.01) 100%)`
          : `linear-gradient(180deg, rgb(${accentRgb} / 0.025) 0%, rgb(var(--ink-rgb) / 0.005) 100%)`,
        borderColor: isLocked
          ? "rgb(var(--ink-rgb) / 0.08)"
          : isNext
          ? `rgb(${accentRgb} / 0.24)`
          : `rgb(${accentRgb} / 0.12)`,
        boxShadow: isLocked
          ? "none"
          : isNext
          ? `0 0 0 1px rgb(${accentRgb} / 0.08) inset, 0 8px 28px rgb(${accentRgb} / 0.06)`
          : "0 1px 0 rgb(var(--ink-rgb) / 0.04) inset",
        opacity: isLocked ? 0.55 : 1,
      }}
    >
      {/* Top accent hairline — hidden when locked */}
      {!isLocked && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 top-0 h-px transition-opacity duration-300 group-hover:opacity-100"
          style={{
            opacity: isNext ? 0.9 : 0.4,
            background: `linear-gradient(90deg, transparent 0%, rgb(${accentRgb} / ${isNext ? 1 : 0.7}) 50%, transparent 100%)`,
          }}
        />
      )}

      {/* Soft radial ambient — hidden when locked */}
      {!isLocked && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: isNext ? 0.7 : 0.4,
            background: `radial-gradient(ellipse 60% 80% at 0% 0%, rgb(${accentRgb} / ${isNext ? 0.07 : 0.04}) 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Header row: icon + step number / state chip */}
      <div className="relative flex items-start justify-between mb-8">
        <div
          className={`flex size-10 items-center justify-center rounded-xl transition-transform duration-300 ${
            clickable ? "group-hover:scale-[1.06] group-hover:-rotate-2" : ""
          }`}
          style={{
            background: isLocked
              ? "rgb(var(--ink-rgb) / 0.05)"
              : `rgb(${accentRgb} / ${isNext ? 0.14 : 0.08})`,
            border: isLocked
              ? "1px solid rgb(var(--ink-rgb) / 0.1)"
              : `1px solid rgb(${accentRgb} / ${isNext ? 0.3 : 0.2})`,
            boxShadow: isLocked
              ? "none"
              : isNext
              ? `0 0 12px rgb(${accentRgb} / 0.2), inset 0 0 0 1px rgb(${accentRgb} / 0.08)`
              : `inset 0 0 0 1px rgb(${accentRgb} / 0.05)`,
          }}
        >
          {isLocked ? (
            <Lock className="size-[16px] text-muted-foreground/60" aria-hidden="true" />
          ) : isDone ? (
            <Check className="size-[18px]" style={{ color: accent }} aria-hidden="true" />
          ) : (
            <Icon className="size-[18px]" style={{ color: accent }} />
          )}
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-[9.5px] tracking-[0.28em] uppercase text-muted-foreground/55">
            {isLocked ? "Locked" : isDone ? "Complete" : "Step"}
          </span>
          <span
            className="font-serif text-[26px] leading-none tracking-[-0.02em]"
            style={{
              color: isLocked
                ? "rgb(var(--ink-rgb) / 0.35)"
                : isNext
                ? accent
                : `rgb(${accentRgb} / ${isDone ? 0.75 : 0.55})`,
              fontVariationSettings: '"opsz" 144, "SOFT" 30, "wght" 360',
            }}
          >
            {num.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex flex-1 flex-col">
        <h3
          className="font-serif text-[22px] leading-[1.12] tracking-[-0.02em] text-foreground mb-1.5"
          style={{ fontVariationSettings: '"opsz" 48, "SOFT" 50, "wght" 500' }}
        >
          {label}
        </h3>
        <p className="font-serif italic text-[13px] leading-[1.45] text-muted-foreground/80 max-w-[28ch]">
          {isLocked && lockedReason ? lockedReason : desc}
        </p>

        {/* Footer action — varies by state */}
        <div className="mt-auto flex items-center justify-between pt-6">
          {isLocked ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45">
              <Lock className="size-3" aria-hidden="true" />
              {cta}
            </span>
          ) : isDone ? (
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase transition-transform duration-300 group-hover:translate-x-1"
              style={{ color: `rgb(${accentRgb} / 0.75)` }}
            >
              <Check className="size-3" aria-hidden="true" />
              {cta}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase transition-transform duration-300 group-hover:translate-x-1"
              style={{ color: accent }}
            >
              {cta}
              <ArrowRight className="size-3" />
            </span>
          )}
          <span
            className="font-heading italic text-[11px] transition-opacity duration-300 group-hover:opacity-80"
            style={{
              color: isLocked
                ? "rgb(var(--ink-rgb) / 0.15)"
                : `rgb(${accentRgb} / ${isDone ? 0.25 : 0.35})`,
            }}
            aria-hidden
          >
            ❦
          </span>
        </div>
      </div>
    </article>
  );

  if (!clickable) {
    return (
      <div
        className="group block h-full"
        title={isLocked ? lockedReason : undefined}
        aria-disabled={isLocked}
      >
        {content}
      </div>
    );
  }

  return (
    <Link href={href!} className="group block h-full">
      {content}
    </Link>
  );
}
