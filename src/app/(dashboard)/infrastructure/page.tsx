"use client";

import React, { useEffect } from "react";
import { useInfrastructureStore } from "@/stores/infrastructure-store";
import {
  PageHeader,
  GlassPanel,
  GaugeWidget,
  DataTable,
  StatusBadge,
  SparklineChart,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Globe, Cpu, Wifi, MemoryStick, ArrowUp, ArrowDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceNode } from "@/types/infrastructure";

const typeIcons: Record<string, React.ReactNode> = {
  api: <Globe className="size-4 text-cyan-400" />,
  worker: <Cpu className="size-4 text-purple-400" />,
  database: <Database className="size-4 text-amber-400" />,
  cache: <MemoryStick className="size-4 text-green-400" />,
  queue: <Server className="size-4 text-orange-400" />,
  cdn: <Wifi className="size-4 text-blue-400" />,
};

const gaugeColors = ["var(--primary)", "#A855F7", "#F59E0B", "#22C55E"];
const gaugeDetails: { actual: string; spark: number[] }[] = [];

const AUTOSCALE_EVENTS: { service: string; direction: "up" | "down"; from: number; to: number; reason: string; ago: string }[] = [];

function getServiceStatus(svc: ServiceNode): "healthy" | "degraded" | "down" {
  if (svc.status === "down") return "down";
  if (svc.status === "degraded" || svc.latency > 200) return "degraded";
  if (svc.latency > 100) return "degraded";
  return "healthy";
}

const statusColors: Record<string, string> = { healthy: "#39FF14", degraded: "#F59E0B", down: "#EF4444" };

export default function InfrastructurePage() {
  const { resources, services, endpoints, queues, fetch: fetchInfra } = useInfrastructureStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchInfra(); }, []);

  const endpointColumns = [
    { key: "path", label: "Path", sortable: true, render: (r: Record<string, unknown>) => <span className="font-mono text-xs text-foreground">{r.path as string}</span> },
    { key: "method", label: "Method", render: (r: Record<string, unknown>) => <Badge variant="outline" className="font-mono text-[10px]">{r.method as string}</Badge> },
    { key: "p50", label: "P50", sortable: true, render: (r: Record<string, unknown>) => <span className={cn("font-mono text-xs", (r.p50 as number) > 500 ? "text-red-400" : (r.p50 as number) > 100 ? "text-amber-400" : "text-muted-foreground")}>{r.p50 as number}ms</span> },
    { key: "p95", label: "P95", sortable: true, render: (r: Record<string, unknown>) => <span className={cn("font-mono text-xs", (r.p95 as number) > 500 ? "text-red-400" : (r.p95 as number) > 200 ? "text-amber-400" : "text-muted-foreground")}>{r.p95 as number}ms</span> },
    { key: "p99", label: "P99", sortable: true, render: (r: Record<string, unknown>) => <span className={cn("font-mono text-xs", (r.p99 as number) > 1000 ? "text-red-400" : (r.p99 as number) > 500 ? "text-amber-400" : "text-muted-foreground")}>{r.p99 as number}ms</span> },
    { key: "errorRate", label: "Error %", sortable: true, render: (r: Record<string, unknown>) => <span className={cn("font-mono text-xs", (r.errorRate as number) > 1 ? "text-red-400" : "text-muted-foreground")}>{(r.errorRate as number).toFixed(1)}%</span> },
    { key: "rps", label: "RPS", sortable: true, render: (r: Record<string, unknown>) => <span className="font-mono text-xs">{(r.rps as number).toLocaleString()}</span> },
    { key: "status", label: "Status", render: (r: Record<string, unknown>) => <StatusBadge status={r.status as string} size="sm" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Infrastructure" description="Server health, resource utilization, and infrastructure topology" />

      {/* ── Resource Gauges ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {resources.map((r, i) => {
          const pct = (r.value / r.max) * 100;
          const color = pct > 80 ? "#EF4444" : gaugeColors[i];
          const glow = pct > 80 ? "crimson" : undefined;
          return (
            <GlassPanel key={r.label} padding="lg" className="flex flex-col items-center" glow={glow as "crimson" | undefined}>
              <GaugeWidget value={pct} color={color} label={r.label} size={130} />
              <div className="mt-2 text-center">
                <span className="font-mono text-xs text-muted-foreground">
                  {pct.toFixed(0)}% — {gaugeDetails[i].actual}
                </span>
              </div>
              <div className="mt-2">
                <SparklineChart data={gaugeDetails[i].spark} color={color} width={80} height={20} />
              </div>
            </GlassPanel>
          );
        })}
      </div>

      {/* ── Services ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {services.map((svc: ServiceNode) => {
            const effectiveStatus = getServiceStatus(svc);
            const dotColor = statusColors[effectiveStatus];
            // Mock latency sparkline per service
            const latencySpark = Array.from({ length: 12 }, () => svc.latency + (Math.random() - 0.5) * svc.latency * 0.4);

            return (
              <GlassPanel key={svc.id} hover padding="md" className="group/svc h-[88px] flex flex-col">
                <div className="flex items-center gap-3">
                  {typeIcons[svc.type] ?? <Server className="size-4" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{svc.name}</span>
                      <span className="relative flex size-2 shrink-0">
                        {effectiveStatus === "healthy" && (
                          <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: dotColor }} />
                        )}
                        <span className="relative inline-flex size-2 rounded-full" style={{ background: dotColor }} />
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] uppercase text-muted-foreground">{svc.type}</span>
                      <span className={cn(
                        "text-xs font-mono",
                        svc.latency > 200 ? "text-amber-400" : svc.latency > 100 ? "text-amber-400/70" : "text-muted-foreground"
                      )}>
                        {svc.latency}ms
                      </span>
                    </div>
                  </div>
                </div>
                {/* Sparkline — always in DOM, opacity toggle only */}
                <div className="mt-auto pt-2 border-t border-border flex items-center justify-between opacity-0 group-hover/svc:opacity-100 transition-opacity duration-200">
                  <span className="text-[10px] text-muted-foreground">1h latency</span>
                  <SparklineChart
                    data={latencySpark}
                    color={svc.latency > 200 ? "#F59E0B" : "var(--primary)"}
                    width={80}
                    height={20}
                  />
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </div>

      {/* ── API Endpoints ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">API Endpoints</h2>
        <GlassPanel padding="none">
          <DataTable
            columns={endpointColumns}
            data={endpoints as unknown as Record<string, unknown>[]}
            pageSize={10}
          />
        </GlassPanel>
      </div>

      {/* ── Queue Monitor ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Queue Monitor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {queues.map((q) => (
            <GlassPanel key={q.name} hover padding="lg">
              <h3 className="text-sm font-medium text-foreground font-mono">{q.name}</h3>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Depth</span>
                  <span className="font-mono text-foreground">{q.depth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Processing</span>
                  <span className="font-mono text-foreground">{q.processingRate}/min</span>
                </div>
                {/* DLQ — alarming if > 0 */}
                <div className={cn(
                  "flex justify-between text-xs rounded px-2 py-1 -mx-2",
                  q.dlqCount > 0 ? "bg-[#EF4444]/10 border border-[#EF4444]/20" : ""
                )}>
                  <span className={q.dlqCount > 0 ? "text-amber-400 font-medium" : "text-muted-foreground"}>
                    DLQ
                  </span>
                  <span className={cn("font-mono font-bold", q.dlqCount > 0 ? "text-[#EF4444]" : "text-foreground")}>
                    {q.dlqCount}
                    {q.dlqCount > 0 && <span className="text-[9px] font-normal text-amber-400 ml-1">⚠ needs attention</span>}
                  </span>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>

      {/* ── Auto-scaling Events ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="size-4 text-brand" />
          Auto-scaling Events
        </h2>
        <GlassPanel padding="lg">
          <div className="space-y-0">
            {AUTOSCALE_EVENTS.map((evt, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-muted/30 transition-colors",
                  i < AUTOSCALE_EVENTS.length - 1 && "border-b border-border/50"
                )}
              >
                {/* Direction arrow */}
                <div className={cn(
                  "flex items-center justify-center size-8 rounded-lg shrink-0",
                  evt.direction === "up" ? "bg-green-500/10" : "bg-muted/40"
                )}>
                  {evt.direction === "up" ? (
                    <ArrowUp className="size-4 text-green-400" />
                  ) : (
                    <ArrowDown className="size-4 text-muted-foreground" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{evt.service}</span>
                    <span className="text-muted-foreground"> scaled {evt.direction} </span>
                    <span className="font-mono text-xs">
                      {evt.from}→{evt.to} instances
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{evt.reason}</p>
                </div>

                {/* Timestamp */}
                <span className="text-xs text-muted-foreground font-mono shrink-0" suppressHydrationWarning>
                  {evt.ago}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
