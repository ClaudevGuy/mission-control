"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Square, RotateCcw, Zap, DollarSign, Clock, Bot, AlertTriangle } from "lucide-react";
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

interface StreamDone {
  tokensIn: number;
  tokensOut: number;
  cost: number;
  duration: number;
  model: string;
}

interface Props {
  agentId: string;
  agentName: string;
}

export function LiveExecutionPanel({ agentId }: Props) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<StreamInfo | null>(null);
  const [stats, setStats] = useState<StreamDone | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleRun = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    setIsStreaming(true);
    setOutput("");
    setError(null);
    setInfo(null);
    setStats(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
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
              setInfo(event);
            } else if (event.type === "delta") {
              setOutput((prev) => prev + event.content);
            } else if (event.type === "done") {
              setStats(event);
              // Invalidate all dependent stores so next visit refetches
              invalidate("agents");
              invalidate("logs");
              invalidate("costs");
              invalidate("notifications");
              // Refetch agents store immediately to update this page's data
              useAgentsStore.getState().fetch();
            } else if (event.type === "error") {
              setError(event.message);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setError("Stream interrupted by user");
      } else {
        setError((err as Error).message);
      }
      // Invalidate agents store on error too (status changed in DB)
      invalidate("agents");
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [agentId, input, isStreaming]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleRetry = () => {
    setError(null);
    handleRun();
  };

  const tierLabel = info?.tier ? `T${info.tier}` : null;
  const tierColor = info?.tier === 1 ? "bg-purple-500/15 text-purple-400" :
                    info?.tier === 2 ? "bg-[#00d992]/15 text-[#00d992]" :
                    info?.tier === 3 ? "bg-green-500/15 text-green-400" : "";

  return (
    <div className="space-y-3">
      {/* Input panel */}
      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a task for this agent..."
          className="w-full rounded-lg border border-[#3d3a39] bg-[#050507] px-4 py-3 text-sm text-[#f2f2f2] font-mono placeholder:text-[#8b949e] resize-none focus:outline-none focus:border-[#00d992]/50"
          rows={3}
          disabled={isStreaming}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun();
          }}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {info && (
              <>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {info.model}
                </Badge>
                {tierLabel && (
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold", tierColor)}>
                    {tierLabel}
                  </span>
                )}
                {info.reason && (
                  <span className="text-[10px] text-[#8b949e] truncate max-w-[300px]">{info.reason}</span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <Button size="sm" variant="outline" onClick={handleStop} className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                <Square className="size-3 mr-1.5" /> Stop
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-[#00d992] text-black hover:bg-[#00d992]/90"
                onClick={handleRun}
                disabled={!input.trim()}
              >
                <Play className="size-3 mr-1.5" /> Run Agent
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Terminal output */}
      {(output || error || isStreaming) && (
        <div
          ref={outputRef}
          className="rounded-lg border border-[#3d3a39] bg-[#050507] p-4 font-mono text-[13px] text-[#f2f2f2] min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed"
        >
          {output}
          {isStreaming && !output && !error && (
            <span className="text-[#8b949e]">Waiting for response...</span>
          )}
          {isStreaming && (
            <span className="inline-block w-[2px] h-[14px] bg-[#00d992] ml-0.5 animate-pulse" />
          )}
          {error && (
            <div className="flex items-start gap-2 mt-2 text-red-400">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>Error: {error}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="flex items-center gap-4 rounded-lg border border-[#3d3a39] bg-[#050507] px-4 py-2.5 text-[11px] text-[#8b949e]">
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Completed in {(stats.duration / 1000).toFixed(1)}s
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Zap className="size-3" />
            {stats.tokensIn.toLocaleString()} in / {stats.tokensOut.toLocaleString()} out
          </span>
          <span className="flex items-center gap-1 font-mono">
            <DollarSign className="size-3" />
            ${stats.cost.toFixed(4)}
          </span>
          <span className="flex items-center gap-1">
            <Bot className="size-3" />
            {stats.model}
          </span>
        </div>
      )}

      {/* Retry on error */}
      {error && !isStreaming && (
        <Button size="sm" variant="outline" onClick={handleRetry}>
          <RotateCcw className="size-3 mr-1.5" /> Retry
        </Button>
      )}
    </div>
  );
}
