"use client";

import React from "react";
import Link from "next/link";
import { GlassPanel, StatusBadge } from "@/components/shared";
import { useAgentsStore } from "@/stores/agents-store";
import { formatRelativeTime, formatTokens } from "@/lib/format";
import { Progress } from "@/components/ui/progress";

export function AgentStatusGrid() {
  const agents = useAgentsStore((s) => s.agents);

  return (
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
  );
}
