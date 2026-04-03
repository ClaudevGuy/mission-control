"use client";

import React, { useState, useEffect } from "react";
import { GlassPanel, StatusBadge } from "@/components/shared";
import { Globe, Zap, ExternalLink } from "lucide-react";
import { formatRelativeTime, formatCurrency } from "@/lib/format";
import Link from "next/link";

interface ExternalAgent {
  id: string;
  externalId: string;
  source: string;
  name: string;
  model: string | null;
  status: string;
  totalRuns: number;
  totalCost: number;
  totalTokens: number;
  errorCount: number;
  lastEventAt: string | null;
  recentEvents24h: number;
}

const SOURCE_COLORS: Record<string, string> = {
  paperclip: "#F59E0B",
  crewai: "#A855F7",
  langgraph: "#00d992",
  autogen: "#60A5FA",
  custom: "#8b949e",
};

export function ExternalAgentsWidget() {
  const [agents, setAgents] = useState<ExternalAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents/external")
      .then((r) => r.json())
      .then((d) => setAgents(d.data?.agents || []))
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (agents.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Globe className="size-3" /> External Agents
        </p>
        <Link href="/agents?tab=external" className="text-[10px] text-[#00d992] hover:underline flex items-center gap-1">
          View all <ExternalLink className="size-2.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {agents.slice(0, 8).map((agent) => {
          const sourceColor = SOURCE_COLORS[agent.source] || "#8b949e";
          const statusMap: Record<string, string> = { idle: "idle", running: "running", error: "error", completed: "success" };
          return (
            <GlassPanel key={agent.id} padding="md" hover className="cursor-default">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ background: `${sourceColor}15`, color: sourceColor, border: `1px solid ${sourceColor}30` }}>
                    {agent.source}
                  </span>
                  <h4 className="text-xs font-medium text-foreground truncate">{agent.name}</h4>
                </div>
                <StatusBadge status={(statusMap[agent.status] || "idle") as "idle" | "running" | "error" | "success"} size="sm" />
              </div>
              {agent.model && (
                <p className="text-[10px] text-muted-foreground mb-1.5">{agent.model}</p>
              )}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="font-mono">{agent.totalRuns} runs</span>
                {agent.totalCost > 0 && <span className="font-mono">{formatCurrency(agent.totalCost)}</span>}
                {agent.recentEvents24h > 0 && (
                  <span className="flex items-center gap-0.5 text-[#00d992]">
                    <Zap className="size-2.5" /> {agent.recentEvents24h} today
                  </span>
                )}
              </div>
              {agent.lastEventAt && (
                <p className="text-[9px] text-muted-foreground/50 mt-1" suppressHydrationWarning>
                  Last event {formatRelativeTime(agent.lastEventAt)}
                </p>
              )}
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
