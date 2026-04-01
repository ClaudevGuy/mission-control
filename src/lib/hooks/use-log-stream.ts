"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { LogEntry } from "@/types/logs";

export function useLogStream(enabled: boolean) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const clearEntries = useCallback(() => {
    setEntries([]);
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Close connection when disabled
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const es = new EventSource("/api/logs/stream");
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    es.addEventListener("log", (event) => {
      try {
        const entry = JSON.parse(event.data) as LogEntry;
        setEntries((prev) => [entry, ...prev].slice(0, 200));
      } catch {
        // Ignore malformed messages
      }
    });

    es.addEventListener("error", () => {
      if (es.readyState === EventSource.CLOSED) {
        setIsConnected(false);
        setError("Connection closed");
      } else if (es.readyState === EventSource.CONNECTING) {
        setIsConnected(false);
        setError("Reconnecting...");
      }
    });

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [enabled]);

  return { entries, isConnected, error, clearEntries };
}
