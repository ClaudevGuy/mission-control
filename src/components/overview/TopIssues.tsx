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
  const incidents = useIncidentsStore((s) => s.incidents).filter(
    (i) => i.status !== "resolved"
  );

  const hasIncidents = incidents.length > 0;

  return (
    <GlassPanel padding="lg" className="relative h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-heading text-sm font-semibold text-foreground">
            Top Issues
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {hasIncidents
              ? `${incidents.length} open ${incidents.length === 1 ? "incident" : "incidents"}`
              : "All systems operational"}
          </p>
        </div>

        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono font-medium ${
            hasIncidents
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              hasIncidents ? "bg-red-400" : "bg-emerald-400 animate-pulse"
            }`}
          />
          {hasIncidents ? "ACTIVE" : "HEALTHY"}
        </div>
      </div>

      <div className="space-y-2">
        {!hasIncidents ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-center">
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl" />
              <div className="relative flex size-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <ShieldCheck className="size-6 text-emerald-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">No open incidents</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Everything is running smoothly
            </p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-muted/30 transition-colors"
            >
              <Badge variant="outline" className={severityColors[incident.severity]}>
                {incident.severity}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {incident.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={incident.status} size="sm" />
                  <span className="text-[10px] text-muted-foreground">
                    {incident.assignee?.name ?? "Unassigned"}
                  </span>
                </div>
              </div>
              <span
                className="text-[10px] text-muted-foreground shrink-0"
                suppressHydrationWarning
              >
                {formatRelativeTime(incident.createdAt)}
              </span>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
}
