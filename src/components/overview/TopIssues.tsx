"use client";

import React from "react";
import { GlassPanel, StatusBadge } from "@/components/shared";
import { useIncidentsStore } from "@/stores/incidents-store";
import { formatRelativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

const severityColors: Record<string, string> = {
  P1: "bg-red-500/20 text-red-400 border-red-500/30",
  P2: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  P3: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function TopIssues() {
  const incidents = useIncidentsStore((s) => s.incidents).filter((i) => i.status !== "resolved");

  return (
    <GlassPanel padding="lg" className="h-full">
      <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Top Issues</h3>
      <div className="space-y-2">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ShieldCheck className="size-8 text-green-400/20" />
            <p className="text-xs text-muted-foreground/50">No open incidents</p>
            <p className="text-[10px] text-muted-foreground/30">All systems operational</p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div key={incident.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/30 transition-colors">
              <Badge variant="outline" className={severityColors[incident.severity]}>
                {incident.severity}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{incident.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={incident.status} size="sm" />
                  <span className="text-[10px] text-muted-foreground">{incident.assignee?.name ?? "Unassigned"}</span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0" suppressHydrationWarning>{formatRelativeTime(incident.createdAt)}</span>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
}
