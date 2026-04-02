import { create } from "zustand";
import type { Incident, IncidentEvent, AlertRule, OnCallSchedule } from "@/types/incidents";
import type { IncidentSeverity, IncidentStatus } from "@/types/common";
import { isFresh, markFetched, markInflight } from "@/lib/store-cache";

interface IncidentsStore {
  incidents: Incident[];
  alertRules: AlertRule[];
  onCallSchedule: OnCallSchedule[];
  isLoading: boolean;
  error: string | null;
  severityFilter: IncidentSeverity | "all";
  statusFilter: IncidentStatus | "all";
  fetch: () => Promise<void>;
  setSeverityFilter: (severity: IncidentSeverity | "all") => void;
  setStatusFilter: (status: IncidentStatus | "all") => void;
  updateIncidentStatus: (id: string, status: IncidentStatus) => void;
  addTimelineEvent: (incidentId: string, event: IncidentEvent) => void;
  toggleAlertRule: (id: string) => void;
  getFilteredIncidents: () => Incident[];
  getActiveIncidents: () => Incident[];
}

export const useIncidentsStore = create<IncidentsStore>((set, get) => ({
  incidents: [],
  alertRules: [],
  onCallSchedule: [],
  isLoading: false,
  error: null,
  severityFilter: "all",
  statusFilter: "all",

  fetch: async () => {
    if (isFresh("incidents")) return;
    markInflight("incidents");
    set({ isLoading: true, error: null });
    try {
      const [incidentsRes, alertsRes, onCallRes] = await Promise.all([
        fetch("/api/incidents"),
        fetch("/api/alert-rules"),
        fetch("/api/on-call"),
      ]);
      if (!incidentsRes.ok) throw new Error("Failed to fetch incidents");
      if (!alertsRes.ok) throw new Error("Failed to fetch alert rules");
      if (!onCallRes.ok) throw new Error("Failed to fetch on-call schedule");
      const [incidentsData, alertsData, onCallData] = await Promise.all([
        incidentsRes.json(),
        alertsRes.json(),
        onCallRes.json(),
      ]);
      markFetched("incidents");
      set({
        incidents: incidentsData.data.incidents,
        alertRules: alertsData.data.rules,
        onCallSchedule: onCallData.data.schedules,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setSeverityFilter: (severity) => set({ severityFilter: severity }),
  setStatusFilter: (status) => set({ statusFilter: status }),

  updateIncidentStatus: async (id, status) => {
    set((state) => ({
      incidents: state.incidents.map((i) =>
        i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i
      ),
    }));
    try {
      const res = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update incident status");
    } catch {
      get().fetch();
    }
  },

  addTimelineEvent: (incidentId, event) =>
    set((state) => ({
      incidents: state.incidents.map((i) =>
        i.id === incidentId
          ? { ...i, timeline: [...i.timeline, event], updatedAt: new Date().toISOString() }
          : i
      ),
    })),

  toggleAlertRule: async (id) => {
    const rule = get().alertRules.find((r) => r.id === id);
    if (!rule) return;
    set((state) => ({
      alertRules: state.alertRules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    }));
    try {
      const res = await fetch(`/api/alert-rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error("Failed to toggle alert rule");
    } catch {
      get().fetch();
    }
  },

  getFilteredIncidents: () => {
    const { incidents, severityFilter, statusFilter } = get();
    return incidents.filter((i) => {
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      return true;
    });
  },

  getActiveIncidents: () => {
    return get().incidents.filter((i) => i.status !== "resolved");
  },
}));
