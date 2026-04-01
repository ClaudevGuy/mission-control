export interface AnalyticsOverview {
  dau: number;
  wau: number;
  mau: number;
  avgSession: number;
  bounceRate: number;
  pagesPerSession: number;
}

export interface RetentionCohort {
  cohortWeek: string;
  weekIndex: number;
  retentionRate: number;
}

export interface GeoEntry {
  country: string;
  users: number;
}

export interface FeatureUsageEntry {
  feature: string;
  usage: number;
  trend: number;
}

export interface FunnelStep {
  stage: string;
  count: number;
}

export interface GrowthEntry {
  metric: string;
  current: number;
  previous: number;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  retention: RetentionCohort[];
  geo: GeoEntry[];
  features: FeatureUsageEntry[];
  funnel: FunnelStep[];
  growth: GrowthEntry[];
}
