import { create } from "zustand";
import type { Integration, Webhook } from "@/types/integrations";
import type { IntegrationStatus } from "@/types/common";

interface IntegrationsStore {
  integrations: Integration[];
  webhooks: Webhook[];
  isLoading: boolean;
  error: string | null;
  categoryFilter: string;
  fetch: () => Promise<void>;
  updateIntegrationStatus: (id: string, status: IntegrationStatus) => void;
  setCategoryFilter: (category: string) => void;
  toggleWebhookStatus: (id: string) => void;
  getFilteredIntegrations: () => Integration[];
}

export const useIntegrationsStore = create<IntegrationsStore>((set, get) => ({
  integrations: [],
  webhooks: [],
  isLoading: false,
  error: null,
  categoryFilter: "all",

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const [integrationsRes, webhooksRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/webhooks"),
      ]);
      if (!integrationsRes.ok) throw new Error("Failed to fetch integrations");
      if (!webhooksRes.ok) throw new Error("Failed to fetch webhooks");
      const [integrationsData, webhooksData] = await Promise.all([
        integrationsRes.json(),
        webhooksRes.json(),
      ]);
      set({
        integrations: integrationsData.data,
        webhooks: webhooksData.data,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateIntegrationStatus: async (id, status) => {
    set((state) => ({
      integrations: state.integrations.map((i) =>
        i.id === id ? { ...i, status } : i
      ),
    }));
    try {
      const res = await fetch(`/api/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update integration status");
    } catch {
      get().fetch();
    }
  },

  setCategoryFilter: (category) => set({ categoryFilter: category }),

  toggleWebhookStatus: async (id) => {
    const webhook = get().webhooks.find((w) => w.id === id);
    if (!webhook) return;
    const newStatus = webhook.status === "active" ? "inactive" : "active";
    set((state) => ({
      webhooks: state.webhooks.map((w) =>
        w.id === id ? { ...w, status: newStatus } : w
      ),
    }));
    try {
      const res = await fetch(`/api/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to toggle webhook status");
    } catch {
      get().fetch();
    }
  },

  getFilteredIntegrations: () => {
    const { integrations, categoryFilter } = get();
    if (categoryFilter === "all") return integrations;
    return integrations.filter((i) => i.category === categoryFilter);
  },
}));
