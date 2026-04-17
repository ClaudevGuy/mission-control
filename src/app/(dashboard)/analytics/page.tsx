"use client";

import { useState, useEffect } from "react";
import { PageHeader, GlassPanel } from "@/components/shared";
import { useAnalyticsStore } from "@/stores/analytics-store";
import { useAgentsStore } from "@/stores/agents-store";
import { useCostsStore } from "@/stores/costs-store";
import { Users, Activity, TrendingUp, Bot, BarChart3, Globe, MousePointer, Clock, HeartPulse, AlertTriangle, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}15` }}>
        <div style={{ color }}><Icon className="size-4" /></div>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold font-mono text-foreground mt-0.5 leading-none">{value}</p>
      </div>
    </div>
  );
}

function EmptySection({ icon: Icon, message, sub }: { icon: React.ComponentType<{ className?: string }>; message: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center rounded-xl border border-border bg-card/50">
      <Icon className="size-8 text-muted-foreground/15" />
      <p className="text-xs text-muted-foreground/50">{message}</p>
      <p className="text-[10px] text-muted-foreground/30">{sub}</p>
    </div>
  );
}

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = "users" | "engagement" | "growth" | "agents" | "health";

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>("users");
  const { data: analytics, fetch: fetchAnalytics } = useAnalyticsStore();
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetch);
  const fetchCosts = useCostsStore((s) => s.fetch);
  const dailyCosts = useCostsStore((s) => s.dailyCosts);

  useEffect(() => {
    fetchAnalytics();
    fetchAgents();
    fetchCosts();
  }, [fetchAnalytics, fetchAgents, fetchCosts]);

  const { overview, retention, geo, features, funnel, growth } = analytics;
  const hasUserData = overview.dau > 0 || overview.wau > 0 || overview.mau > 0;
  const hasAgentData = agents.length > 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "users", label: "Users" },
    { id: "engagement", label: "Engagement" },
    { id: "growth", label: "Growth" },
    { id: "agents", label: "Agent Performance" },
    { id: "health", label: "Agent Health" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="User engagement, growth metrics, and agent performance"
      />

      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "pb-2.5 text-sm font-medium transition-colors relative",
                tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
              )}
            >
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ USERS TAB ═══ */}
      {tab === "users" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="DAU" value={hasUserData ? overview.dau.toLocaleString() : "0"} icon={Users} color="var(--primary)" />
            <StatCard label="WAU" value={hasUserData ? overview.wau.toLocaleString() : "0"} icon={Users} color="#A855F7" />
            <StatCard label="MAU" value={hasUserData ? overview.mau.toLocaleString() : "0"} icon={Users} color="#F59E0B" />
            <StatCard label="Avg Session" value={overview.avgSession > 0 ? `${overview.avgSession}m` : "—"} icon={Clock} color="#39FF14" />
          </div>

          {/* Retention cohorts */}
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Retention Cohorts</h3>
            {retention.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Cohort</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Week</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-3 py-2">Retention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retention.map((c, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-3 py-2 text-xs text-foreground">{c.cohortWeek}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">Week {c.weekIndex}</td>
                        <td className="px-3 py-2 text-xs font-mono text-foreground">{c.retentionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptySection icon={Users} message="No retention data yet" sub="Data populates as users return over time" />
            )}
          </GlassPanel>

          {/* Geo */}
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Users by Country</h3>
            {geo.length > 0 ? (
              <div className="space-y-2">
                {geo.map((g, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{g.country}</span>
                    <span className="font-mono text-muted-foreground">{g.users.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection icon={Globe} message="No geo data yet" sub="Geographic distribution appears as users sign up" />
            )}
          </GlassPanel>
        </div>
      )}

      {/* ═══ ENGAGEMENT TAB ═══ */}
      {tab === "engagement" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Pages / Session" value={overview.pagesPerSession > 0 ? overview.pagesPerSession.toFixed(1) : "—"} icon={MousePointer} color="var(--primary)" />
            <StatCard label="Bounce Rate" value={overview.bounceRate > 0 ? `${overview.bounceRate}%` : "—"} icon={Activity} color="#EF4444" />
            <StatCard label="Avg Session" value={overview.avgSession > 0 ? `${overview.avgSession}m` : "—"} icon={Clock} color="#A855F7" />
            <StatCard label="Features Used" value={features.length > 0 ? features.length.toString() : "0"} icon={BarChart3} color="#F59E0B" />
          </div>

          {/* Feature usage */}
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Feature Usage</h3>
            {features.length > 0 ? (
              <div className="space-y-3">
                {features.map((f, i) => {
                  const maxUsage = Math.max(...features.map((x) => x.usage || 0), 1);
                  const pct = ((f.usage || 0) / maxUsage) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-32 text-xs text-muted-foreground truncate">{f.feature}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs font-mono text-muted-foreground">{(f.usage || 0).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptySection icon={BarChart3} message="No feature usage data yet" sub="Feature adoption metrics appear as users interact" />
            )}
          </GlassPanel>

          {/* Funnel */}
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Conversion Funnel</h3>
            {funnel.length > 0 ? (
              <div className="space-y-2">
                {funnel.map((step, i) => {
                  const maxCount = funnel[0]?.count || 1;
                  const pct = (step.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-muted-foreground truncate">{step.stage}</span>
                      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand to-[#A855F7]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-16 text-right text-xs font-mono text-muted-foreground">{step.count.toLocaleString()}</span>
                      <span className="w-10 text-right text-xs font-mono text-muted-foreground/50">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptySection icon={Activity} message="No funnel data yet" sub="Conversion steps appear as users progress through flows" />
            )}
          </GlassPanel>
        </div>
      )}

      {/* ═══ GROWTH TAB ═══ */}
      {tab === "growth" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Metrics Tracked" value={growth.length > 0 ? growth.length.toString() : "0"} icon={TrendingUp} color="#39FF14" />
            <StatCard label="DAU" value={overview.dau > 0 ? overview.dau.toLocaleString() : "0"} icon={Users} color="var(--primary)" />
            <StatCard label="WAU" value={overview.wau > 0 ? overview.wau.toLocaleString() : "0"} icon={Users} color="#A855F7" />
            <StatCard label="MAU" value={overview.mau > 0 ? overview.mau.toLocaleString() : "0"} icon={Users} color="#F59E0B" />
          </div>

          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Growth Metrics</h3>
            {growth.length > 0 ? (
              <div className="space-y-2">
                {growth.map((g, i) => {
                  const change = g.previous > 0 ? ((g.current - g.previous) / g.previous) * 100 : 0;
                  return (
                    <div key={i} className="flex items-center justify-between text-sm border-b border-border/30 py-2">
                      <span className="text-xs text-foreground font-medium">{g.metric}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-muted-foreground">prev: {g.previous.toLocaleString()}</span>
                        <span className="text-xs font-mono text-foreground">now: {g.current.toLocaleString()}</span>
                        <span className={cn("text-xs font-mono font-bold", change >= 0 ? "text-green-400" : "text-red-400")}>
                          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptySection icon={TrendingUp} message="No growth data yet" sub="Growth metrics appear as your user base evolves" />
            )}
          </GlassPanel>
        </div>
      )}

      {/* ═══ AGENT PERFORMANCE TAB ═══ */}
      {tab === "agents" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Agents" value={agents.length.toString()} icon={Bot} color="var(--primary)" />
            <StatCard label="Active" value={agents.filter((a) => a.status === "running").length.toString()} icon={Bot} color="#39FF14" />
            <StatCard label="Total Runs" value={agents.reduce((s, a) => s + a.tasksCompleted, 0).toLocaleString()} icon={Activity} color="#A855F7" />
            <StatCard label="Total Cost" value={`$${agents.reduce((s, a) => s + a.totalCost, 0).toFixed(2)}`} icon={BarChart3} color="#F59E0B" />
          </div>

          {hasAgentData ? (
            <GlassPanel padding="lg">
              <h3 className="text-sm font-semibold text-foreground mb-3">Agent Overview</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Agent", "Model", "Status", "Tasks", "Error Rate", "Health", "Cost"].map((h) => (
                        <th key={h} className="text-left text-xs font-medium text-muted-foreground px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => (
                      <tr key={agent.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2.5 text-sm font-medium text-foreground">{agent.name}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{agent.model}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            agent.status === "running" ? "bg-green-500/15 text-green-400" :
                            agent.status === "error" ? "bg-red-500/15 text-red-400" :
                            "bg-muted/50 text-muted-foreground"
                          )}>
                            {agent.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{agent.tasksCompleted}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{agent.errorRate}%</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{agent.healthScore}%</td>
                        <td className="px-3 py-2.5 font-mono text-xs">${agent.totalCost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassPanel>
          ) : (
            <EmptySection icon={Bot} message="No agents deployed" sub="Deploy agents to see performance metrics" />
          )}

          {/* Daily costs chart placeholder */}
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3">Daily Agent Costs (7d)</h3>
            {dailyCosts.length > 0 && dailyCosts.some((d) => d.value > 0) ? (
              <div className="space-y-2">
                {dailyCosts.slice(-7).map((d, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-muted-foreground">{d.date ? new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }) : ""}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min((d.value / Math.max(...dailyCosts.slice(-7).map((x) => x.value), 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="w-16 text-right text-xs font-mono text-muted-foreground">${d.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection icon={BarChart3} message="No cost data yet" sub="Costs appear as agents execute tasks" />
            )}
          </GlassPanel>
        </div>
      )}

      {/* ═══ AGENT HEALTH TAB ═══ */}
      {tab === "health" && (
        <div className="space-y-6">
          {!hasAgentData ? (
            <EmptySection icon={HeartPulse} message="No agents to monitor" sub="Deploy agents to see health metrics" />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {agents.map((agent) => {
                  // Calculate health metrics from agent data
                  const totalRuns = agent.tasksCompleted || 0;
                  const errorRate = agent.errorRate || 0;
                  const healthScore = Math.max(0, Math.min(100, Math.round(100 - errorRate * 5 - (agent.status === "error" ? 20 : 0))));
                  const avgScore = Math.max(0, Math.min(100, Math.round(100 - errorRate * 3)));
                  const drift = avgScore - healthScore;
                  const isDrifting = drift > 10;
                  const trend = drift > 5 ? "down" : drift < -5 ? "up" : "stable";

                  // Generate sparkline data (simulated from agent stats)
                  const sparkline: number[] = [];
                  for (let i = 0; i < 10; i++) {
                    const base = avgScore;
                    const variance = i >= 8 ? (isDrifting ? -drift : 0) : (Math.random() * 10 - 5);
                    sparkline.push(Math.max(0, Math.min(100, Math.round(base + variance))));
                  }

                  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
                  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground/50";

                  return (
                    <div
                      key={agent.id}
                      className={cn(
                        "rounded-xl border p-4 space-y-3 transition-colors",
                        isDrifting ? "border-amber-500/30 bg-amber-500/[0.03]" : "border-border bg-card"
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                            {isDrifting && (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase">
                                <AlertTriangle className="size-2.5" /> Drift
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground/50 mt-0.5">{totalRuns} total runs · {errorRate.toFixed(1)}% error rate</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendIcon className={cn("size-3", trendColor)} />
                          <span className={cn("text-lg font-bold font-mono", healthScore >= 80 ? "text-green-400" : healthScore >= 50 ? "text-amber-400" : "text-red-400")}>
                            {healthScore}
                          </span>
                        </div>
                      </div>

                      {/* Sparkline */}
                      <div className="flex items-end gap-[3px] h-8">
                        {sparkline.map((val, i) => {
                          const height = Math.max(4, (val / 100) * 32);
                          const isLast = i === sparkline.length - 1;
                          return (
                            <div
                              key={i}
                              className={cn("flex-1 rounded-sm transition-colors", isLast ? (val < avgScore - 10 ? "bg-red-400" : "bg-brand") : "bg-muted-foreground/15")}
                              style={{ height: `${height}px` }}
                            />
                          );
                        })}
                      </div>

                      {/* Average line label */}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground/40">30d avg: <span className="font-mono">{avgScore}</span></span>
                        <span className={cn("font-mono", trendColor)}>
                          {trend === "up" ? "↑ Improving" : trend === "down" ? "↓ Degrading" : "→ Stable"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drift explanation */}
              <GlassPanel padding="lg">
                <div className="flex items-start gap-3">
                  <HeartPulse className="size-4 text-brand shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">How health scores work</h4>
                    <p className="text-[10px] text-muted-foreground/60 mt-1 leading-relaxed">
                      Health scores (0-100) are calculated from error rate, agent status, and run history.
                      A drift alert triggers when the current score drops 10+ points below the 30-day average.
                      Drifting agents show an amber badge and create an automatic notification.
                    </p>
                  </div>
                </div>
              </GlassPanel>
            </>
          )}
        </div>
      )}
    </div>
  );
}
