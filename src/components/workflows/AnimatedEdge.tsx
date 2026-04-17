"use client";

import React from "react";
import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      {/* Base path (glow) */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: selected ? "var(--primary)" : "rgb(var(--brand-rgb) / 0.25)",
          strokeWidth: selected ? 6 : 4,
          filter: "blur(4px)",
        }}
      />
      {/* Main path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "var(--primary)" : "rgb(var(--brand-rgb) / 0.5)",
          strokeWidth: 2,
        }}
      />
      {/* Animated dot */}
      <circle r="3" fill="var(--primary)" filter="drop-shadow(0 0 3px #f5f1e8)">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}
