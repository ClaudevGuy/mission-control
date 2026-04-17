import React from "react";
import { cn } from "@/lib/utils";

interface ModelBadgeProps {
  model: string;
  size?: "sm" | "md";
  className?: string;
}

interface ModelStyle {
  bg: string;
  border: string;
  text: string;
}

const MODEL_STYLES: Record<string, ModelStyle> = {
  claude: {
    bg: "rgba(204,120,92,0.12)",
    border: "rgba(204,120,92,0.38)",
    text: "#CC785C",
  },
  "gpt-4": {
    bg: "rgba(16,163,127,0.12)",
    border: "rgba(16,163,127,0.38)",
    text: "#10A37F",
  },
  gemini: {
    bg: "rgba(66,133,244,0.12)",
    border: "rgba(66,133,244,0.38)",
    text: "#4285F4",
  },
  custom: {
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.38)",
    text: "#A855F7",
  },
  grok: {
    bg: "rgb(var(--ink-rgb) / 0.08)",
    border: "rgb(var(--ink-rgb) / 0.18)",
    text: "#ffffff",
  },
};

const DEFAULT_STYLE: ModelStyle = {
  bg: "rgb(var(--ink-rgb) / 0.05)",
  border: "rgb(var(--ink-rgb) / 0.15)",
  text: "#aaaaaa",
};

export function ModelBadge({ model, size = "md", className }: ModelBadgeProps) {
  const key = model.toLowerCase();
  const s = MODEL_STYLES[key] ?? DEFAULT_STYLE;

  const height = size === "sm" ? 20 : 24;
  const fontSize = size === "sm" ? 10 : 12;
  const px = size === "sm" ? 7 : 10;

  return (
    <span
      className={cn("inline-flex items-center shrink-0", className)}
      style={{
        height,
        padding: `0 ${px}px`,
        borderRadius: 6,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        fontSize,
        fontWeight: 500,
        lineHeight: 1,
        fontFamily: "var(--font-sans), Inter, sans-serif",
      }}
    >
      {model}
    </span>
  );
}
