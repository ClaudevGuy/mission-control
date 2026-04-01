import { create } from "zustand";

interface SettingsStore {
  projectName: string;
  projectDescription: string;
  theme: "light" | "dark" | "system";
  pollingInterval: number;
  pollingEnabled: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  timezone: string;
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  save: () => Promise<void>;
  setProjectName: (name: string) => void;
  setProjectDescription: (desc: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setPollingInterval: (interval: number) => void;
  setPollingEnabled: (enabled: boolean) => void;
  setCompactMode: (compact: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setTimezone: (tz: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  projectName: "Mission Control",
  projectDescription: "AI-powered project command center for monitoring agents, deployments, and infrastructure.",
  theme: "dark",
  pollingInterval: 5000,
  pollingEnabled: true,
  compactMode: false,
  animationsEnabled: true,
  timezone: "America/New_York",
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const { data } = await res.json();
      set({ ...data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  save: async () => {
    const {
      projectName, projectDescription, theme, pollingInterval,
      pollingEnabled, compactMode, animationsEnabled, timezone,
    } = get();
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName, projectDescription, theme, pollingInterval,
          pollingEnabled, compactMode, animationsEnabled, timezone,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setProjectName: (name) => set({ projectName: name }),
  setProjectDescription: (desc) => set({ projectDescription: desc }),
  setTheme: (theme) => set({ theme }),
  setPollingInterval: (interval) => set({ pollingInterval: interval }),
  setPollingEnabled: (enabled) => set({ pollingEnabled: enabled }),
  setCompactMode: (compact) => set({ compactMode: compact }),
  setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
  setTimezone: (tz) => set({ timezone: tz }),
}));
