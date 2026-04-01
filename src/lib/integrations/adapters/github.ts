import { prisma } from "@/lib/prisma";
import type { IntegrationAdapter, ConfigField } from "../types";

export const githubAdapter: IntegrationAdapter = {
  name: "GitHub",
  category: "SOURCE_CONTROL",

  getConfigFields(): ConfigField[] {
    return [
      {
        key: "token",
        label: "Personal Access Token",
        type: "password",
        placeholder: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        required: true,
      },
    ];
  },

  async testConnection(
    config: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          success: false,
          error: body.message || `GitHub API returned ${res.status}`,
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: `Connection failed: ${(err as Error).message}`,
      };
    }
  },

  async sync(projectId: string, config: Record<string, string>): Promise<void> {
    const headers = {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Fetch user's repos
    const reposRes = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated",
      { headers }
    );
    if (!reposRes.ok) throw new Error(`GitHub repos fetch failed: ${reposRes.status}`);
    const repos = await reposRes.json();

    for (const repo of repos.slice(0, 20)) {
      // Upsert repository
      const repoRecord = await prisma.repository.upsert({
        where: {
          id: `gh-${repo.id}`,
        },
        update: {
          name: repo.full_name,
          url: repo.html_url,
          lastCommit: repo.pushed_at || repo.updated_at,
          branch: repo.default_branch,
          ciStatus: "PASSING" as never,
          language: repo.language || "Unknown",
        },
        create: {
          id: `gh-${repo.id}`,
          projectId,
          name: repo.full_name,
          url: repo.html_url,
          lastCommit: repo.pushed_at || repo.updated_at,
          branch: repo.default_branch,
          ciStatus: "PASSING" as never,
          language: repo.language || "Unknown",
        },
      });

      // Fetch recent commits (last 10)
      const commitsRes = await fetch(
        `https://api.github.com/repos/${repo.full_name}/commits?per_page=10`,
        { headers }
      );
      if (commitsRes.ok) {
        const commits = await commitsRes.json();
        for (const c of commits) {
          await prisma.commit.upsert({
            where: { id: `ghc-${c.sha.slice(0, 12)}` },
            update: {
              message: c.commit.message,
              author: c.commit.author?.name || "Unknown",
              timestamp: new Date(c.commit.author?.date || Date.now()),
            },
            create: {
              id: `ghc-${c.sha.slice(0, 12)}`,
              repositoryId: repoRecord.id,
              hash: c.sha,
              message: c.commit.message,
              author: c.commit.author?.name || "Unknown",
              isAgent: false,
              timestamp: new Date(c.commit.author?.date || Date.now()),
              filesChanged: c.stats?.total || 0,
              additions: c.stats?.additions || 0,
              deletions: c.stats?.deletions || 0,
            },
          });
        }
      }

      // Fetch open PRs (last 10)
      const prsRes = await fetch(
        `https://api.github.com/repos/${repo.full_name}/pulls?state=all&per_page=10&sort=updated`,
        { headers }
      );
      if (prsRes.ok) {
        const prs = await prsRes.json();
        for (const pr of prs) {
          const prStatus =
            pr.state === "open"
              ? "OPEN"
              : pr.merged_at
                ? "MERGED"
                : "CLOSED";

          await prisma.pullRequest.upsert({
            where: { id: `ghpr-${pr.id}` },
            update: {
              title: pr.title,
              author: pr.user?.login || "Unknown",
              status: prStatus as never,
              labels: pr.labels?.map((l: { name: string }) => l.name) || [],
              reviewers:
                pr.requested_reviewers?.map(
                  (r: { login: string }) => r.login
                ) || [],
              additions: pr.additions || 0,
              deletions: pr.deletions || 0,
            },
            create: {
              id: `ghpr-${pr.id}`,
              repositoryId: repoRecord.id,
              title: pr.title,
              author: pr.user?.login || "Unknown",
              status: prStatus as never,
              createdAt: new Date(pr.created_at),
              labels: pr.labels?.map((l: { name: string }) => l.name) || [],
              reviewers:
                pr.requested_reviewers?.map(
                  (r: { login: string }) => r.login
                ) || [],
              additions: pr.additions || 0,
              deletions: pr.deletions || 0,
            },
          });
        }
      }
    }
  },
};
