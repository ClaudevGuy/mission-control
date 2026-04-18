import { create } from "zustand";
import { apiFetch } from "@/lib/api-client";
import type { CostBreakdown, AgentCost, Budget, Invoice } from "@/types/costs";
import type { TimeSeriesPoint } from "@/types/common";
import { isFresh, markFetched, markInflight, invalidate } from "@/lib/store-cache";

interface CostsStore {
  breakdown: CostBreakdown[];
  agentCosts: AgentCost[];
  budgets: Budget[];
  invoices: Invoice[];
  dailyCosts: TimeSeriesPoint[];
  isLoading: boolean;
  error: string | null;
  dateRange: "7d" | "14d" | "30d" | "90d";
  fetch: () => Promise<void>;
  setDateRange: (range: "7d" | "14d" | "30d" | "90d") => void;
  updateBudget: (id: string, patch: { limit?: number; alertThreshold?: number }) => Promise<void>;
  createBudget: (args: { category: string; limit: number; alertThreshold?: number }) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  getTotalSpend: () => number;
}

export const useCostsStore = create<CostsStore>((set, get) => ({
  breakdown: [],
  agentCosts: [],
  budgets: [],
  invoices: [],
  dailyCosts: [],
  isLoading: false,
  error: null,
  dateRange: "30d",

  fetch: async () => {
    if (isFresh("costs")) return;
    markInflight("costs");
    set({ isLoading: true, error: null });
    try {
      const [breakdownRes, agentCostsRes, budgetsRes, invoicesRes, dailyRes] = await Promise.all([
        apiFetch("/api/costs/breakdown"),
        apiFetch("/api/costs/agent-costs"),
        apiFetch("/api/costs/budgets"),
        apiFetch("/api/costs/invoices"),
        apiFetch("/api/costs/daily"),
      ]);
      if (!breakdownRes.ok) throw new Error("Failed to fetch cost breakdown");
      if (!agentCostsRes.ok) throw new Error("Failed to fetch agent costs");
      if (!budgetsRes.ok) throw new Error("Failed to fetch budgets");
      if (!invoicesRes.ok) throw new Error("Failed to fetch invoices");
      if (!dailyRes.ok) throw new Error("Failed to fetch daily costs");
      const [breakdownData, agentCostsData, budgetsData, invoicesData, dailyData] = await Promise.all([
        breakdownRes.json(),
        agentCostsRes.json(),
        budgetsRes.json(),
        invoicesRes.json(),
        dailyRes.json(),
      ]);
      markFetched("costs");
      set({
        breakdown: breakdownData.data.breakdowns,
        agentCosts: agentCostsData.data.costs,
        budgets: budgetsData.data.budgets,
        invoices: invoicesData.data.invoices,
        dailyCosts: dailyData.data.costs,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setDateRange: (range) => set({ dateRange: range }),

  updateBudget: async (id, patch) => {
    // Optimistic update
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
    try {
      const res = await apiFetch("/api/costs/budgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) throw new Error("Failed to update budget");
    } catch {
      // Re-sync with server on failure
      invalidate("costs");
      get().fetch();
    }
  },

  createBudget: async ({ category, limit, alertThreshold }) => {
    const res = await apiFetch("/api/costs/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, limit, alertThreshold }),
    });
    if (!res.ok) throw new Error("Failed to create budget");
    // Re-fetch so we get live `spent` for the new budget
    invalidate("costs");
    await get().fetch();
  },

  deleteBudget: async (id) => {
    set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
    try {
      const res = await apiFetch(`/api/costs/budgets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete budget");
    } catch {
      invalidate("costs");
      get().fetch();
    }
  },

  getTotalSpend: () => {
    return get().breakdown.reduce((sum, b) => sum + b.total, 0);
  },
}));
