import type { Repository, Commit, PullRequest, CodeHealthScore } from "@/types/codebase";

export const seedRepositories: Repository[] = [];

export const seedCommits: Commit[] = [];

export const seedPullRequests: PullRequest[] = [];

export const seedCodeHealth: CodeHealthScore = {
  overall: 0,
  testCoverage: 0,
  technicalDebt: 0,
  securityIssues: 0,
  dependencyFreshness: 0,
  aiCodeRatio: 0,
};
