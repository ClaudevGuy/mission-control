import { create } from "zustand";
import { isFresh, markFetched, markInflight } from "@/lib/store-cache";
import type { Deployment, EnvironmentStatus, FeatureFlag } from "@/types/deployments";
import type { DeployStatus, Environment } from "@/types/common";

interface DeploymentsStore {
  deployments: Deployment[];
  environments: EnvironmentStatus[];
  featureFlags: FeatureFlag[];
  isLoading: boolean;
  error: string | null;
  environmentFilter: Environment | "all";
  statusFilter: DeployStatus | "all";
  fetch: () => Promise<void>;
  setEnvironmentFilter: (env: Environment | "all") => void;
  setStatusFilter: (status: DeployStatus | "all") => void;
  addDeployment: (deployment: Deployment) => void;
  updateDeploymentStatus: (id: string, status: DeployStatus) => void;
  toggleFeatureFlag: (id: string, environment: Environment) => void;
  getFilteredDeployments: () => Deployment[];
}

export const useDeploymentsStore = create<DeploymentsStore>((set, get) => ({
  deployments: [],
  environments: [],
  featureFlags: [],
  isLoading: false,
  error: null,
  environmentFilter: "all",
  statusFilter: "all",

  fetch: async () => {
    if (isFresh("deployments")) return;
    markInflight("deployments");
    set({ isLoading: true, error: null });
    try {
      const [deploymentsRes, environmentsRes, flagsRes] = await Promise.all([
        fetch("/api/deployments"),
        fetch("/api/environments"),
        fetch("/api/feature-flags"),
      ]);
      if (!deploymentsRes.ok) throw new Error("Failed to fetch deployments");
      if (!environmentsRes.ok) throw new Error("Failed to fetch environments");
      if (!flagsRes.ok) throw new Error("Failed to fetch feature flags");
      const [deploymentsData, environmentsData, flagsData] = await Promise.all([
        deploymentsRes.json(),
        environmentsRes.json(),
        flagsRes.json(),
      ]);
      markFetched("deployments");
      set({
        deployments: deploymentsData.data.deployments,
        environments: environmentsData.data.configs,
        featureFlags: flagsData.data.flags,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setEnvironmentFilter: (env) => set({ environmentFilter: env }),
  setStatusFilter: (status) => set({ statusFilter: status }),

  addDeployment: (deployment) =>
    set((state) => ({ deployments: [deployment, ...state.deployments] })),

  updateDeploymentStatus: async (id, status) => {
    set((state) => ({
      deployments: state.deployments.map((d) =>
        d.id === id ? { ...d, status } : d
      ),
    }));
    try {
      const res = await fetch(`/api/deployments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update deployment status");
    } catch {
      get().fetch();
    }
  },

  toggleFeatureFlag: async (id, environment) => {
    const flag = get().featureFlags.find((f) => f.id === id);
    if (!flag) return;
    const newValue = !flag.environments[environment];
    // Optimistic update
    set((state) => ({
      featureFlags: state.featureFlags.map((f) =>
        f.id === id
          ? { ...f, environments: { ...f.environments, [environment]: newValue } }
          : f
      ),
    }));
    try {
      const res = await fetch(`/api/feature-flags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment, enabled: newValue }),
      });
      if (!res.ok) throw new Error("Failed to toggle feature flag");
    } catch {
      get().fetch();
    }
  },

  getFilteredDeployments: () => {
    const { deployments, environmentFilter, statusFilter } = get();
    return deployments.filter((d) => {
      if (environmentFilter !== "all" && d.environment !== environmentFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  },
}));
