/**
 * Utilities for clearing and reloading all project-scoped data stores.
 * Call clearProjectData() when switching to a new/different project.
 * Call reloadProjectData() when switching back to the default project.
 */

import { useAgentsStore } from "@/stores/agents-store";
import { useIncidentsStore } from "@/stores/incidents-store";
import { useDeploymentsStore } from "@/stores/deployments-store";
import { useCostsStore } from "@/stores/costs-store";
import { useNotificationsStore } from "@/stores/notifications-store";

export function clearProjectData() {
  useAgentsStore.setState({ agents: [] });
  useIncidentsStore.setState({
    incidents: [],
    alertRules: [],
    onCallSchedule: [],
  });
  useDeploymentsStore.setState({
    deployments: [],
    environments: [],
    featureFlags: [],
  });
  useCostsStore.setState({
    breakdown: [],
    agentCosts: [],
    budgets: [],
    invoices: [],
    dailyCosts: [],
  });
  useNotificationsStore.setState({ notifications: [] });
}

export function reloadProjectData() {
  useAgentsStore.getState().fetch();
  useIncidentsStore.getState().fetch();
  useDeploymentsStore.getState().fetch();
  useCostsStore.getState().fetch();
  useNotificationsStore.getState().fetch();
}
