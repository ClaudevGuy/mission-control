import { create } from "zustand";
import type { LogEntry, ErrorGroup, LLMCall, TraceSpan } from "@/types/logs";
import type { LogLevel } from "@/types/common";
import { isFresh, markFetched, markInflight } from "@/lib/store-cache";

interface LogsStore {
  logs: LogEntry[];
  errorGroups: ErrorGroup[];
  llmCalls: LLMCall[];
  traceSpans: TraceSpan[];
  isLoading: boolean;
  error: string | null;
  levelFilter: LogLevel | "all";
  serviceFilter: string;
  searchQuery: string;
  isLive: boolean;
  fetch: () => Promise<void>;
  setLevelFilter: (level: LogLevel | "all") => void;
  setServiceFilter: (service: string) => void;
  setSearchQuery: (query: string) => void;
  setIsLive: (live: boolean) => void;
  addLog: (log: LogEntry) => void;
  getFilteredLogs: () => LogEntry[];
}

export const useLogsStore = create<LogsStore>((set, get) => ({
  logs: [],
  errorGroups: [],
  llmCalls: [],
  traceSpans: [],
  isLoading: false,
  error: null,
  levelFilter: "all",
  serviceFilter: "",
  searchQuery: "",
  isLive: true,

  fetch: async () => {
    if (isFresh("logs")) return;
    markInflight("logs");
    set({ isLoading: true, error: null });
    try {
      const [logsRes, errorsRes, llmRes, tracesRes] = await Promise.all([
        fetch("/api/logs"),
        fetch("/api/logs/errors"),
        fetch("/api/logs/llm-calls"),
        fetch("/api/logs/traces"),
      ]);
      if (!logsRes.ok) throw new Error("Failed to fetch logs");
      if (!errorsRes.ok) throw new Error("Failed to fetch errors");
      if (!llmRes.ok) throw new Error("Failed to fetch LLM calls");
      if (!tracesRes.ok) throw new Error("Failed to fetch traces");
      const [logsData, errorsData, llmData, tracesData] = await Promise.all([
        logsRes.json(),
        errorsRes.json(),
        llmRes.json(),
        tracesRes.json(),
      ]);
      markFetched("logs");
      set({
        logs: logsData.data.entries,
        errorGroups: errorsData.data.groups,
        llmCalls: llmData.data.calls,
        traceSpans: tracesData.data.spans,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setLevelFilter: (level) => set({ levelFilter: level }),
  setServiceFilter: (service) => set({ serviceFilter: service }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsLive: (live) => set({ isLive: live }),

  addLog: (log) =>
    set((state) => ({ logs: [log, ...state.logs].slice(0, 200) })),

  getFilteredLogs: () => {
    const { logs, levelFilter, serviceFilter, searchQuery } = get();
    return logs.filter((l) => {
      if (levelFilter !== "all" && l.level !== levelFilter) return false;
      if (serviceFilter && l.service !== serviceFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          l.message.toLowerCase().includes(q) ||
          l.service.toLowerCase().includes(q) ||
          (l.traceId && l.traceId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  },
}));
