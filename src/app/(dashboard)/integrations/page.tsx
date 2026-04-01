"use client";

import React, { useState, useEffect } from "react";
import { useIntegrationsStore } from "@/stores/integrations-store";
import { PageHeader, GlassPanel } from "@/components/shared";
import { Switch } from "@/components/ui/switch";
import { ConnectModal } from "@/components/integrations/ConnectModal";
import {
  Search, GitBranch, MessageSquare, Cloud, Cpu, Brain, BarChart3, AlertTriangle as SentryIcon,
  CreditCard, Webhook, Plus, Bug, Boxes, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Integration } from "@/types/integrations";

type IntStatus = "connected" | "disconnected" | "error";

const ICON_MAP: Record<string, { icon: typeof GitBranch; color: string }> = {
  github: { icon: GitBranch, color: "#ffffff" },
  slack: { icon: MessageSquare, color: "#E01E5A" },
  vercel: { icon: Boxes, color: "#ffffff" },
  aws: { icon: Cloud, color: "#FF9900" },
  openai: { icon: Brain, color: "#10A37F" },
  anthropic: { icon: Zap, color: "#CC785C" },
  datadog: { icon: BarChart3, color: "#632CA6" },
  pagerduty: { icon: Cpu, color: "#06AC38" },
  jira: { icon: Bug, color: "#0052CC" },
  linear: { icon: Boxes, color: "#5E6AD2" },
  sentry: { icon: SentryIcon, color: "#362D59" },
  stripe: { icon: CreditCard, color: "#635BFF" },
  posthog: { icon: BarChart3, color: "#F9BD2B" },
};

const STATS: Record<string, string> = {
  GitHub: "23 open PRs \u00b7 4 repos",
  Slack: "3 channels connected",
  Vercel: "7 deployments today",
  AWS: "12 services monitored",
  OpenAI: "12,847 calls \u00b7 $34.20",
  Anthropic: "28,392 calls \u00b7 $67.80",
  Datadog: "847 metrics/min",
  Sentry: "3 unresolved errors",
  Linear: "12 open issues",
};

const FILTERS = ["All", "Connected", "Disconnected", "AI", "DevOps", "Monitoring", "Automation", "Payment"];

const CATEGORY_MAP: Record<string, string> = {
  source_control: "DevOps", deployment: "DevOps", ai: "AI",
  monitoring: "Monitoring", communication: "DevOps", automation: "Automation", payment: "Payment",
};

function formatTimeShort(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function IntegrationsPage() {
  const { integrations, webhooks, fetch: fetchIntegrations } = useIntegrationsStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  // Connect modal state
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectTarget, setConnectTarget] = useState<{ name: string; icon: string } | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchIntegrations(); }, []);

  // Add PostHog as error state
  const allIntegrations: (Integration & { effectiveStatus?: IntStatus })[] = [
    ...integrations,
    { id: "int_013", name: "PostHog", description: "Product analytics and session replay", icon: "posthog", status: "error" as IntStatus, category: "monitoring" },
  ];

  const connected = allIntegrations.filter((i) => i.status === "connected").length;
  const disconnected = allIntegrations.filter((i) => i.status === "disconnected").length;
  const errors = allIntegrations.filter((i) => i.status === "error").length;

  const filtered = allIntegrations.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "Connected") return i.status === "connected";
    if (filter === "Disconnected") return i.status === "disconnected";
    if (filter !== "All") return CATEGORY_MAP[i.category] === filter;
    return true;
  });

  const handleConnect = (name: string, icon: string) => {
    setConnectTarget({ name, icon });
    setConnectModalOpen(true);
  };

  const handleDisconnect = async (integ: Integration) => {
    try {
      const res = await fetch(`/api/integrations/${integ.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast.success(`${integ.name} disconnected`);
      fetchIntegrations();
    } catch {
      toast.error(`Failed to disconnect ${integ.name}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Integrations" description="Connect tools, APIs, and services to your workspace" />

      {/* Summary stats */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          <span className="text-green-400 font-medium">{connected} connected</span>
          {" \u00b7 "}
          <span className="text-foreground/60">{disconnected} disconnected</span>
          {errors > 0 && <>{" \u00b7 "}<span className="text-red-400 font-medium">{errors} error</span></>}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-muted/40 max-w-[200px]">
          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${(connected / allIntegrations.length) * 100}%` }} />
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="h-8 w-full rounded-lg border border-border bg-muted/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === f ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((integ) => {
          const iconInfo = ICON_MAP[integ.icon] || { icon: Boxes, color: "#888" };
          const Icon = iconInfo.icon;
          const stat = STATS[integ.name];
          const isConnected = integ.status === "connected";
          const isError = integ.status === "error";

          return (
            <GlassPanel
              key={integ.id}
              padding="md"
              hover
              className={cn(
                "h-[140px] flex flex-col justify-between",
                isError && "border-l-[3px] border-l-[#EF4444]"
              )}
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: `${iconInfo.color}15` }}>
                    <Icon className="size-4" style={{ color: iconInfo.color }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{integ.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "relative flex size-2",
                    isConnected && "text-green-400",
                  )}>
                    {isConnected && <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />}
                    <span className={cn("relative size-2 rounded-full", isConnected ? "bg-green-400" : isError ? "bg-red-400" : "bg-[#555]")} />
                  </span>
                  <span className={cn("text-[10px] font-medium", isConnected ? "text-green-400" : isError ? "text-red-400" : "text-muted-foreground")}>
                    {isConnected ? "Connected" : isError ? "Error" : "Disconnected"}
                  </span>
                </div>
              </div>

              {/* Middle */}
              <div className="flex-1 mt-2">
                <p className="text-[13px] text-muted-foreground line-clamp-1">{integ.description}</p>
                {isConnected && integ.lastSync && (
                  <p className="font-mono text-[11px] text-[#00D4FF] mt-1" suppressHydrationWarning>Last sync: {formatTimeShort(integ.lastSync)}</p>
                )}
                {isConnected && stat && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{stat}</p>
                )}
                {isError && (
                  <p className="text-[11px] text-red-400 mt-1">Authentication expired — Reconnect</p>
                )}
              </div>

              {/* Bottom */}
              <div className="flex justify-end mt-1">
                {isConnected && (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                    onClick={() => handleDisconnect(integ)}
                  >
                    Disconnect
                  </button>
                )}
                {integ.status === "disconnected" && (
                  <button
                    className="text-[10px] font-medium text-primary-foreground bg-[#00D4FF] rounded px-3 py-1 hover:bg-[#00D4FF]/80 transition-colors"
                    onClick={() => handleConnect(integ.name, integ.icon)}
                  >
                    Connect
                  </button>
                )}
                {isError && (
                  <button
                    className="text-[10px] font-medium text-amber-400 bg-amber-400/10 rounded px-3 py-1 hover:bg-amber-400/20 transition-colors"
                    onClick={() => handleConnect(integ.name, integ.icon)}
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </GlassPanel>
          );
        })}
      </div>

      {/* ═══ WEBHOOKS ═══ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Webhook className="size-4 text-[#00D4FF]" />
            Webhooks
          </h2>
          <button className="flex items-center gap-1.5 text-xs font-medium text-[#00D4FF] hover:underline" onClick={() => toast.success("Webhook created")}>
            <Plus className="size-3" /> Add Webhook
          </button>
        </div>

        <GlassPanel padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Endpoint", "Events", "Last Triggered", "Success Rate", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {webhooks.map((wh) => (
                <tr key={wh.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {wh.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}/•••
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {wh.events.slice(0, 2).map((e) => (
                        <span key={e} className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono bg-muted/40 text-muted-foreground border border-border">
                          {e}
                        </span>
                      ))}
                      {wh.events.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">+{wh.events.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono" suppressHydrationWarning>
                    {wh.lastDelivery ? formatTimeShort(wh.lastDelivery) : "Never"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("font-mono text-xs", wh.successRate >= 95 ? "text-green-400" : wh.successRate >= 80 ? "text-amber-400" : "text-red-400")}>
                      {wh.successRate}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Switch
                      checked={wh.status === "active"}
                      onCheckedChange={() => toast.success(`Webhook ${wh.status === "active" ? "paused" : "activated"}`)}
                      className="data-[state=checked]:bg-[#00D4FF]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassPanel>
      </div>

      {/* Connect Modal */}
      {connectTarget && (
        <ConnectModal
          integrationName={connectTarget.name}
          integrationIcon={connectTarget.icon}
          isOpen={connectModalOpen}
          onClose={() => {
            setConnectModalOpen(false);
            setConnectTarget(null);
          }}
          onConnected={() => fetchIntegrations()}
        />
      )}
    </div>
  );
}
