"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional eyebrow above the title. Defaults to the title uppercased. */
  eyebrow?: string;
  /** Optional ornamental glyph rendered between the hairlines in the eyebrow row. */
  ornament?: string;
  /** Show live timestamp in the right-side meta row. */
  showTimestamp?: boolean;
  /** Additional meta entries for the right-side row. */
  meta?: Array<{ label: string; value?: string; dot?: string }>;
  /** Action buttons on the right. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Editorial page header — publication-style mast.
 *
 * Layout:
 *   ── EYEBROW · META ────────────────────────────────── LIVE TIMESTAMP ──
 *   Display-serif title
 *   Italic serif subtitle                                        [actions]
 *   ──────────────────────────────────────────────────────────────────────
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  ornament = "❦",
  showTimestamp = true,
  meta,
  children,
  className,
}: PageHeaderProps) {
  const [now, setNow] = useState<string>("");

  useEffect(() => {
    if (!showTimestamp) return;
    const fmt = () =>
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 30_000);
    return () => clearInterval(id);
  }, [showTimestamp]);

  const eyebrowText = eyebrow ?? title;

  return (
    <header className={cn("relative", className)}>
      {/* Top meta row — eyebrow left, timestamp right */}
      <div className="flex items-center justify-between gap-4 pb-5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-px w-6 shrink-0" style={{ background: "rgb(var(--ink-rgb) / 0.25)" }} />
          <span className="font-heading italic text-[13px] leading-none text-muted-foreground/60 select-none shrink-0">
            {ornament}
          </span>
          <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-muted-foreground/80 truncate">
            {eyebrowText}
          </span>
          {meta && meta.length > 0 && (
            <>
              <span className="h-3 w-px bg-border/50 shrink-0" />
              <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 min-w-0">
                {meta.map((m, i) => (
                  <span key={i} className="flex items-center gap-1.5 truncate">
                    {m.dot && (
                      <span
                        className="size-1 rounded-full shrink-0"
                        style={{ background: m.dot, boxShadow: `0 0 4px ${m.dot}` }}
                      />
                    )}
                    <span>{m.label}</span>
                    {m.value && <span className="text-foreground/70">{m.value}</span>}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {showTimestamp && (
          <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 shrink-0">
            <span className="relative flex size-1.5">
              <span
                className="absolute inline-flex size-full rounded-full opacity-60 animate-ping"
                style={{ background: "#00d992", animationDuration: "2.4s" }}
              />
              <span
                className="relative inline-flex size-1.5 rounded-full"
                style={{ background: "#00d992", boxShadow: "0 0 6px #00d992" }}
              />
            </span>
            <span>Live</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="tabular-nums text-muted-foreground/75" suppressHydrationWarning>{now}</span>
          </div>
        )}
      </div>

      {/* Title + description + actions */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h1 className="font-serif text-[40px] sm:text-[48px] leading-[1.02] tracking-[-0.025em] text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-3 font-serif italic text-[15px] sm:text-[16px] leading-[1.4] text-muted-foreground max-w-[52ch]">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>
        )}
      </div>

      {/* Bottom rule — layered hairline for depth */}
      <div className="mt-6 relative h-px">
        <span className="absolute inset-0" style={{ background: "rgb(var(--ink-rgb) / 0.08)" }} />
        <span
          className="absolute left-0 top-0 h-px w-20"
          style={{
            background: "linear-gradient(90deg, rgb(var(--brand-rgb)) 0%, rgb(var(--brand-rgb) / 0.2) 70%, transparent 100%)",
          }}
        />
      </div>
    </header>
  );
}
