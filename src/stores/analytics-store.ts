import { create } from "zustand";
import type { AnalyticsData } from "@/types/analytics";

const emptyAnalytics: AnalyticsData = {
  overview: { dau: 0, wau: 0, mau: 0, avgSession: 0, bounceRate: 0, pagesPerSession: 0 },
  retention: [],
  geo: [],
  features: [],
  funnel: [],
  growth: [],
};

interface AnalyticsStore {
  data: AnalyticsData;
  isLoading: boolean;
  error: string | null;
  activeMetric: "dau" | "wau" | "mau";
  dateRange: "7d" | "14d" | "30d" | "90d";
  fetch: () => Promise<void>;
  setActiveMetric: (metric: "dau" | "wau" | "mau") => void;
  setDateRange: (range: "7d" | "14d" | "30d" | "90d") => void;
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  data: emptyAnalytics,
  isLoading: false,
  error: null,
  activeMetric: "dau",
  dateRange: "30d",

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const [overviewRes, retentionRes, geoRes, featuresRes, funnelRes, growthRes] = await Promise.all([
        fetch("/api/analytics/overview"),
        fetch("/api/analytics/retention"),
        fetch("/api/analytics/geo"),
        fetch("/api/analytics/features"),
        fetch("/api/analytics/funnel"),
        fetch("/api/analytics/growth"),
      ]);
      if (!overviewRes.ok) throw new Error("Failed to fetch analytics overview");
      if (!retentionRes.ok) throw new Error("Failed to fetch retention data");
      if (!geoRes.ok) throw new Error("Failed to fetch geo data");
      if (!featuresRes.ok) throw new Error("Failed to fetch features data");
      if (!funnelRes.ok) throw new Error("Failed to fetch funnel data");
      if (!growthRes.ok) throw new Error("Failed to fetch growth data");
      const [overviewData, retentionData, geoData, featuresData, funnelData, growthData] = await Promise.all([
        overviewRes.json(),
        retentionRes.json(),
        geoRes.json(),
        featuresRes.json(),
        funnelRes.json(),
        growthRes.json(),
      ]);
      set({
        data: {
          overview: overviewData.data,
          retention: retentionData.data,
          geo: geoData.data,
          features: featuresData.data,
          funnel: funnelData.data,
          growth: growthData.data,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setActiveMetric: (metric) => set({ activeMetric: metric }),
  setDateRange: (range) => set({ dateRange: range }),
}));
