import type { AnalyticsData } from "@/types/analytics";

export const seedAnalytics: AnalyticsData = {
  overview: { dau: 0, wau: 0, mau: 0, avgSession: 0, bounceRate: 0, pagesPerSession: 0 },
  retention: [],
  geo: [],
  features: [],
  funnel: [],
  growth: [],
};
