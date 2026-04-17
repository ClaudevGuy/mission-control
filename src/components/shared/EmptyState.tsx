"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Editorial empty-state — shown on list pages when there's no data yet.
 *
 * Renders a framed card with a fleuron/icon ornament between two hairlines,
 * an italic serif title (Fraunces), a short sans caption, and one or two
 * CTAs (cream primary, bordered secondary). Matches the Mothership
 * publication aesthetic — brand-consistent with the landing and the
 * tutorial walkthrough.
 *
 * Basic use:
 *   <EmptyState
 *     title="No agents yet"
 *     description="Deploy your first agent to start monitoring runs and costs."
 *     ctaLabel="Create an agent"
 *     ctaHref="/agents/builder"
 *   />
 *
 * Inline (no frame), inside a card:
 *   <EmptyState framed={false} title="No logs" description="…" />
 *
 * With a small icon ornament instead of a fleuron:
 *   <EmptyState icon={Bot} title="No agents yet" … />
 *
 * Legacy action prop still supported:
 *   <EmptyState icon={Bot} title="…" description="…" action={{ label, onClick }} />
 */
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  ornament?: string; // single-char editorial mark (defaults to fleuron ❦)
  ctaLabel?: string;
  ctaHref?: string;
  onCta?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
  framed?: boolean;
  className?: string;
  // Legacy — keeps older call sites working
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  ornament = "❦",
  ctaLabel,
  ctaHref,
  onCta,
  secondaryLabel,
  secondaryHref,
  onSecondary,
  framed = true,
  className,
  action,
}: EmptyStateProps) {
  // Fold legacy `action` into the primary CTA slot if the new API wasn't used
  const primaryLabel = ctaLabel ?? action?.label;
  const primaryAction = onCta ?? action?.onClick;
  const hasPrimary = !!(primaryLabel && (ctaHref || primaryAction));
  const hasSecondary = !!(secondaryLabel && (secondaryHref || onSecondary));

  const PrimaryCTA = hasPrimary ? (
    ctaHref ? (
      <Link
        href={ctaHref}
        className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-[0_2px_10px_rgba(245,241,232,0.12)] transition-transform hover:-translate-y-px"
      >
        {primaryLabel}
        <ArrowRight className="size-3.5" />
      </Link>
    ) : (
      <button
        onClick={primaryAction}
        className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-[0_2px_10px_rgba(245,241,232,0.12)] transition-transform hover:-translate-y-px"
      >
        {primaryLabel}
        <ArrowRight className="size-3.5" />
      </button>
    )
  ) : null;

  const SecondaryCTA = hasSecondary ? (
    secondaryHref ? (
      <Link
        href={secondaryHref}
        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-brand/50 hover:bg-brand/[0.03]"
      >
        {secondaryLabel}
      </Link>
    ) : (
      <button
        onClick={onSecondary}
        className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-brand/50 hover:bg-brand/[0.03]"
      >
        {secondaryLabel}
      </button>
    )
  ) : null;

  return (
    <div
      className={cn(
        "relative",
        framed && "overflow-hidden rounded-lg border border-border/60 bg-brand/[0.015]",
        className,
      )}
    >
      {framed && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/25 to-transparent" />
      )}

      <div className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
        {/* Ornament row — hairlines flanking a fleuron or small icon */}
        <div className="mb-6 flex items-center gap-5">
          <span className="h-px w-10 bg-border" />
          {Icon ? (
            <Icon className="size-5 text-brand/80" strokeWidth={1.5} />
          ) : (
            <span
              className="font-heading italic text-brand/80"
              style={{
                fontSize: 22,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 360',
              }}
            >
              {ornament}
            </span>
          )}
          <span className="h-px w-10 bg-border" />
        </div>

        {/* Title — Fraunces italic */}
        <h3
          className="mb-3 font-heading text-foreground"
          style={{
            fontSize: "clamp(22px, 2.6vw, 28px)",
            lineHeight: 1.15,
            fontStyle: "italic",
            letterSpacing: "-0.018em",
            fontVariationSettings: '"opsz" 36, "SOFT" 100, "wght" 400',
            maxWidth: "28ch",
          }}
        >
          {title}
        </h3>

        {/* Description — sans, dimmed */}
        {description && (
          <p
            className="mb-7 max-w-[44ch] text-muted-foreground leading-relaxed"
            style={{ fontSize: 14 }}
          >
            {description}
          </p>
        )}

        {(PrimaryCTA || SecondaryCTA) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PrimaryCTA}
            {SecondaryCTA}
          </div>
        )}
      </div>

      {framed && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/25 to-transparent" />
      )}
    </div>
  );
}
