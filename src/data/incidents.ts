import type { Incident, AlertRule, OnCallSchedule } from "@/types/incidents";
import { relativeTimestamp } from "./generators";

export const seedIncidents: Incident[] = [
  {
    id: "INC-001",
    title: "API Gateway Outage",
    description: "Complete API gateway failure causing 503 errors for all endpoints. Triggered by connection pool exhaustion during traffic spike.",
    severity: "P1",
    status: "open",
    createdAt: relativeTimestamp(120),
    updatedAt: relativeTimestamp(15),
    assignee: { id: "user-sarah", name: "Sarah Chen", email: "sarah@example.com", image: null },
    affectedServices: ["api-gateway", "web-app", "worker-service"],
    timeline: [
      { timestamp: relativeTimestamp(120), actor: "InfraMonitor", action: "Incident created", details: "Automated detection: API gateway health check failed. Error rate spiked to 47%." },
      { timestamp: relativeTimestamp(118), actor: "InfraMonitor", action: "Alert sent", details: "PagerDuty alert triggered. Slack notification sent to #incidents." },
      { timestamp: relativeTimestamp(115), actor: "Sarah Chen", action: "Acknowledged", details: "Investigating. Checking connection pool metrics and recent deployments." },
      { timestamp: relativeTimestamp(110), actor: "Sarah Chen", action: "Root cause identified", details: "Connection pool exhausted. Max 100 connections reached. Traffic spike from partner API integration." },
      { timestamp: relativeTimestamp(105), actor: "Sarah Chen", action: "Mitigation started", details: "Increasing connection pool limit to 200. Scaling API gateway from 3 to 5 instances." },
      { timestamp: relativeTimestamp(90), actor: "InfraMonitor", action: "Status update", details: "Error rate decreasing. Currently at 12%. Services partially restored." },
      { timestamp: relativeTimestamp(60), actor: "InfraMonitor", action: "Status update", details: "Error rate at 2.1%. Most services restored. Monitoring for stability." },
      { timestamp: relativeTimestamp(15), actor: "Sarah Chen", action: "Update", details: "Services stable. Keeping elevated instance count. Will resolve after 1-hour stability window." },
    ],
  },
  {
    id: "INC-002",
    title: "Elevated Search Latency",
    description: "Elasticsearch queries experiencing 3-5x normal latency. Search endpoints returning timeouts for complex queries.",
    severity: "P2",
    status: "investigating",
    createdAt: relativeTimestamp(4320),
    updatedAt: relativeTimestamp(180),
    assignee: { id: "user-marcus", name: "Marcus Johnson", email: "marcus@example.com", image: null },
    affectedServices: ["search-service"],
    timeline: [
      { timestamp: relativeTimestamp(4320), actor: "InfraMonitor", action: "Incident created", details: "Search P95 latency exceeded 500ms threshold. Currently at 890ms." },
      { timestamp: relativeTimestamp(4310), actor: "Marcus Johnson", action: "Acknowledged", details: "Investigating Elasticsearch cluster health." },
      { timestamp: relativeTimestamp(4300), actor: "Marcus Johnson", action: "Investigation", details: "ES cluster yellow: 1 unassigned shard. Index claims_v2 needs rebalancing." },
      { timestamp: relativeTimestamp(2880), actor: "Marcus Johnson", action: "Partial fix", details: "Shard rebalanced. Latency improved but still elevated at 560ms P95." },
      { timestamp: relativeTimestamp(180), actor: "Marcus Johnson", action: "Update", details: "Applied index optimization. Monitoring improvement. P95 now at 340ms." },
    ],
  },
  {
    id: "INC-003",
    title: "Cost Anomaly Detected",
    description: "AI API costs spiked 42% above projected budget due to BugHunter agent repeatedly hitting context window limits and retrying.",
    severity: "P3",
    status: "resolved",
    createdAt: relativeTimestamp(10080),
    updatedAt: relativeTimestamp(2880),
    assignee: { id: "user-james", name: "James Wilson", email: "james@example.com", image: null },
    affectedServices: ["worker-service"],
    timeline: [
      { timestamp: relativeTimestamp(10080), actor: "InfraMonitor", action: "Incident created", details: "Cost anomaly: AI API spend exceeded daily budget by 42%." },
      { timestamp: relativeTimestamp(10060), actor: "James Wilson", action: "Acknowledged", details: "Reviewing agent cost breakdowns." },
      { timestamp: relativeTimestamp(10020), actor: "James Wilson", action: "Root cause identified", details: "BugHunter agent in retry loop. Context window exceeded -> retry -> exceeded again. 47 failed runs in 6 hours." },
      { timestamp: relativeTimestamp(9960), actor: "James Wilson", action: "Mitigation", details: "Paused BugHunter agent. Added context window pre-check before execution." },
      { timestamp: relativeTimestamp(5760), actor: "James Wilson", action: "Fix deployed", details: "Updated BugHunter with chunked log analysis. Max context usage capped at 80%." },
      { timestamp: relativeTimestamp(2880), actor: "James Wilson", action: "Resolved", details: "Cost anomaly resolved. BugHunter running within budget. Added cost alerting per-agent." },
    ],
  },
];

export const seedAlertRules: AlertRule[] = [
  { id: "alr_001", name: "High CPU Usage", metric: "system.cpu.usage", condition: "gt", threshold: 85, channels: ["slack", "pagerduty"], enabled: true, lastTriggered: relativeTimestamp(4320) },
  { id: "alr_002", name: "Error Rate Spike", metric: "api.error_rate", condition: "gt", threshold: 5, channels: ["slack", "pagerduty", "email"], enabled: true, lastTriggered: relativeTimestamp(120) },
  { id: "alr_003", name: "Low Disk Space", metric: "system.disk.usage", condition: "gt", threshold: 90, channels: ["slack", "email"], enabled: true },
  { id: "alr_004", name: "Agent Health Score", metric: "agent.health_score", condition: "lt", threshold: 50, channels: ["slack"], enabled: true, lastTriggered: relativeTimestamp(45) },
  { id: "alr_005", name: "Daily Cost Budget", metric: "cost.daily_total", condition: "gt", threshold: 700, channels: ["email"], enabled: true, lastTriggered: relativeTimestamp(10080) },
];

export const seedOnCallSchedule: OnCallSchedule[] = [
  { id: "oc_001", member: "Sarah Chen", startDate: "2026-03-31T00:00:00Z", endDate: "2026-04-06T00:00:00Z" },
  { id: "oc_002", member: "Marcus Johnson", startDate: "2026-04-07T00:00:00Z", endDate: "2026-04-13T00:00:00Z" },
  { id: "oc_003", member: "Aisha Patel", startDate: "2026-04-14T00:00:00Z", endDate: "2026-04-20T00:00:00Z" },
  { id: "oc_004", member: "James Wilson", startDate: "2026-04-21T00:00:00Z", endDate: "2026-04-27T00:00:00Z" },
];
