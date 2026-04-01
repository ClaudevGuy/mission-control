import { create } from "zustand";
import type { TeamMember, AuditLogEntry, APIKey } from "@/types/team";
import type { TeamRole } from "@/types/common";

interface TeamStore {
  members: TeamMember[];
  auditLog: AuditLogEntry[];
  apiKeys: APIKey[];
  isLoading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
  updateMemberRole: (id: string, role: TeamRole) => void;
  removeMember: (id: string) => void;
  addAuditEntry: (entry: AuditLogEntry) => void;
  revokeAPIKey: (id: string) => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  members: [],
  auditLog: [],
  apiKeys: [],
  isLoading: false,
  error: null,

  fetch: async () => {
    set({ isLoading: true, error: null });
    try {
      const [membersRes, auditRes, keysRes] = await Promise.all([
        fetch("/api/team/members"),
        fetch("/api/team/audit-log"),
        fetch("/api/team/api-keys"),
      ]);
      if (!membersRes.ok) throw new Error("Failed to fetch team members");
      if (!auditRes.ok) throw new Error("Failed to fetch audit log");
      if (!keysRes.ok) throw new Error("Failed to fetch API keys");
      const [membersData, auditData, keysData] = await Promise.all([
        membersRes.json(),
        auditRes.json(),
        keysRes.json(),
      ]);
      set({
        members: membersData.data,
        auditLog: auditData.data,
        apiKeys: keysData.data,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateMemberRole: async (id, role) => {
    set((state) => ({
      members: state.members.map((m) =>
        m.id === id ? { ...m, role } : m
      ),
    }));
    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update member role");
    } catch {
      get().fetch();
    }
  },

  removeMember: async (id) => {
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
    }));
    try {
      const res = await fetch(`/api/team/members/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove member");
    } catch {
      get().fetch();
    }
  },

  addAuditEntry: (entry) =>
    set((state) => ({ auditLog: [entry, ...state.auditLog] })),

  revokeAPIKey: async (id) => {
    set((state) => ({
      apiKeys: state.apiKeys.filter((k) => k.id !== id),
    }));
    try {
      const res = await fetch(`/api/team/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke API key");
    } catch {
      get().fetch();
    }
  },
}));
