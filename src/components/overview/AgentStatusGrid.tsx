"use client";

import React from "react";
import Link from "next/link";
import { GlassPanel, StatusBadge } from "@/components/shared";
import { useAgentsStore } from "@/stores/agents-store";
import { formatRelativeTime, formatTokens } from "@/lib/format";
import { Progress } from "@/components/ui/progress";
import { Bot, Rocket } from "lucide-react";

export function AgentStatusGrid() {
  const agents = useAgentsStore((s) => s.agents);

  // Empty state
  if (agents.length === 0) {
    return (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Agents</p>
        <div className="flex flex-col items-center gap-3 py-12 text-center rounded-xl border border-border bg-card/50">
          <div className="flex items-center justify-center size-12 rounded-xl bg-muted/30">
            <Bot className="size-6 text-muted-foreground/25" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">No agents deployed yet</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5">Deploy your first AI agent to see it here</p>
          </div>
          <Link
            href="/agents/builder"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00D4FF] px-4 py-2 text-xs font-medium text-black hover:bg-[#00D4FF]/90 transition-colors mt-1"
          >
            <Rocket className="size-3.5" />
            Deploy your first agent
          </Link>
        </div>
      </div>
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
