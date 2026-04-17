"use client";

import React, { useState, useEffect } from "react";
import { GlassPanel } from "@/components/shared";
import { Activity, AlertTriangle, Settings } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

interface ActivityEntry {
  id: string;
  timestamp: string;
  level: string;
  service: string;
  message: string;
  agentId?: string;
}

const LEVEL_ICONS: Record<string, typeof Activity> = {
  info: Activity,
  warn: AlertTriangle,
  error: AlertTriangle,
  debug: Settings,
};

const LEVEL_COLORS: Record<string, string> = {
  info: "var(--primary)",
  warn: "#F59E0B",
  error: "#EF4444",
  debug: "#888",
};

export function ActivityFeed() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs?limit=15")
      .then((r) => r.json())
      .then((d) => setEntries(d.data?.entries || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <GlassPanel padding="lg" className="h-full">
      <h3 className="font-heading text-sm font-semibold text-foreground mb-3">Activity Feed</h3>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-2.5 animate-pulse">
              <div className="size-6 rounded-md bg-muted/40 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-muted/30" />
                <div className="h-2.5 w-1/3 rounded bg-muted/20" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Activity className="size-8 text-muted-foreground/15" />
          <p className="text-xs text-muted-foreground/50">No activity yet</p>
          <p className="text-[10px] text-muted-foreground/30 max-w-[180px]">
            Agent activity, deploys, and alerts will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => {
            const Icon = LEVEL_ICONS[entry.level] || Activity;
            const color = LEVEL_COLORS[entry.level] || "#888";
            return (
              <div key={entry.id} className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/20 transition-colors">
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-md mt-0.5"
                  style={{ background: `${color}15` }}
                >
                  <Icon className="size-3" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/80 truncate">{entry.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/50 font-mono">{entry.service}</span>
                    <span className="text-[10px] text-muted-foreground/30" suppressHydrationWarning>
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );
}
