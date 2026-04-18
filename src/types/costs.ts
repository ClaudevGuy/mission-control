import type { TimeSeriesPoint } from "./common";

export interface CostBreakdown {
  category: string;
  subcategories: { name: string; amount: number; trend: number }[];
  total: number;
}

export interface AgentCost {
  agentId: string;
  agentName: string;
  costPerRun: number;
  totalRuns: number;
  totalCost: number;
  trend: number;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  alertThreshold: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
}

export interface CostData {
  breakdown: CostBreakdown[];
  agentCosts: AgentCost[];
  budgets: Budget[];
  invoices: Invoice[];
  dailyCosts: TimeSeriesPoint[];
}
