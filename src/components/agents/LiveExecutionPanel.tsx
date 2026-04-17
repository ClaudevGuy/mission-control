"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Square, RotateCcw, Zap, DollarSign, Clock, Bot, AlertTriangle, TrendingDown, User, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { invalidate } from "@/lib/store-cache";
import { useAgentsStore } from "@/stores/agents-store";
import { cn } from "@/lib/utils";

interface StreamInfo {
  model?: string;
  tier?: number | null;
  reason?: string;
  selectionMs?: number;
}

interface TurnStats {
  tokensIn: number;
  tokensOut: number;
  cost: number;
  tier1Cost?: number;
  duration: number;
  model: string;
  tier?: number | null;
  reason?: string;
}

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  stats?: TurnStats;
  error?: string;
  streaming?: boolean;
}

interface Props {
  agentId: string;
  agentName: string;
}

export function LiveExecutionPanel({ agentId }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveTokens, setLiveTokens] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [currentInfo, setCurrentInfo] = useState<StreamInfo | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Elapsed time timer during streaming
  useEffect(() => {
    if (isStreaming) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isStreaming]);

  const handleRun = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input.trim() };
    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantMsgId, role: "assistant", content: "", streaming: true };

    // Snapshot history up to this point — only completed, non-errored turns.
    const history = messages
      .filter((m) => !m.error && !m.streaming)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);
    setLiveTokens(0);
    setElapsedMs(0);
    setCurrentInfo(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: userMsg.content, history }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let infoForTurn: StreamInfo | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const json = trimmed.slice(6);
          try {
            const event = JSON.parse(json);
            if (event.type === "info") {
              infoForTurn = event;
              setCurrentInfo(event);
            } else if (event.type === "delta") {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantMsgId ? { ...m, content: m.content + event.content } : m
              ));
              setLiveTokens((prev) => prev + Math.ceil(event.content.length * 0.75));
            } else if (event.type === "done") {
              const stats: TurnStats = {
                tokensIn: event.tokensIn,
                tokensOut: event.tokensOut,
                cost: event.cost,
                tier1Cost: event.tier1Cost,
                duration: event.duration,
                model: event.model,
                tier: infoForTurn?.tier,
                reason: infoForTurn?.reason,
              };
              setMessages((prev) => prev.map((m) =>
                m.id === assistantMsgId ? { ...m, stats, streaming: false } : m
              ));
              invalidate("agents");
              invalidate("logs");
              invalidate("costs");
              invalidate("notifications");
              useAgentsStore.getState().fetch();
            } else if (event.type === "error") {
              setMessages((prev) => prev.map((m) =>
                m.id === assistantMsgId ? { ...m, error: event.message, streaming: false } : m
              ));
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      const message = (err as Error).name === "AbortError"
        ? "Stream interrupted by user"
        : (err as Error).message;
      setMessages((prev) => prev.map((m) =>
        m.id === assistantMsgId ? { ...m, error: message, streaming: false } : m
      ));
      invalidate("agents");
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [agentId, input, isStreaming, messages]);

  const handleStop = () => abortRef.current?.abort();

  const handleNewConversation = () => {
    if (isStreaming) abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setCurrentInfo(null);
  };

  const handleRetryLast = () => {
    // Find last user message and re-send it. Drop the failed assistant message.
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.filter((m, i, arr) => {
      // Drop the failed assistant message that came after the last user
      const nextIdx = arr.findIndex((x) => x === lastUser) + 1;
      return i !== nextIdx;
    }));
    setInput(lastUser.content);
    // Let user click Run again
  };

  const hasMessages = messages.length > 0;
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const hasError = Boolean(lastAssistant?.error);

  return (
    <div className="space-y-3">
      {/* Conversation header */}
      {hasMessages && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="font-mono">
              {messages.filter((m) => m.role === "user").length} turns in conversation
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleNewConversation}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            <MessageSquarePlus className="size-3 mr-1.5" />
            New conversation
          </Button>
        </div>
      )}

      {/* Messages — chat transcript */}
      {hasMessages && (
        <div
          ref={scrollRef}
          className={cn(
            "rounded-lg border bg-[#050507] p-4 max-h-[500px] overflow-y-auto space-y-4 transition-all duration-300",
            isStreaming
              ? "border-brand/40 shadow-[0_0_15px_rgb(var(--brand-rgb) / 0.08)]"
              : "border-[#3d3a39]"
          )}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      )}

      {/* Input panel */}
      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={hasMessages ? "Continue the conversation..." : "Enter a task for this agent..."}
          className="w-full rounded-lg border border-[#3d3a39] bg-[#050507] px-4 py-3 text-sm text-[#f2f2f2] font-mono placeholder:text-[#8b949e] resize-none focus:outline-none focus:border-brand/50"
          rows={3}
          disabled={isStreaming}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun();
          }}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isStreaming && (
              <span className="flex items-center gap-1.5 text-[10px] text-brand">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-brand" />
                </span>
                Running...
              </span>
            )}
            {currentInfo && isStreaming && (
              <>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {currentInfo.model}
                </Badge>
                {currentInfo.tier && (
                  <TierBadge tier={currentInfo.tier} />
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <div className="flex items-center gap-3 text-[10px] text-[#8b949e] font-mono mr-2">
                <span className="flex items-center gap-1">
                  <Clock className="size-2.5" />
                  {(elapsedMs / 1000).toFixed(1)}s
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="size-2.5" />
                  ~{liveTokens} tokens
                </span>
              </div>
            )}
            {isStreaming ? (
              <Button size="sm" variant="outline" onClick={handleStop} className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                <Square className="size-3 mr-1.5" /> Stop
              </Button>
            ) : (
              <>
                {hasError && (
                  <Button size="sm" variant="outline" onClick={handleRetryLast}>
                    <RotateCcw className="size-3 mr-1.5" /> Retry
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-brand text-primary-foreground hover:bg-brand/90"
                  onClick={handleRun}
                  disabled={!input.trim()}
                >
                  <Play className="size-3 mr-1.5" /> {hasMessages ? "Send" : "Run Agent"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 border border-brand/20">
          <Bot className="size-3.5 text-brand" />
        </div>
      )}
      <div className={cn("min-w-0 max-w-[85%] space-y-1.5", isUser && "items-end flex flex-col")}>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-[13px] font-mono whitespace-pre-wrap leading-relaxed",
            isUser
              ? "bg-brand/[0.06] border border-brand/20 text-foreground"
              : "bg-transparent text-[#f2f2f2]"
          )}
        >
          {message.content}
          {message.streaming && !message.content && (
            <span className="text-[#8b949e]">Waiting for response...</span>
          )}
          {message.streaming && (
            <span className="inline-block w-[2px] h-[14px] bg-brand ml-0.5 animate-pulse align-middle" />
          )}
          {message.error && (
            <div className="flex items-start gap-2 mt-2 text-red-400 text-[12px]">
              <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
              <span>Error: {message.error}</span>
            </div>
          )}
        </div>
        {!isUser && message.stats && <StatsRow stats={message.stats} />}
      </div>
      {isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/40 border border-border">
          <User className="size-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function StatsRow({ stats }: { stats: TurnStats }) {
  const savings = stats.tier1Cost && stats.tier1Cost > stats.cost
    ? Math.round((stats.tier1Cost - stats.cost) * 10000) / 10000
    : null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#8b949e] font-mono px-1">
      <span className="flex items-center gap-1">
        <Clock className="size-2.5" />
        {(stats.duration / 1000).toFixed(1)}s
      </span>
      <span className="flex items-center gap-1">
        <Zap className="size-2.5" />
        {stats.tokensIn.toLocaleString()} in / {stats.tokensOut.toLocaleString()} out
      </span>
      <span className="flex items-center gap-1">
        <DollarSign className="size-2.5" />
        ${stats.cost.toFixed(4)}
      </span>
      {savings !== null && savings > 0 && (
        <span className="flex items-center gap-1 text-brand">
          <TrendingDown className="size-2.5" />
          Saved ${savings.toFixed(4)}
        </span>
      )}
      {stats.tier && <TierBadge tier={stats.tier} small />}
    </div>
  );
}

function TierBadge({ tier, small }: { tier: number; small?: boolean }) {
  const color = tier === 1 ? "bg-purple-500/15 text-purple-400" :
                tier === 2 ? "bg-brand/15 text-brand" :
                "bg-green-500/15 text-green-400";
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 font-bold",
      small ? "text-[8px]" : "text-[9px]",
      color
    )}>
      T{tier}
    </span>
  );
}
