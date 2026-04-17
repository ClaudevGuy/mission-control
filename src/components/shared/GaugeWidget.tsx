"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GaugeWidgetProps {
  value: number; // 0-100
  color: string;
  label: string;
  size?: number;
  className?: string;
}

export function GaugeWidget({
  value,
  color,
  label,
  size = 120,
  className,
}: GaugeWidgetProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Semi-circle arc (180 degrees)
  const startAngle = Math.PI;
  const endAngle = 0;
  const circumference = Math.PI * radius;
  const filledLength = (clampedValue / 100) * circumference;

  const arcPath = (startA: number, endA: number) => {
    const x1 = cx + radius * Math.cos(startA);
    const y1 = cy - radius * Math.sin(startA);
    const x2 = cx + radius * Math.cos(endA);
    const y2 = cy - radius * Math.sin(endA);
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  };

  const trackPath = arcPath(startAngle, endAngle);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgb(var(--ink-rgb) / 0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <motion.path
          d={trackPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filledLength }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="flex flex-col items-center -mt-2">
        <span className="text-xl font-mono font-semibold text-foreground">
          {Math.round(clampedValue)}%
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
      </div>
    </div>
  );
}
