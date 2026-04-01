import { create } from "zustand";
import type { ResourceMetric, ServiceNode, APIEndpoint, QueueMetric } from "@/types/infrastructure";

interface InfrastructureStore {
  resources: ResourceMetric[];
  services: ServiceNode[];
  endpoints: APIEndpoint[];
  queues: QueueMetric[];
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  updateServiceStatus: (id: string, status: "healthy" | "degraded" | "down") => void;
}

export const useInfrastructureStore = create<InfrastructureStore>((set, get) => ({
  resources: [],
  services: [],
  endpoints: [],
  queues: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const [resourcesRes, servicesRes, endpointsRes, queuesRes] = await Promise.all([
        fetch("/api/infrastructure/resources"),
        fetch("/api/infrastructure/services"),
        fetch("/api/infrastructure/endpoints"),
        fetch("/api/infrastructure/queues"),
      ]);
      if (!resourcesRes.ok) throw new Error("Failed to fetch resources");
      if (!servicesRes.ok) throw new Error("Failed to fetch services");
      if (!endpointsRes.ok) throw new Error("Failed to fetch endpoints");
      if (!queuesRes.ok) throw new Error("Failed to fetch queues");
      const [resourcesData, servicesData, endpointsData, queuesData] = await Promise.all([
        resourcesRes.json(),
        servicesRes.json(),
        endpointsRes.json(),
        queuesRes.json(),
      ]);
      set({
        resources: resourcesData.data,
        services: servicesData.data,
        endpoints: endpointsData.data,
        queues: queuesData.data,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateServiceStatus: async (id, status) => {
    set((state) => ({
      services: state.services.map((s) =>
        s.id === id ? { ...s, status } : s
      ),
    }));
    try {
      const res = await fetch(`/api/infrastructure/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update service status");
    } catch {
      get().fetch();
    }
  },
}));
