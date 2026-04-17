"use client";

import React from "react";
import Link from "next/link";
import { GlassPanel, StatusBadge } from "@/components/shared";
import { useAgentsStore } from "@/stores/agents-store";
import { formatRelativeTime, formatTokens } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Bot, Play, TestTube, ArrowRight } from "lucide-react";

export function AgentStatusGrid() {
  const agents = useAgentsStore((s) => s.agents);

  // Empty state — editorial onboarding sequence
  if (agents.length === 0) {
    const steps = [
      {
        num: 1,
        label: "Create an Agent",
        desc: "Name it, paste a prompt, go.",
        icon: Bot,
        href: "/agents",
        cta: "Start here",
        accent: "var(--primary)",
        accentRgb: "var(--brand-rgb)",
      },
      {
        num: 2,
        label: "Run it",
        desc: "Real-time streaming with cost tracking.",
        icon: Play,
        href: "/agents",
        accent: "#A855F7",
        accentRgb: "168 85 247",
      },
      {
        num: 3,
        label: "Evaluate it",
        desc: "Automated test suites with an AI judge.",
        icon: TestTube,
        href: "/evals",
        accent: "#00d992",
        accentRgb: "0 217 146",
      },
    ];

    return (
      <section>
        {/* Section eyebrow with hairlines */}
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-muted-foreground/60">
            Agents · Getting Started
          </span>
          <span className="h-px flex-1" style={{ background: "rgb(var(--ink-rgb) / 0.08)" }} />
          <span className="font-serif italic text-[11px] text-muted-foreground/50">three steps</span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {steps.map((s, i) => {
            const isPrimary = i === 0;
            return (
              <Link key={s.num} href={s.href} className="group block h-full">
                <article
                  className="relative flex h-full flex-col overflow-hidden rounded-2xl border px-5 pt-5 pb-5 transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                  style={{
                    background: isPrimary
                      ? `linear-gradient(180deg, rgb(${s.accentRgb} / 0.05) 0%, rgb(${s.accentRgb} / 0.01) 100%)`
                      : `linear-gradient(180deg, rgb(${s.accentRgb} / 0.025) 0%, rgb(var(--ink-rgb) / 0.005) 100%)`,
                    borderColor: isPrimary
                      ? `rgb(${s.accentRgb} / 0.24)`
                      : `rgb(${s.accentRgb} / 0.12)`,
                    boxShadow: isPrimary
                      ? `0 0 0 1px rgb(${s.accentRgb} / 0.08) inset, 0 8px 28px rgb(${s.accentRgb} / 0.06)`
                      : "0 1px 0 rgb(var(--ink-rgb) / 0.04) inset",
                  }}
                >
                  {/* Top accent hairline */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-5 top-0 h-px transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      opacity: isPrimary ? 0.9 : 0.4,
                      background: `linear-gradient(90deg, transparent 0%, rgb(${s.accentRgb} / ${isPrimary ? 1 : 0.7}) 50%, transparent 100%)`,
                    }}
                  />

                  {/* Soft radial ambient */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 transition-opacity duration-500"
                    style={{
                      opacity: isPrimary ? 0.7 : 0.4,
                      background: `radial-gradient(ellipse 60% 80% at 0% 0%, rgb(${s.accentRgb} / ${isPrimary ? 0.07 : 0.04}) 0%, transparent 60%)`,
                    }}
                  />

                  {/* Header row: icon + numbered chip */}
                  <div className="relative flex items-start justify-between mb-8">
                    <div
                      className="flex size-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-[1.06] group-hover:-rotate-2"
                      style={{
                        background: `rgb(${s.accentRgb} / ${isPrimary ? 0.14 : 0.08})`,
                        border: `1px solid rgb(${s.accentRgb} / ${isPrimary ? 0.3 : 0.2})`,
                        boxShadow: isPrimary
                          ? `0 0 12px rgb(${s.accentRgb} / 0.2), inset 0 0 0 1px rgb(${s.accentRgb} / 0.08)`
                          : `inset 0 0 0 1px rgb(${s.accentRgb} / 0.05)`,
                      }}
                    >
                      <s.icon className="size-[18px]" style={{ color: s.accent }} />
                    </div>

                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-mono text-[9.5px] tracking-[0.28em] uppercase text-muted-foreground/55">
                        Step
                      </span>
                      <span
                        className="font-serif text-[26px] leading-none tracking-[-0.02em]"
                        style={{
                          color: isPrimary ? s.accent : `rgb(${s.accentRgb} / 0.55)`,
                          fontVariationSettings: '"opsz" 144, "SOFT" 30, "wght" 360',
                        }}
                      >
                        {s.num.toString().padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Body — flex-1 so footer row sticks to bottom across all cards */}
                  <div className="relative flex flex-1 flex-col">
                    <h3
                      className="font-serif text-[22px] leading-[1.12] tracking-[-0.02em] text-foreground mb-1.5"
                      style={{ fontVariationSettings: '"opsz" 48, "SOFT" 50, "wght" 500' }}
                    >
                      {s.label}
                    </h3>
                    <p className="font-serif italic text-[13px] leading-[1.45] text-muted-foreground/80 max-w-[28ch]">
                      {s.desc}
                    </p>

                    {/* Footer pinned to bottom via mt-auto + consistent top padding */}
                    <div className="mt-auto flex items-center justify-between pt-6">
                      {s.cta ? (
                        <span
                          className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.22em] uppercase transition-transform duration-300 group-hover:translate-x-1"
                          style={{ color: s.accent }}
                        >
                          {s.cta}
                          <ArrowRight className="size-3" />
                        </span>
                      ) : (
                        <span
                          className="font-mono text-[10px] tracking-[0.22em] uppercase transition-opacity duration-300 group-hover:opacity-90"
                          style={{ color: `rgb(${s.accentRgb} / 0.55)` }}
                        >
                          After step {s.num - 1}
                        </span>
                      )}
                      <span
                        className="font-heading italic text-[11px] transition-opacity duration-300 group-hover:opacity-80"
                        style={{ color: `rgb(${s.accentRgb} / 0.35)` }}
                        aria-hidden
                      >
                        ❦
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

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
