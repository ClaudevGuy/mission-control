import { create } from "zustand";
import { isFresh, markFetched, markInflight } from "@/lib/store-cache";
import type { Agent, AgentRun } from "@/types/agents";
import type { AgentStatus, ModelProvider } from "@/types/common";

interface AgentsStore {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: AgentStatus | "all";
  modelFilter: ModelProvider | "all";
  fetch: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: AgentStatus | "all") => void;
  setModelFilter: (model: ModelProvider | "all") => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  killAllAgents: () => Promise<number>;
  addRun: (agentId: string, run: AgentRun) => void;
  getFilteredAgents: () => Agent[];
}

export const useAgentsStore = create<AgentsStore>((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,
  searchQuery: "",
  statusFilter: "all",
  modelFilter: "all",

  fetch: async () => {
    if (isFresh("agents")) return;
    markInflight("agents");
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      const { data } = await res.json();
      markFetched("agents");
      set({ agents: data.agents, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setModelFilter: (model) => set({ modelFilter: model }),

  updateAgentStatus: async (id, status) => {
    // Optimistic update
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, status } : a
      ),
    }));
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update agent status");
    } catch {
      // Revert on failure by refetching
      get().fetch();
    }
  },

  killAllAgents: async () => {
    const res = await fetch("/api/agents/kill-all", { method: "POST" });
    if (!res.ok) throw new Error("Failed to stop agents");
    const { data } = await res.json();
    // Reflect the status change locally
    set((state) => ({
      agents: state.agents.map((a) =>
        a.status === "running" ? { ...a, status: "idle" as AgentStatus } : a
      ),
    }));
    return data.stopped as number;
  },

  addRun: (agentId, run) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, runs: [run, ...a.runs] } : a
      ),
    })),

  getFilteredAgents: () => {
    const { agents, searchQuery, statusFilter, modelFilter } = get();
    return agents.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (modelFilter !== "all" && a.model !== modelFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  },
}));
