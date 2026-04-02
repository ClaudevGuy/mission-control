import { create } from "zustand";
import type { Repository, Commit, PullRequest, CodeHealthScore } from "@/types/codebase";
import { isFresh, markFetched, markInflight } from "@/lib/store-cache";

const emptyCodeHealth: CodeHealthScore = {
  overall: 0,
  testCoverage: 0,
  technicalDebt: 0,
  securityIssues: 0,
  dependencyFreshness: 0,
  aiCodeRatio: 0,
};

interface CodebaseStore {
  repositories: Repository[];
  commits: Commit[];
  pullRequests: PullRequest[];
  codeHealth: CodeHealthScore;
  isLoading: boolean;
  error: string | null;
  selectedRepo: string;
  prStatusFilter: "all" | "open" | "merged" | "closed";
  showAgentCommitsOnly: boolean;
  fetch: () => Promise<void>;
  setSelectedRepo: (repo: string) => void;
  setPRStatusFilter: (status: "all" | "open" | "merged" | "closed") => void;
  setShowAgentCommitsOnly: (show: boolean) => void;
  getFilteredCommits: () => Commit[];
  getFilteredPRs: () => PullRequest[];
}

export const useCodebaseStore = create<CodebaseStore>((set, get) => ({
  repositories: [],
  commits: [],
  pullRequests: [],
  codeHealth: emptyCodeHealth,
  isLoading: false,
  error: null,
  selectedRepo: "all",
  prStatusFilter: "all",
  showAgentCommitsOnly: false,

  fetch: async () => {
    if (isFresh("codebase")) return;
    markInflight("codebase");
    set({ isLoading: true, error: null });
    try {
      const [reposRes, commitsRes, prsRes, healthRes] = await Promise.all([
        fetch("/api/codebase/repositories"),
        fetch("/api/codebase/commits"),
        fetch("/api/codebase/pull-requests"),
        fetch("/api/codebase/health"),
      ]);
      if (!reposRes.ok) throw new Error("Failed to fetch repositories");
      if (!commitsRes.ok) throw new Error("Failed to fetch commits");
      if (!prsRes.ok) throw new Error("Failed to fetch pull requests");
      if (!healthRes.ok) throw new Error("Failed to fetch code health");
      const [reposData, commitsData, prsData, healthData] = await Promise.all([
        reposRes.json(),
        commitsRes.json(),
        prsRes.json(),
        healthRes.json(),
      ]);
      markFetched("codebase");
      set({
        repositories: reposData.data.repositories,
        commits: commitsData.data.commits,
        pullRequests: prsData.data.pullRequests,
        codeHealth: healthData.data.health,
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setSelectedRepo: (repo) => set({ selectedRepo: repo }),
  setPRStatusFilter: (status) => set({ prStatusFilter: status }),
  setShowAgentCommitsOnly: (show) => set({ showAgentCommitsOnly: show }),

  getFilteredCommits: () => {
    const { commits, showAgentCommitsOnly } = get();
    if (showAgentCommitsOnly) return commits.filter((c) => c.isAgent);
    return commits;
  },

  getFilteredPRs: () => {
    const { pullRequests, prStatusFilter } = get();
    if (prStatusFilter === "all") return pullRequests;
    return pullRequests.filter((pr) => pr.status === prStatusFilter);
  },
}));
