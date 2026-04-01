"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";
import { useUIStore } from "@/stores/ui-store";

const GO_SHORTCUTS: Record<string, string> = {
  o: "/overview",
  a: "/agents",
  w: "/workflows",
  d: "/deployments",
  l: "/logs",
  t: "/team",
  s: "/settings",
  $: "/costs",
  n: "/analytics",
  "!": "/incidents",
  h: "/tutorial",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    toggleCommandPalette,
    toggleShortcuts,
    commandPaletteOpen,
    setGKeyActive,
  } = useUIStore();

  const gPressedRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Ctrl+K — always works
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // Esc closes dialogs (handled by dialog components, but also reset g)
      if (e.key === "Escape") {
        gPressedRef.current = false;
        return;
      }

      // Skip remaining shortcuts if focused on input
      if (isInput) return;

      // ? — shortcuts modal
      if (e.key === "?" && !commandPaletteOpen) {
        e.preventDefault();
        toggleShortcuts();
        return;
      }

      // g+<key> navigation
      if (e.key === "g" && !gPressedRef.current) {
        gPressedRef.current = true;
        setGKeyActive(true);
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => {
          gPressedRef.current = false;
          setGKeyActive(false);
        }, 800);
        return;
      }

      if (gPressedRef.current) {
        const route = GO_SHORTCUTS[e.key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        gPressedRef.current = false;
        setGKeyActive(false);
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
      }
    },
    [router, toggleCommandPalette, toggleShortcuts, commandPaletteOpen, setGKeyActive]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-background transition-colors duration-200">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="relative flex-1 overflow-y-auto">
          {/* Ambient background */}
          <div className="pointer-events-none absolute inset-0 bg-ambient" />
          <div className="relative z-10 p-6">{children}</div>
        </main>
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
    </div>
  );
}
