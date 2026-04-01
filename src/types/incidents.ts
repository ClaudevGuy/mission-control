import type { AlertChannel, IncidentSeverity, IncidentStatus } from "./common";

export interface IncidentEvent {
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string | null; email: string | null; image: string | null } | null;
  affectedServices: string[];
  timeline: IncidentEvent[];
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: "gt" | "lt" | "eq";
  threshold: number;
  channels: AlertChannel[];
  enabled: boolean;
  lastTriggered?: string;
}

export interface OnCallSchedule {
  id: string;
  member: string;
  startDate: string;
  endDate: string;
}
