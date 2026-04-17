"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const MODEL_DOT_COLORS: Record<string, string> = {
  Claude: "#CC785C",
  "GPT-4": "#10A37F",
  Gemini: "#4285F4",
  Custom: "#F59E0B",
};

export function AgentNode({ data, selected }: NodeProps) {
  const agentName = (data?.agentName as string) || "Agent";
  const model = (data?.model as string) || "";
  const modelColor = MODEL_DOT_COLORS[model] || "#888";

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border min-w-[180px] transition-all",
        selected
          ? "border-brand/50 bg-card shadow-[0_0_16px_rgb(var(--brand-rgb) / 0.15)]"
          : "border-border bg-card hover:border-border/80"
      )}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !rounded-full !border-2 !border-white/20 !bg-white/10 hover:!bg-brand hover:!border-brand transition-colors"
      />

      {/* Content */}
      <div className="px-3.5 py-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <Bot className="size-3.5 text-brand/70" strokeWidth={1.8} />
          <span className="text-[13px] font-medium text-foreground truncate">{agentName}</span>
        </div>
        {model && (
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: modelColor }} />
            <span className="text-[10px] text-muted-foreground">{model}</span>
          </div>
        )}
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !rounded-full !border-2 !border-white/20 !bg-white/10 hover:!bg-brand hover:!border-brand transition-colors"
      />
    </div>
  );
}
