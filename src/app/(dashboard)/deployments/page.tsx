"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { PageHeader, GlassPanel, StatusBadge, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Rocket, Bot, User, RotateCcw, ScrollText, ChevronDown, ChevronRight, Globe, Cog, Database, Radio, Shield, BarChart3, Search, Layers, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { invalidate } from "@/lib/store-cache";
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

/* ── Deploy Modal ── */
function DeployModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [service, setService] = useState("");
  const [version, setVersion] = useState("");
  const [environment, setEnvironment] = useState<DeployStage>("dev");
  const [deploying, setDeploying] = useState(false);

  if (!open) return null;

  const handleDeploy = async () => {
    if (!service.trim() || !version.trim()) {
      toast.error("Service name and version are required");
      return;
    }
    setDeploying(true);
    try {
      const res = await fetch("/api/deployments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: service.trim(),
          version: version.trim(),
          environment,
          stage: environment,
          status: "SUCCESS",
          commitHash: `${Math.random().toString(36).slice(2, 9)}`,
          changelog: `Deploy ${service} ${version} to ${environment}`,
          triggeredBy: "Admin",
          isAgent: false,
          duration: 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Deploy failed" }));
        throw new Error(data.error || "Deploy failed");
      }
      invalidate("deployments");
      toast.success(`${service} ${version} deployed to ${environment}`);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Rocket className="size-4 text-[#00d992]" />
              <h2 className="text-sm font-semibold text-foreground">New Deployment</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Service</label>
              <Input placeholder="api-gateway" value={service} onChange={(e) => setService(e.target.value)} className="h-9" autoFocus />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Version</label>
              <Input placeholder="v1.2.3" value={version} onChange={(e) => setVersion(e.target.value)} className="h-9 font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Environment</label>
              <div className="grid grid-cols-4 gap-2">
                {(["dev", "staging", "review", "production"] as DeployStage[]).map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setEnvironment(env)}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-all",
                      environment === env
                        ? "bg-[#00d992]/10 text-[#00d992] border border-[#00d992]/30"
                        : "bg-muted/30 text-muted-foreground border border-border hover:border-border/80"
                    )}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
            <Button variant="outline" size="sm" onClick={onClose} disabled={deploying}>Cancel</Button>
            <Button size="sm" className="bg-[#00d992] hover:bg-[#00d992]/90 text-black" onClick={handleDeploy} disabled={deploying || !service.trim() || !version.trim()}>
              {deploying ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Deploying...</> : <><Rocket className="size-3.5 mr-1.5" />Deploy</>}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DeploymentsPage() {
  const [tab, setTab] = useState<"pipeline" | "history" | "flags">("pipeline");
  const { deployments, environments, featureFlags, toggleFeatureFlag, fetch: fetchDeployments } = useDeploymentsStore();
  const [rollbackTarget, setRollbackTarget] = useState<Deployment | null>(null);
  const [deployOpen, setDeployOpen] = useState(false);

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
    "api-gateway": { icon: Globe, color: "#00d992" },
    "web-app": { icon: Layers, color: "#A855F7" },
    "worker-service": { icon: Cog, color: "#F59E0B" },
    "analytics-service": { icon: BarChart3, color: "#39FF14" },
    "notification-service": { icon: Radio, color: "#EC4899" },
    "ml-pipeline": { icon: Database, color: "#00d992" },
    "cache-service": { icon: Database, color: "#F59E0B" },
    "search-service": { icon: Search, color: "#4285F4" },
    "auth-service": { icon: Shield, color: "#10A37F" },
  };

  const stages: DeployStage[] = ["dev", "staging", "review", "production"];
  const stageLabels: Record<string, string> = { dev: "Development", staging: "Staging", review: "Review", production: "Production" };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployments]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of stages) {
      counts[stage] = deployments.filter((d) => d.stage === stage).length;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployments]);

  const hasDeployments = deployments.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Deployments" description="Track deployment pipelines, rollouts, and release history">
        <Button size="default" onClick={() => setDeployOpen(true)} className="bg-[#00d992] hover:bg-[#00d992]/90 text-black">
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
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00d992]" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ PIPELINE TAB ═══ */}
      {tab === "pipeline" && (
        <div className="space-y-4">
          {!hasDeployments ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex items-center justify-center size-14 rounded-2xl bg-muted/30 border border-border/50">
                <Rocket className="size-7 text-muted-foreground/25" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">No deployments yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Deploy your first service to see the pipeline matrix
                </p>
              </div>
              <Button onClick={() => setDeployOpen(true)} className="bg-[#00d992] hover:bg-[#00d992]/90 text-black mt-2">
                <Rocket className="size-4 mr-1.5" /> Create First Deployment
              </Button>
            </div>
          ) : (
            <>
              <GlassPanel padding="none">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-semibold text-foreground px-4 py-3 min-w-[200px] w-[200px] sticky left-0 bg-card/95 backdrop-blur-sm z-10">Service</th>
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
                        const anyDeploy = stageMap.values().next().value;
                        return (
                          <React.Fragment key={service}>
                            <tr className={cn("border-b border-border/50 transition-colors cursor-pointer h-[80px]", isExpanded ? "bg-muted/30" : "hover:bg-muted/20")} onClick={() => setExpandedRow(isExpanded ? null : service)}>
                              <td className="px-4 sticky left-0 bg-card/95 backdrop-blur-sm z-10 min-w-[200px] w-[200px]">
                                <div className="flex items-center gap-2.5">
                                  {isExpanded ? <ChevronDown className="size-3 text-[#00d992] shrink-0" /> : <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />}
                                  {(() => { const svcInfo = SERVICE_ICONS[service]; const SvcIcon = svcInfo?.icon || Globe; const svcColor = svcInfo?.color || "#666"; return <SvcIcon className="size-3.5 shrink-0" style={{ color: svcColor }} />; })()}
                                  <span className="font-mono text-[13px] font-medium text-foreground truncate whitespace-nowrap">{service}</span>
                                </div>
                              </td>
                              {stages.map((stage) => {
                                const d = stageMap.get(stage);
                                if (!d) return <td key={stage} className="px-3 py-3"><span className="text-muted-foreground/30 text-xs">&mdash;</span></td>;
                                return (
                                  <td key={stage} className="px-3 py-3">
                                    <div className={cn("group/cell relative rounded-lg px-2.5 py-2 transition-all bg-muted/30 hover:bg-muted/40", d.status === "failed" && "border-l-[3px] border-l-[#EF4444]")}>
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <StatusBadge status={d.status} size="sm" />
                                        <span className="font-mono text-[11px] text-[#00d992]">{d.version}</span>
                                      </div>
                                      <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>{formatRelativeTime(d.timestamp)}</span>
                                      {(d.status === "success" || d.status === "failed") && (
                                        <button onClick={(e) => { e.stopPropagation(); setRollbackTarget(d); }} className="absolute top-2 right-2 opacity-0 group-hover/cell:opacity-100 inline-flex items-center gap-1 text-[9px] font-medium rounded px-1.5 py-0.5 transition-all text-muted-foreground bg-muted/50 hover:text-amber-400 hover:bg-amber-400/10">
                                          <RotateCcw className="size-2" /> Rollback
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                            {isExpanded && anyDeploy && (
                              <tr className="border-b border-border/50 bg-muted/20">
                                <td colSpan={5} className="px-4 py-3">
                                  <div className="flex items-start gap-8 pl-5 text-xs">
                                    <div><span className="text-muted-foreground">Triggered by</span><p className="flex items-center gap-1 mt-0.5 text-foreground">{anyDeploy.isAgent ? <Bot className="size-3 text-[#00d992]" /> : <User className="size-3" />}{anyDeploy.triggeredBy}</p></div>
                                    <div><span className="text-muted-foreground">Duration</span><p className="font-mono text-foreground mt-0.5">{anyDeploy.duration > 0 ? formatDuration(anyDeploy.duration * 1000) : "Instant"}</p></div>
                                    <div><span className="text-muted-foreground">Commit</span><p className="font-mono text-[#00d992] mt-0.5">{anyDeploy.commitHash || "—"}</p></div>
                                    <div className="flex-1"><span className="text-muted-foreground">Changelog</span><p className="text-foreground mt-0.5">{anyDeploy.changelog || "—"}</p></div>
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

              {/* Environment Status */}
              {environments.length > 0 && (
                <div>
                  <button onClick={() => setEnvCardsOpen(!envCardsOpen)} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground transition-colors">
                    {envCardsOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                    Environment Health
                  </button>
                  {envCardsOpen && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {environments.map((env) => (
                        <GlassPanel key={env.name} padding="lg" glow={env.status === "healthy" ? "green" : env.status === "degraded" ? "amber" : "crimson"}>
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
                          {env.healthChecks.length > 0 && (
                            <div className="border-t border-border pt-2 space-y-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Health Checks</span>
                              {env.healthChecks.map((hc) => (
                                <div key={hc.name} className="flex items-center gap-2 text-xs">
                                  <HealthDot status={hc.status} />
                                  <span className={cn("flex-1", hc.status === "healthy" ? "text-muted-foreground" : hc.status === "degraded" ? "text-amber-400" : "text-red-400")}>{hc.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </GlassPanel>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === "history" && (
        !hasDeployments ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ScrollText className="size-8 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">No deployment history</p>
            <p className="text-xs text-muted-foreground/50">Deployments will appear here as you deploy services</p>
          </div>
        ) : (
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
                      <td className="px-4 py-2.5 font-mono text-xs text-[#00d992]">{d.version}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{d.environment}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={d.status} size="sm" /></td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{d.duration > 0 ? formatDuration(d.duration * 1000) : "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {d.isAgent ? <Bot className="size-3 text-[#00d992]" /> : <User className="size-3" />}
                          {d.triggeredBy}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground" suppressHydrationWarning>{formatRelativeTime(d.timestamp)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {d.status === "success" && (
                            <button onClick={() => setRollbackTarget(d)} className="text-[10px] text-muted-foreground hover:text-amber-400 transition-colors">Rollback</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        )
      )}

      {/* ═══ FEATURE FLAGS TAB ═══ */}
      {tab === "flags" && (
        featureFlags.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Shield className="size-8 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">No feature flags</p>
            <p className="text-xs text-muted-foreground/50">Feature flags will appear here when configured</p>
          </div>
        ) : (
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
                      <td className="px-4 py-2.5"><span className="font-mono text-xs text-foreground">{ff.name}</span></td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[240px] truncate">{ff.description}</td>
                      {(["development", "staging", "production"] as Environment[]).map((env) => (
                        <td key={env} className="px-4 py-2.5">
                          <Switch checked={ff.environments[env]} onCheckedChange={() => toggleFeatureFlag(ff.id, env)} className="data-[state=checked]:bg-[#00d992]" />
                        </td>
                      ))}
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        )
      )}

      {/* Modals */}
      <DeployModal open={deployOpen} onClose={() => { setDeployOpen(false); invalidate("deployments"); fetchDeployments(); }} />
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
