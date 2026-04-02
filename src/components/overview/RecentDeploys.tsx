"use client";

import React from "react";
import { GlassPanel, StatusBadge } from "@/components/shared";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { formatRelativeTime } from "@/lib/format";
import { Bot, User, Rocket } from "lucide-react";

export function RecentDeploys() {
  const deployments = useDeploymentsStore((s) => s.deployments);
  const recent = deployments.slice(0, 5);

  return (
    <GlassPanel padding="lg" className="h-full">
      <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Recent Deploys</h3>
      <div className="space-y-2">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Rocket className="size-8 text-muted-foreground/15" />
            <p className="text-xs text-muted-foreground/50">No deployments yet</p>
            <p className="text-[10px] text-muted-foreground/30">Deployments will appear here</p>
          </div>
        ) : (
          recent.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-center size-7 rounded-md bg-muted/40">
                {d.isAgent ? <Bot className="size-3.5 text-cyan-400" /> : <User className="size-3.5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{d.service}</span>
                  <span className="text-xs font-mono text-muted-foreground">{d.version}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{d.environment}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={d.status} size="sm" />
                <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>{formatRelativeTime(d.timestamp)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
}
