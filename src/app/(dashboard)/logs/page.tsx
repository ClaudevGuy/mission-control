"use client";

import React, { useState, useEffect } from "react";
import { useLogsStore } from "@/stores/logs-store";
import { useLogStream } from "@/lib/hooks/use-log-stream";
import {
  PageHeader,
  LiveIndicator,
  GlassPanel,
  StatusBadge,
  MetricCard,
  CodeBlock,
  SparklineChart,
  ModelBadge,
} from "@/components/shared";
import { Search, Pause, Play, Trash2, Download, Copy, Zap, DollarSign, Clock, AlertTriangle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import type { LogLevel } from "@/types/common";

const LEVEL_STYLES: Record<string, { bg: string; text: string; rowBg: string }> = {
  debug: { bg: "rgba(255,255,255,0.05)", text: "#888", rowBg: "" },
  info: { bg: "rgba(0,217,146,0.1)", text: "#00d992", rowBg: "" },
  warn: { bg: "rgba(245,158,11,0.1)", text: "#F59E0B", rowBg: "bg-[#F59E0B]/[0.03]" },
  error: { bg: "rgba(239,68,68,0.1)", text: "#EF4444", rowBg: "bg-[#EF4444]/[0.03]" },
};

const SERVICES: string[] = [];

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function LogsPage() {
  const [tab, setTab] = useState<"stream" | "errors" | "llm" | "traces">("stream");
  const {
    getFilteredLogs, errorGroups, llmCalls, traceSpans,
    levelFilter, serviceFilter, searchQuery, isLive,
    setLevelFilter, setServiceFilter, setSearchQuery, setIsLive,
    fetch: fetchLogs,
  } = useLogsStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(); }, []);

  // Live log stream via SSE
  const { entries: streamEntries } = useLogStream(isLive);

  // Merge streamed entries into the store
  useEffect(() => {
    if (streamEntries.length > 0) {
      const store = useLogsStore.getState();
      for (const entry of streamEntries) {
        store.addLog(entry);
      }
    }
  }, [streamEntries]);

  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [expandedLLM, setExpandedLLM] = useState<string | null>(null);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

  const logs = getFilteredLogs();

  // usePolling removed — was an empty callback only used for live indicator

  const tabs = [
    { id: "stream" as const, label: "Log Stream" },
    { id: "errors" as const, label: "Errors" },
    { id: "llm" as const, label: "LLM Calls" },
    { id: "traces" as const, label: "Traces" },
  ];

  // LLM stats — computed from real data
  const totalLLMCalls = llmCalls.length;
  const totalTokens = llmCalls.reduce((sum, c) => sum + c.tokensIn + c.tokensOut, 0);
  const totalLLMCost = llmCalls.reduce((sum, c) => sum + c.cost, 0);
  const avgLatency = llmCalls.length > 0 ? Math.round(llmCalls.reduce((sum, c) => sum + c.latency, 0) / llmCalls.length) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Logs & Observability" description="Unified log stream, error tracking, and AI call inspection">
        <LiveIndicator />
      </PageHeader>

      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("pb-2.5 text-sm font-medium transition-colors relative", tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70")}>
              {t.label}
              {t.id === "errors" && <span className="ml-1.5 text-[10px] font-mono text-red-400">{errorGroups.length}</span>}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00d992]" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ LOG STREAM ═══ */}
      {tab === "stream" && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as LogLevel | "all")}
              className="h-8 rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none"
            >
              <option value="all">All Levels</option>
              <option value="debug">DEBUG</option>
              <option value="info">INFO</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none"
            >
              <option value="">All Services</option>
              {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="h-8 w-full rounded-lg border border-border bg-muted/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="flex items-center gap-1.5 text-xs font-mono text-green-400">
                <span className="relative flex size-1.5"><span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-40" /><span className="relative size-1.5 rounded-full bg-green-400" /></span>
                142/min
              </span>
              <button
                onClick={() => setIsLive(!isLive)}
                className={cn("h-8 px-3 rounded-lg text-xs font-medium transition-colors", isLive ? "bg-amber-400/10 text-amber-400 hover:bg-amber-400/20" : "bg-green-400/10 text-green-400 hover:bg-green-400/20")}
              >
                {isLive ? <><Pause className="size-3 inline mr-1" />Pause</> : <><Play className="size-3 inline mr-1" />Resume</>}
              </button>
              <button onClick={() => toast.success("Logs cleared")} className="h-8 px-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/40"><Trash2 className="size-3" /></button>
              <button onClick={() => toast.success("Logs exported")} className="h-8 px-2 rounded-lg text-xs text-muted-foreground hover:bg-muted/40"><Download className="size-3" /></button>
            </div>
          </div>

          {/* Log rows */}
          <GlassPanel padding="none">
            <div className="max-h-[560px] overflow-y-auto">
              {logs.map((log) => {
                const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.debug;
                const isExpanded = expandedLog === log.id;
                return (
                  <div key={log.id}>
                    <div
                      className={cn("group flex items-center gap-3 px-4 py-1.5 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors", style.rowBg)}
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      <span className="inline-flex items-center justify-center rounded text-[10px] font-mono font-bold w-[52px] h-5 shrink-0" style={{ background: style.bg, color: style.text }}>
                        {log.level.toUpperCase()}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0 w-[72px]" suppressHydrationWarning>{formatTime(log.timestamp)}</span>
                      <span className="text-[10px] font-mono text-[#00d992]/60 shrink-0 w-[130px] truncate">{log.service}</span>
                      <span className="text-xs text-foreground/80 flex-1 truncate">{log.message}</span>
                      <Copy className="size-3 text-transparent group-hover:text-muted-foreground/30 shrink-0 transition-colors" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(log.message); toast.success("Copied"); }} />
                    </div>
                    {isExpanded && (
                      <div className="px-4 py-3 border-b border-border bg-muted/20 space-y-2">
                        <p className="text-xs text-foreground">{log.message}</p>
                        {log.metadata && (
                          <pre className="text-[11px] font-mono text-muted-foreground bg-muted/30 rounded p-2">{JSON.stringify(log.metadata, null, 2)}</pre>
                        )}
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                          {log.traceId && <span className="font-mono text-[#00d992] cursor-pointer hover:underline">Trace: {log.traceId}</span>}
                          {log.userId && <span>User: {log.userId}</span>}
                          {log.agentId && <span>Agent: {log.agentId}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
              <span>{logs.length} logs shown</span>
              <button className="text-[#00d992] hover:underline" onClick={() => toast.success("Loading more logs...")}>Load more</button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ═══ ERRORS ═══ */}
      {tab === "errors" && (
        <div className="space-y-3">
          {errorGroups.map((eg) => {
            const isExp = expandedError === eg.id;
            return (
              <GlassPanel key={eg.id} padding="none" className={isExp ? "border-l-[3px] border-l-[#EF4444]" : ""}>
                <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedError(isExp ? null : eg.id)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{eg.message}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="font-mono text-[#00d992]/60">{eg.service}</span>
                      <span>First: <span className="font-mono" suppressHydrationWarning>{formatTime(eg.firstSeen)}</span></span>
                      <span>Last: <span className="font-mono" suppressHydrationWarning>{formatTime(eg.lastSeen)}</span></span>
                      <span>{eg.affectedUsers} users</span>
                    </div>
                  </div>
                  <SparklineChart data={Array.from({ length: 12 }, () => Math.round(eg.count / 12 + (Math.random() - 0.5) * eg.count / 6))} color="#EF4444" width={60} height={20} />
                  <span className="font-mono text-lg font-bold text-[#EF4444] shrink-0">{eg.count}</span>
                  <StatusBadge status="open" size="sm" />
                </div>
                {isExp && (
                  <div className="px-4 py-3 border-t border-border">
                    <CodeBlock code={eg.stackTrace} language="text" maxHeight={200} />
                  </div>
                )}
              </GlassPanel>
            );
          })}
        </div>
      )}

      {/* ═══ LLM CALLS ═══ */}
      {tab === "llm" && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard label="Calls Today" value={totalLLMCalls} format="number" icon={Zap} color="#00d992" />
            <MetricCard label="Total Tokens" value={totalTokens} format="tokens" icon={Zap} color="#A855F7" />
            <MetricCard label="Total Cost" value={totalLLMCost} format="currency" icon={DollarSign} color="#F59E0B" />
            <MetricCard label="Avg Latency" value={avgLatency} format="number" icon={Clock} color="#00d992" />
            <MetricCard label="Error Rate" value={errorGroups.length > 0 && totalLLMCalls > 0 ? (errorGroups.length / totalLLMCalls) * 100 : 0} format="percent" icon={AlertTriangle} color="#EF4444" />
          </div>

          {/* LLM calls table */}
          <GlassPanel padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Time", "Model", "Tier", "Provider", "Tokens In", "Tokens Out", "Latency", "Cost", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {llmCalls.map((call) => (
                  <React.Fragment key={call.id}>
                    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setExpandedLLM(expandedLLM === call.id ? null : call.id)}>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground" suppressHydrationWarning>{formatTime(call.timestamp)}</td>
                      <td className="px-4 py-2.5"><ModelBadge model={call.agentName === "InfraMonitor" ? "Custom" : call.model.includes("claude") ? "Claude" : call.model.includes("gpt") ? "GPT-4" : "Gemini"} size="sm" /></td>
                      <td className="px-3 py-2">
                        {call.selectedTier ? (
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold",
                            call.selectedTier === 1 ? "bg-purple-500/15 text-purple-400" :
                            call.selectedTier === 2 ? "bg-[#00d992]/15 text-[#00d992]" :
                            "bg-green-500/15 text-green-400"
                          )}>
                            T{call.selectedTier}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">{call.model}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{call.tokensIn.toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{call.tokensOut.toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-mono text-xs"><span className={call.latency > 5000 ? "text-amber-400" : "text-muted-foreground"}>{call.latency.toLocaleString()}ms</span></td>
                      <td className="px-4 py-2.5 font-mono text-xs">{formatCurrency(call.cost)}</td>
                      <td className="px-4 py-2.5"><button className="text-[10px] text-[#00d992] hover:underline">View</button></td>
                    </tr>
                    {expandedLLM === call.id && (
                      <tr className="border-b border-border">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="space-y-3">
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prompt</span>
                              <div className="mt-1 bg-muted/30 rounded-lg p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{call.prompt}</div>
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Response</span>
                              <div className="mt-1 bg-muted/30 rounded-lg p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap max-h-[200px] overflow-y-auto">{call.response}</div>
                            </div>
                            <div className="flex items-center gap-6 text-[10px] text-muted-foreground pt-2 border-t border-border">
                              <span>Agent: <span className="text-foreground">{call.agentName}</span></span>
                              <span>Tokens: <span className="font-mono text-foreground">{(call.tokensIn + call.tokensOut).toLocaleString()}</span></span>
                              <span>Cost: <span className="font-mono text-foreground">{formatCurrency(call.cost)}</span></span>
                            </div>
                            {call.selectionReason && (
                              <div className="flex items-center gap-2 text-[10px]">
                                <span className="text-muted-foreground">Selection:</span>
                                <span className="font-mono text-foreground/70">{call.selectionReason}</span>
                                {call.selectionDurationMs != null && (
                                  <span className="text-muted-foreground/50">[{call.selectionDurationMs}ms]</span>
                                )}
                              </div>
                            )}
                            {call.wasUpgraded && (
                              <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                                <span>↑ Upgraded from T{call.originalTier} → T{call.selectedTier} after failed attempt</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        </div>
      )}

      {/* ═══ TRACES ═══ */}
      {tab === "traces" && (
        <div className="space-y-3">
          {traceSpans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-border bg-card/50">
              <Activity className="size-8 text-muted-foreground/20" />
              <p className="text-sm font-medium text-muted-foreground">No traces yet</p>
              <p className="text-xs text-muted-foreground/50">Trace data will appear as agents process requests</p>
            </div>
          ) : (
          Array.from(new Set(traceSpans.map((s) => s.traceId))).map((traceId) => {
            const spans = traceSpans.filter((s) => s.traceId === traceId);
            const root = spans[0];
            if (!root) return null;
            const totalDuration = spans.length > 0 ? Math.max(...spans.map((s) => s.start + s.duration)) : 0;
            const isExp = expandedTrace === traceId;
            const hasError = spans.some((s) => s.status === "error");

            const SVC_COLORS: Record<string, string> = {
              "api-gateway": "#00d992", "auth-service": "#10A37F", "cache-service": "#F59E0B",
              "search-service": "#4285F4", "worker-service": "#A855F7", "database": "#EC4899",
              "analytics-service": "#39FF14",
            };

            // Nesting depth: root=0, others=1, except some get depth 2
            const getDepth = (i: number) => {
              if (i === 0) return 0;
              return 1;
            };

            return (
              <GlassPanel key={traceId} padding="none" className={hasError ? "border-l-[3px] border-l-[#EF4444]" : ""}>
                <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedTrace(isExp ? null : traceId)}>
                  <span className="font-mono text-xs text-[#00d992] shrink-0">{traceId}</span>
                  <span className="text-xs text-foreground flex-1 truncate">{root?.name}</span>
                  <span className="text-[10px] text-muted-foreground">{spans.length} spans</span>
                  <span className="font-mono text-xs text-foreground">{totalDuration}ms</span>
                  <StatusBadge status={hasError ? "error" : "success"} size="sm" />
                </div>
                {isExp && (
                  <div className="px-4 py-3 border-t border-border space-y-1.5">
                    {/* Timeline header */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-[130px] shrink-0" />
                      <div className="flex-1 flex justify-between text-[9px] font-mono text-muted-foreground">
                        <span>0ms</span>
                        <span>{Math.round(totalDuration / 4)}ms</span>
                        <span>{Math.round(totalDuration / 2)}ms</span>
                        <span>{Math.round(totalDuration * 3 / 4)}ms</span>
                        <span>{totalDuration}ms</span>
                      </div>
                    </div>
                    {spans.map((span, i) => {
                      const color = SVC_COLORS[span.service] || "#888";
                      const leftPct = (span.start / totalDuration) * 100;
                      const widthPct = Math.max((span.duration / totalDuration) * 100, 1);
                      const depth = getDepth(i);

                      return (
                        <div key={span.id} className="flex items-center gap-3" style={{ paddingLeft: `${depth * 16}px` }}>
                          {depth > 0 && <span className="text-muted-foreground/20 text-xs shrink-0">└─</span>}
                          <span className="text-[10px] font-mono shrink-0 truncate" style={{ width: depth > 0 ? 110 : 130, color: `${color}cc` }}>
                            {span.service}
                          </span>
                          <div className="flex-1 h-7 rounded bg-muted/30 relative">
                            <div
                              className="absolute inset-y-1 rounded flex items-center px-2 min-w-[40px]"
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                background: span.status === "error" ? "rgba(239,68,68,0.2)" : `${color}20`,
                                borderLeft: `2px solid ${span.status === "error" ? "#EF4444" : color}`,
                              }}
                            >
                              <span className="font-mono text-[10px] whitespace-nowrap" style={{ color: span.status === "error" ? "#EF4444" : color }}>
                                {span.duration}ms
                              </span>
                            </div>
                          </div>
                          {span.status === "error" && <span className="text-[9px] text-red-400 font-mono shrink-0">ERROR</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassPanel>
            );
          })
          )}
        </div>
      )}
    </div>
  );
}
