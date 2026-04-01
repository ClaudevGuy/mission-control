"use client";

import React, { useState, useEffect } from "react";
import { useIncidentsStore } from "@/stores/incidents-store";
import { PageHeader, GlassPanel, MetricCard } from "@/components/shared";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Clock, Activity, TrendingDown, Pencil, Trash2, Plus, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { IncidentSeverity } from "@/types/common";

const SEV_STYLES: Record<IncidentSeverity, { bg: string; border: string; text: string; glow: string }> = {
  P1: { bg: "bg-[#EF4444]/[0.03]", border: "border-l-[3px] border-l-[#EF4444]", text: "text-foreground", glow: "shadow-[0_0_8px_rgba(239,68,68,0.15)]" },
  P2: { bg: "bg-[#F59E0B]/[0.03]", border: "border-l-[3px] border-l-[#F59E0B]", text: "text-foreground", glow: "" },
  P3: { bg: "", border: "border-l-[3px] border-l-muted-foreground/20", text: "text-muted-foreground", glow: "" },
};

const SEV_BADGE: Record<IncidentSeverity, { bg: string; text: string }> = {
  P1: { bg: "#EF4444", text: "#fff" },
  P2: { bg: "#F59E0B", text: "#000" },
  P3: { bg: "rgba(255,255,255,0.1)", text: "#888" },
};

const AVATAR_COLORS: Record<string, string> = {
  "Sarah Chen": "#00D4FF", "Marcus Johnson": "#A855F7", "Aisha Patel": "#F59E0B",
  "James Wilson": "#39FF14", "Emily Rodriguez": "#EF4444",
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// Extra mock incidents
const EXTRA_INCIDENTS = [
  {
    id: "inc_004", title: "Database Connection Pool Exhausted", description: "PostgreSQL connection pool reached max 100 connections. New requests are being rejected.", severity: "P1" as IncidentSeverity, status: "open" as const,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(), updatedAt: new Date(Date.now() - 30 * 60000).toISOString(), assignee: "Sarah Chen",
    affectedServices: ["api-gateway", "worker-service"], timeline: [
      { timestamp: new Date(Date.now() - 45 * 60000).toISOString(), actor: "InfraMonitor", action: "triggered", details: "Connection pool at 100/100" },
      { timestamp: new Date(Date.now() - 40 * 60000).toISOString(), actor: "PagerDuty", action: "notified", details: "Sarah Chen paged" },
    ],
  },
  {
    id: "inc_005", title: "Worker Queue Backlog", description: "analytics-events queue depth at 8,940 items, processing rate insufficient to drain within SLA.", severity: "P2" as IncidentSeverity, status: "investigating" as const,
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(), updatedAt: new Date(Date.now() - 20 * 60000).toISOString(), assignee: "Marcus Johnson",
    affectedServices: ["worker-service", "analytics-service"], timeline: [
      { timestamp: new Date(Date.now() - 60 * 60000).toISOString(), actor: "AlertRule", action: "triggered", details: "Queue depth > 5000 for 5min" },
      { timestamp: new Date(Date.now() - 55 * 60000).toISOString(), actor: "Marcus Johnson", action: "acknowledged", details: "Investigating" },
    ],
  },
];

const ALERT_RULES = [
  { id: "ar_1", name: "High Error Rate", metric: "error_rate", condition: ">", threshold: "5%", duration: "5 min", channels: ["Slack", "PagerDuty"], enabled: true, lastTriggered: "2h ago" },
  { id: "ar_2", name: "API Latency P95", metric: "p95_latency", condition: ">", threshold: "500ms", duration: "10 min", channels: ["Slack"], enabled: true, lastTriggered: "6h ago" },
  { id: "ar_3", name: "Cost Anomaly", metric: "daily_spend", condition: ">", threshold: "$800", duration: "1 day", channels: ["Email"], enabled: true, lastTriggered: "3d ago" },
  { id: "ar_4", name: "Agent Error Rate", metric: "agent_errors", condition: ">", threshold: "10%", duration: "5 min", channels: ["Slack"], enabled: true, lastTriggered: "1d ago" },
  { id: "ar_5", name: "Context Window Full", metric: "context_usage", condition: ">", threshold: "95%", duration: "1 min", channels: ["Email"], enabled: false, lastTriggered: "Never" },
  { id: "ar_6", name: "Queue Depth", metric: "queue_depth", condition: ">", threshold: "5,000", duration: "5 min", channels: ["PagerDuty"], enabled: true, lastTriggered: "45m ago" },
];

const ONCALL = [
  { day: "Mon", person: "Sarah Chen" }, { day: "Tue", person: "Sarah Chen" },
  { day: "Wed", person: "Marcus Johnson" }, { day: "Thu", person: "Marcus Johnson" },
  { day: "Fri", person: "Aisha Patel" }, { day: "Sat", person: "James Wilson" },
  { day: "Sun", person: "James Wilson" },
];

const HISTORY = [
  { title: "CDN Cache Invalidation Failure", severity: "P2" as IncidentSeverity, duration: "1h 12m", resolvedBy: "Aisha Patel", mttr: "1h 45m", date: "Mar 28" },
  { title: "Search Index Corruption", severity: "P1" as IncidentSeverity, duration: "3h 24m", resolvedBy: "Sarah Chen", mttr: "4h 02m", date: "Mar 25" },
  { title: "Payment Webhook Timeout", severity: "P3" as IncidentSeverity, duration: "22m", resolvedBy: "Marcus Johnson", mttr: "35m", date: "Mar 22" },
  { title: "Agent Context Window OOM", severity: "P2" as IncidentSeverity, duration: "45m", resolvedBy: "James Wilson", mttr: "1h 10m", date: "Mar 20" },
  { title: "SSL Certificate Expiry Warning", severity: "P3" as IncidentSeverity, duration: "8m", resolvedBy: "InfraMonitor", mttr: "12m", date: "Mar 18" },
  { title: "Database Migration Failure", severity: "P1" as IncidentSeverity, duration: "2h 48m", resolvedBy: "Sarah Chen", mttr: "3h 15m", date: "Mar 15" },
  { title: "Rate Limiter Misconfiguration", severity: "P2" as IncidentSeverity, duration: "34m", resolvedBy: "Marcus Johnson", mttr: "50m", date: "Mar 12" },
  { title: "Notification Service Down", severity: "P1" as IncidentSeverity, duration: "1h 56m", resolvedBy: "Aisha Patel", mttr: "2h 20m", date: "Mar 8" },
  { title: "Cost Anomaly Spike", severity: "P3" as IncidentSeverity, duration: "15m", resolvedBy: "Sarah Chen", mttr: "18m", date: "Mar 5" },
  { title: "Auth Token Leak Detection", severity: "P1" as IncidentSeverity, duration: "5h 12m", resolvedBy: "Sarah Chen", mttr: "6h 30m", date: "Mar 1" },
];

export default function IncidentsPage() {
  const [tab, setTab] = useState<"active" | "rules" | "oncall" | "history">("active");
  const { incidents, fetch: fetchIncidents } = useIncidentsStore();
  const [expandedInc, setExpandedInc] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchIncidents(); }, []);

  const allIncidents = [...incidents, ...EXTRA_INCIDENTS];
  const columns = { open: "Open", investigating: "Investigating", resolved: "Resolved" } as const;
  const today = new Date().getDay(); // 0=Sun

  const tabs = [
    { id: "active" as const, label: "Active" },
    { id: "rules" as const, label: "Alert Rules" },
    { id: "oncall" as const, label: "On-Call" },
    { id: "history" as const, label: "History" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Alerts & Incidents" description="Incident management, alert rules, and on-call scheduling" />

      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("pb-2.5 text-sm font-medium transition-colors relative", tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70")}>
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ ACTIVE ═══ */}
      {tab === "active" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Open Incidents" value={allIncidents.filter((i) => i.status !== "resolved").length} format="number" icon={AlertTriangle} color="#EF4444" />
            <MetricCard label="Avg Response" value={14} format="number" icon={Clock} color="#F59E0B" />
            <MetricCard label="MTTR (month)" value={2.5} format="number" icon={Activity} color="#00D4FF" />
            <MetricCard label="This Month" value={7} format="number" trend={-41.7} icon={TrendingDown} color="#39FF14" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(Object.entries(columns) as [string, string][]).map(([status, label]) => {
              const cards = allIncidents.filter((i) => i.status === status);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">{cards.length}</span>
                  </div>
                  <div className="space-y-2">
                    {cards.map((inc) => {
                      const sev = SEV_STYLES[inc.severity];
                      const sevBadge = SEV_BADGE[inc.severity];
                      const isExp = expandedInc === inc.id;
                      const avatarColor = AVATAR_COLORS[inc.assignee] || "#888";

                      return (
                        <div key={inc.id}>
                          <GlassPanel padding="md" className={cn(sev.border, sev.bg, sev.glow, "cursor-pointer")} hover>
                            <div onClick={() => setExpandedInc(isExp ? null : inc.id)}>
                              {inc.severity === "P1" && <p className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-1">🚨 CRITICAL</p>}
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: sevBadge.bg, color: sevBadge.text }}>
                                    {inc.severity === "P1" && <span className="relative flex size-1.5 mr-1"><span className="absolute inset-0 rounded-full bg-white animate-ping opacity-60" /><span className="relative size-1.5 rounded-full bg-white" /></span>}
                                    {inc.severity}
                                  </span>
                                  <h4 className={cn("text-sm font-semibold", sev.text)}>{inc.title}</h4>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{inc.description}</p>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                  <div className="size-4 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ background: `${avatarColor}20`, color: avatarColor }}>
                                    {inc.assignee.split(" ").map((n) => n[0]).join("")}
                                  </div>
                                  <span>{inc.assignee}</span>
                                </div>
                                <span className="font-mono" suppressHydrationWarning>{timeAgo(inc.createdAt)}</span>
                              </div>
                              {inc.severity === "P1" && inc.status === "open" && (
                                <button className="mt-2 w-full text-[11px] font-medium text-[#00D4FF] bg-[#00D4FF]/10 rounded py-1.5 hover:bg-[#00D4FF]/20 transition-colors" onClick={(e) => { e.stopPropagation(); toast.success("Incident acknowledged"); }}>
                                  Acknowledge
                                </button>
                              )}
                            </div>
                          </GlassPanel>

                          {isExp && (
                            <GlassPanel padding="md" className="mt-1 border-t-0 rounded-t-none">
                              <div className="space-y-3">
                                <p className="text-xs text-foreground">{inc.description}</p>
                                <div className="space-y-1.5">
                                  <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h5>
                                  {inc.timeline.map((evt, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs">
                                      <span className="font-mono text-[10px] text-muted-foreground w-14 shrink-0" suppressHydrationWarning>{timeAgo(evt.timestamp)}</span>
                                      <span className="text-foreground"><span className="font-medium">{evt.actor}</span> {evt.action}: {evt.details}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                  <span>Services: {inc.affectedServices.join(", ")}</span>
                                </div>
                                <div className="flex gap-2">
                                  <button className="text-[10px] font-medium text-green-400 bg-green-400/10 rounded px-3 py-1 hover:bg-green-400/20" onClick={() => toast.success("Incident resolved")}>Resolve</button>
                                  <button className="text-[10px] font-medium text-red-400 bg-red-400/10 rounded px-3 py-1 hover:bg-red-400/20" onClick={() => toast.success("Incident escalated")}>Escalate</button>
                                </div>
                              </div>
                            </GlassPanel>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ ALERT RULES ═══ */}
      {tab === "rules" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className="flex items-center gap-1.5 text-xs font-medium text-[#00D4FF] bg-[#00D4FF]/10 rounded-lg px-3 py-1.5 hover:bg-[#00D4FF]/20" onClick={() => toast.success("Alert rule created")}>
              <Plus className="size-3" /> Create Alert Rule
            </button>
          </div>
          <GlassPanel padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "Condition", "Notify Via", "Last Triggered", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALERT_RULES.map((rule) => (
                  <tr key={rule.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{rule.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{rule.metric} {rule.condition} {rule.threshold} for {rule.duration}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        {rule.channels.map((c) => (
                          <span key={c} className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono bg-muted/40 text-muted-foreground border border-border">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{rule.lastTriggered}</td>
                    <td className="px-4 py-2.5">
                      <Switch checked={rule.enabled} className="data-[state=checked]:bg-[#00D4FF]" onCheckedChange={() => toast.success(`Rule ${rule.enabled ? "paused" : "enabled"}`)} />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button className="text-muted-foreground hover:text-[#00D4FF]"><Pencil className="size-3" /></button>
                        <button className="text-muted-foreground hover:text-red-400"><Trash2 className="size-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        </div>
      )}

      {/* ═══ ON-CALL ═══ */}
      {tab === "oncall" && (
        <div className="space-y-6">
          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-4">This Week&apos;s Schedule</h3>
            <div className="grid grid-cols-7 gap-2">
              {ONCALL.map((slot, i) => {
                const isToday = (i + 1) % 7 === today;
                const color = AVATAR_COLORS[slot.person] || "#888";
                return (
                  <div key={slot.day} className={cn("rounded-lg p-3 text-center", isToday ? "bg-[#00D4FF]/[0.06] border border-[#00D4FF]/30" : "bg-muted/30")}>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">{slot.day}</p>
                    <div className="size-8 rounded-full mx-auto flex items-center justify-center text-[10px] font-bold mb-1" style={{ background: `${color}20`, color }}>
                      {slot.person.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <p className="text-[11px] text-foreground truncate">{slot.person.split(" ")[0]}</p>
                    {isToday && <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-bold mt-1 bg-[#00D4FF]/20 text-[#00D4FF]">ON-CALL</span>}
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          <GlassPanel padding="lg">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Shield className="size-4 text-[#00D4FF]" /> Escalation Policy</h3>
            <div className="space-y-2">
              {[
                { level: 1, action: "Notify assigned on-call", delay: "Immediately" },
                { level: 2, action: "Notify team lead (Sarah Chen)", delay: "After 15 min" },
                { level: 3, action: "Notify all admins", delay: "After 30 min" },
              ].map((esc) => (
                <div key={esc.level} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
                  <span className="font-mono text-xs text-[#00D4FF] w-6 shrink-0">L{esc.level}</span>
                  <span className="text-xs text-foreground flex-1">{esc.action}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{esc.delay}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ═══ HISTORY ═══ */}
      {tab === "history" && (
        <GlassPanel padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Title", "Severity", "Duration", "Resolved By", "MTTR", "Date"].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HISTORY.map((h, i) => {
                const sevBadge = SEV_BADGE[h.severity];
                return (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{h.title}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: sevBadge.bg, color: sevBadge.text }}>{h.severity}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{h.duration}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{h.resolvedBy}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{h.mttr}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{h.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassPanel>
      )}
    </div>
  );
}
