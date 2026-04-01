import type { AnalyticsData } from "@/types/analytics";

export const seedAnalytics: AnalyticsData = {
  overview: { dau: 1247, wau: 5400, mau: 16800, avgSession: 4.2, bounceRate: 32.1, pagesPerSession: 6.8 },

  retention: [
    { cohortWeek: "2026-W09", weekIndex: 0, retentionRate: 100 },
    { cohortWeek: "2026-W09", weekIndex: 1, retentionRate: 68 },
    { cohortWeek: "2026-W09", weekIndex: 2, retentionRate: 52 },
    { cohortWeek: "2026-W09", weekIndex: 3, retentionRate: 41 },
    { cohortWeek: "2026-W10", weekIndex: 0, retentionRate: 100 },
    { cohortWeek: "2026-W10", weekIndex: 1, retentionRate: 71 },
    { cohortWeek: "2026-W10", weekIndex: 2, retentionRate: 55 },
    { cohortWeek: "2026-W11", weekIndex: 0, retentionRate: 100 },
    { cohortWeek: "2026-W11", weekIndex: 1, retentionRate: 65 },
    { cohortWeek: "2026-W12", weekIndex: 0, retentionRate: 100 },
    { cohortWeek: "2026-W12", weekIndex: 1, retentionRate: 72 },
  ],

  geo: [
    { country: "United States", users: 8420 },
    { country: "United Kingdom", users: 2140 },
    { country: "Germany", users: 1580 },
    { country: "Canada", users: 1320 },
    { country: "Australia", users: 890 },
    { country: "France", users: 720 },
    { country: "Japan", users: 540 },
    { country: "Brazil", users: 480 },
    { country: "India", users: 410 },
    { country: "Netherlands", users: 340 },
  ],

  features: [
    { feature: "Claim Search", usage: 89, trend: 4.2 },
    { feature: "Dashboard", usage: 84, trend: 12.1 },
    { feature: "Batch Processing", usage: 67, trend: 8.7 },
    { feature: "Analytics Reports", usage: 54, trend: 15.3 },
    { feature: "API Integration", usage: 42, trend: 6.4 },
    { feature: "Document Upload", usage: 38, trend: -2.1 },
    { feature: "Notification Settings", usage: 24, trend: 1.8 },
    { feature: "Team Management", usage: 18, trend: 0.4 },
  ],

  funnel: [
    { stage: "Landing Page", count: 14200 },
    { stage: "Sign Up Started", count: 4890 },
    { stage: "Email Verified", count: 3720 },
    { stage: "First Claim Submitted", count: 2140 },
    { stage: "Paying Customer", count: 1247 },
  ],

  growth: [
    { metric: "Revenue (MRR)", current: 48200, previous: 42800 },
    { metric: "Active Users", current: 1247, previous: 1089 },
    { metric: "Claims Processed", current: 19847, previous: 16230 },
    { metric: "Agent Tasks/Day", current: 3420, previous: 2890 },
  ],
};
