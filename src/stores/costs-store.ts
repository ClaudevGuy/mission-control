import { create } from "zustand";
import type { CostBreakdown, AgentCost, Budget, Invoice } from "@/types/costs";
import type { TimeSeriesPoint } from "@/types/common";

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
  updateBudget: (category: string, limit: number) => void;
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
    set({ isLoading: true, error: null });
    try {
      const [breakdownRes, agentCostsRes, budgetsRes, invoicesRes, dailyRes] = await Promise.all([
        fetch("/api/costs/breakdown"),
        fetch("/api/costs/agent-costs"),
        fetch("/api/costs/budgets"),
        fetch("/api/costs/invoices"),
        fetch("/api/costs/daily"),
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
      set({
        breakdown: breakdownData.data,
        agentCosts: agentCostsData.data,
        budgets: budgetsData.data,
        invoices: invoicesData.data,
        dailyCosts: dailyData.data,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setDateRange: (range) => set({ dateRange: range }),

  updateBudget: async (category, limit) => {
    set((state) => ({
      budgets: state.budgets.map((b) =>
        b.category === category ? { ...b, limit } : b
      ),
    }));
    try {
      const res = await fetch("/api/costs/budgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, limit }),
      });
      if (!res.ok) throw new Error("Failed to update budget");
    } catch {
      get().fetch();
    }
  },

  getTotalSpend: () => {
    return get().breakdown.reduce((sum, b) => sum + b.total, 0);
  },
}));
