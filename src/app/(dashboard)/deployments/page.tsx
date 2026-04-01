"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { PageHeader, GlassPanel, StatusBadge, SparklineChart, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Rocket, Bot, User, RotateCcw, ScrollText, ChevronDown, ChevronRight, Globe, Cog, Database, Radio, Shield, BarChart3, Search, Layers } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Deployment } from "@/types/deployments";
import type { HealthStatus, Environment, DeployStage } from "@/types/common";

/* ── Health dot ── */
function HealthDot({ status }: { status: HealthStatus }) {
  const colors: Record<HealthStatus, string> = { healthy: "#39FF14", degraded: "#F59E0B", down: "#EF4444" };
  const pulse = status === "healthy";
  return (
    <span className="relative flex size-2">
      {pulse && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: colors[status], opacity: 0.4 }} />}
      <span className="relative inline-flex size-2 rounded-full" style={{ background: colors[status] }} />
    </span>
  );
}

export default function DeploymentsPage() {
  const [tab, setTab] = useState<"pipeline" | "history" | "flags">("pipeline");
  const { deployments, environments, featureFlags, toggleFeatureFlag, fetch: fetchDeployments } = useDeploymentsStore();
  const [rollbackTarget, setRollbackTarget] = useState<Deployment | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDeployments(); }, []);

  const tabs = [
    { id: "pipeline" as const, label: "Pipeline" },
    { id: "history" as const, label: "History" },
    { id: "flags" as const, label: "Feature Flags" },
  ];

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [envCardsOpen, setEnvCardsOpen] = useState(true);

  const SERVICE_ICONS: Record<string, { icon: typeof Globe; color: string }> = {
    "api-gateway": { icon: Globe, color: "#00D4FF" },
    "web-app": { icon: Layers, color: "#A855F7" },
    "worker-service": { icon: Cog, color: "#F59E0B" },
    "analytics-service": { icon: BarChart3, color: "#39FF14" },
    "notification-service": { icon: Radio, color: "#EC4899" },
    "ml-pipeline": { icon: Database, color: "#00D4FF" },
    "cache-service": { icon: Database, color: "#F59E0B" },
    "search-service": { icon: Search, color: "#4285F4" },
    "auth-service": { icon: Shield, color: "#10A37F" },
  };

  const stages: DeployStage[] = ["dev", "staging", "review", "production"];
  const stageLabels: Record<string, string> = { dev: "Development", staging: "Staging", review: "Review", production: "Production" };

  // Build deployment matrix: service → stage → latest deployment
  const matrix = useMemo(() => {
    const services = Array.from(new Set(deployments.map((d) => d.service)));
    const map = new Map<string, Map<DeployStage, Deployment>>();
    for (const svc of services) {
      const stageMap = new Map<DeployStage, Deployment>();
      for (const stage of stages) {
        const latest = deployments.find((d) => d.service === svc && d.stage === stage);
        if (latest) stageMap.set(stage, latest);
      }
      map.set(svc, stageMap);
    }
    return map;
  }, [deployments]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of stages) {
      counts[stage] = deployments.filter((d) => d.stage === stage).length;
    }
    return counts;
  }, [deployments]);

  return (
    <div className="space-y-6">
      <PageHeader title="Deployments" description="Track deployment pipelines, rollouts, and release history">
        <Button size="default" onClick={() => toast.success("Deployment triggered")}>
          <Rocket className="size-4 mr-2" /> Deploy
        </Button>
      </PageHeader>

      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn("pb-2.5 text-sm font-medium transition-colors relative", tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70")}
            >
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ PIPELINE TAB ═══ */}
      {tab === "pipeline" && (
        <div className="space-y-4">
          {/* Deployment Matrix */}
          <GlassPanel padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                {/* Sticky header */}
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-semibold text-foreground px-4 py-3 min-w-[200px] w-[200px] sticky left-0 bg-card/95 backdrop-blur-sm z-10">
                      Service
                    </th>
                    {stages.map((stage) => (
                      <th key={stage} className="text-left text-xs font-medium text-muted-foreground px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="uppercase tracking-wider">{stageLabels[stage]}</span>
                          <span className="font-mono text-[10px] bg-muted/50 rounded-full px-1.5 py-0.5 text-muted-foreground">{stageCounts[stage]}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(matrix.entries()).map(([service, stageMap]) => {
                    const isExpanded = expandedRow === service;
                    // Get the detail deploy for expanded view
                    const anyDeploy = stageMap.values().next().value;

                    return (
                      <React.Fragment key={service}>
                        <tr
                          className={cn(
                            "border-b border-border/50 transition-colors cursor-pointer h-[80px]",
                            isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
                          )}
                          onClick={() => setExpandedRow(isExpanded ? null : service)}
                        >
                          {/* Service name — sticky left */}
                          <td className="px-4 sticky left-0 bg-card/95 backdrop-blur-sm z-10 min-w-[200px] w-[200px]">
                            <div className="flex items-center gap-2.5">
                              {isExpanded ? <ChevronDown className="size-3 text-[#00D4FF] shrink-0" /> : <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />}
                              {(() => {
                                const svcInfo = SERVICE_ICONS[service];
                                const SvcIcon = svcInfo?.icon || Globe;
                                const svcColor = svcInfo?.color || "#666";
                                return <SvcIcon className="size-3.5 shrink-0" style={{ color: svcColor }} />;
                              })()}
                              <span className="font-mono text-[13px] font-medium text-foreground truncate whitespace-nowrap">{service}</span>
                            </div>
                          </td>

                          {/* Stage cells */}
                          {stages.map((stage) => {
                            const d = stageMap.get(stage);
                            if (!d) {
                              return (
                                <td key={stage} className="px-3 py-3">
                                  <span className="text-muted-foreground/30 text-xs">—</span>
                                </td>
                              );
                            }
                            return (
                              <td key={stage} className="px-3 py-3">
                                <div className={cn(
                                  "group/cell relative rounded-lg px-2.5 py-2 transition-all hover:shadow-[0_0_8px_rgba(0,212,255,0.06)]",
                                  d.status === "failed" && "border-l-[3px] border-l-[#EF4444]",
                                  "bg-muted/30 hover:bg-muted/40"
                                )}>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <StatusBadge status={d.status} size="sm" />
                                    <span className="font-mono text-[11px] text-[#00D4FF]">{d.version}</span>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>{formatRelativeTime(d.timestamp)}</span>

                                  {/* In-progress indicator */}
                                  {d.status === "in_progress" && (
                                    <div className="mt-1.5">
                                      <div className="w-full h-[3px] rounded-full bg-muted/50 overflow-hidden">
                                        <div className="h-full bg-[#00D4FF] rounded-full animate-pulse" style={{ width: "35%" }} />
                                      </div>
                                      <span className="inline-flex items-center mt-1 text-[9px] font-mono text-[#00D4FF] bg-[#00D4FF]/10 rounded px-1 py-px">
                                        10% traffic
                                      </span>
                                    </div>
                                  )}

                                  {/* Hover rollback */}
                                  {(d.status === "success" || d.status === "failed") && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setRollbackTarget(d); }}
                                      className={cn(
                                        "absolute top-2 right-2 opacity-0 group-hover/cell:opacity-100 inline-flex items-center gap-1 text-[9px] font-medium rounded px-1.5 py-0.5 transition-all",
                                        d.status === "failed"
                                          ? "text-amber-400 bg-amber-400/15"
                                          : "text-muted-foreground bg-muted/50 hover:text-amber-400 hover:bg-amber-400/10"
                                      )}
                                    >
                                      <RotateCcw className="size-2" /> Rollback
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && anyDeploy && (
                          <tr className="border-b border-border/50 bg-muted/20">
                            <td colSpan={5} className="px-4 py-3">
                              <div className="flex items-start gap-8 pl-5 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Triggered by</span>
                                  <p className="flex items-center gap-1 mt-0.5 text-foreground">
                                    {anyDeploy.isAgent ? <Bot className="size-3 text-[#00D4FF]" /> : <User className="size-3" />}
                                    {anyDeploy.triggeredBy}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Duration</span>
                                  <p className="font-mono text-foreground mt-0.5">{anyDeploy.duration > 0 ? formatDuration(anyDeploy.duration * 1000) : "In progress"}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Commit</span>
                                  <p className="font-mono text-[#00D4FF] mt-0.5">{anyDeploy.commitHash}</p>
                                </div>
                                <div className="flex-1">
                                  <span className="text-muted-foreground">Changelog</span>
                                  <p className="text-foreground mt-0.5">{anyDeploy.changelog}</p>
                                </div>
                                <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#00D4FF] transition-colors shrink-0 mt-2" onClick={(e) => { e.stopPropagation(); toast.success("Opening deployment logs..."); }}>
                                  <ScrollText className="size-3" /> View Logs
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          {/* Environment Status — collapsible */}
          <div>
            <button
              onClick={() => setEnvCardsOpen(!envCardsOpen)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground transition-colors"
            >
              {envCardsOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
              Environment Health
            </button>
            {envCardsOpen && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {environments.map((env) => {
                  const glowColor = env.status === "healthy" ? "green" : env.status === "degraded" ? "amber" : "crimson";
                  return (
                    <GlassPanel key={env.name} padding="lg" glow={glowColor as "green" | "amber" | "crimson"}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground capitalize">{env.name}</h3>
                        <StatusBadge status={env.status} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-xs mb-3">
                        <div><span className="text-muted-foreground">Version</span><p className="font-mono text-foreground">{env.currentVersion}</p></div>
                        <div><span className="text-muted-foreground">Uptime</span><p className="font-mono text-foreground">{env.uptime}%</p></div>
                        <div><span className="text-muted-foreground">Users</span><p className="font-mono text-foreground">{env.activeUsers.toLocaleString()}</p></div>
                        <div><span className="text-muted-foreground">Last Deploy</span><p className="font-mono text-foreground text-[10px]" suppressHydrationWarning>{formatRelativeTime(env.lastDeploy)}</p></div>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-muted-foreground">24h uptime</span>
                        <SparklineChart data={[99.9, 99.8, 99.9, 100, 99.7, 99.9, 100, 99.8, 99.9, 100, env.uptime, 99.9]} color="#39FF14" width={60} height={16} />
                      </div>
                      <div className="border-t border-border pt-2 space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Health Checks</span>
                        {env.healthChecks.map((hc) => (
                          <div key={hc.name} className="flex items-center gap-2 text-xs">
                            <HealthDot status={hc.status} />
                            <span className={cn("flex-1", hc.status === "healthy" ? "text-muted-foreground" : hc.status === "degraded" ? "text-amber-400" : "text-red-400")}>{hc.name}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end mt-3">
                        <button className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#00D4FF] transition-colors" onClick={() => toast.success("Opening environment logs...")}>
                          <ScrollText className="size-2.5" /> View Logs
                        </button>
                      </div>
                    </GlassPanel>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === "history" && (
        <GlassPanel padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Service", "Version", "Environment", "Status", "Duration", "Triggered By", "Timestamp", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deployments.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{d.service}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#00D4FF]">{d.version}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{d.environment}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={d.status} size="sm" /></td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{d.duration > 0 ? formatDuration(d.duration * 1000) : "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {d.isAgent ? <Bot className="size-3 text-[#00D4FF]" /> : <User className="size-3" />}
                        {d.triggeredBy}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground" suppressHydrationWarning>{formatRelativeTime(d.timestamp)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button className="text-[10px] text-muted-foreground hover:text-[#00D4FF] transition-colors" onClick={() => toast.success("Opening deployment logs...")}>View Logs</button>
                        {d.status === "success" && (
                          <button
                            onClick={() => setRollbackTarget(d)}
                            className="text-[10px] text-muted-foreground hover:text-amber-400 transition-colors"
                          >
                            Rollback
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      {/* ═══ FEATURE FLAGS TAB ═══ */}
      {tab === "flags" && (
        <GlassPanel padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Flag", "Description", "Dev", "Staging", "Prod", "Last Modified"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureFlags.map((ff) => (
                  <tr key={ff.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-foreground">{ff.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[240px] truncate">{ff.description}</td>
                    {(["development", "staging", "production"] as Environment[]).map((env) => (
                      <td key={env} className="px-4 py-2.5">
                        <Switch
                          checked={ff.environments[env]}
                          onCheckedChange={() => toggleFeatureFlag(ff.id, env)}
                          className="data-[state=checked]:bg-[#00D4FF]"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">2 days ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassPanel>
      )}

      {/* Rollback confirm */}
      <ConfirmDialog
        open={!!rollbackTarget}
        onOpenChange={(open) => !open && setRollbackTarget(null)}
        title="Confirm Rollback"
        description={rollbackTarget ? `Rollback ${rollbackTarget.service} from ${rollbackTarget.version} in ${rollbackTarget.environment}?` : ""}
        confirmLabel="Rollback"
        variant="danger"
        onConfirm={() => { toast.success(`Rollback initiated for ${rollbackTarget?.service}`); setRollbackTarget(null); }}
      />
    </div>
  );
}
