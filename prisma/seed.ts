import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// ── Seed data imports ──
import { seedAgents } from "../src/data/agents";
import { seedDeployments, seedEnvironments, seedFeatureFlags } from "../src/data/deployments";
import { seedResourceMetrics, seedServiceNodes, seedAPIEndpoints, seedQueueMetrics } from "../src/data/infrastructure";
import { seedCostBreakdown, seedAgentCosts, seedBudgets, seedInvoices, seedDailyCosts } from "../src/data/costs";
import { seedLogs, seedErrorGroups, seedLLMCalls, seedTraceSpans } from "../src/data/logs";
import { seedTeamMembers, seedAuditLog, seedAPIKeys } from "../src/data/team";
import { seedIntegrations, seedWebhooks } from "../src/data/integrations";
import { seedIncidents, seedAlertRules, seedOnCallSchedule } from "../src/data/incidents";
import { seedRepositories, seedCommits, seedPullRequests, seedCodeHealth } from "../src/data/codebase";
import { seedAnalytics } from "../src/data/analytics";

const prisma = new PrismaClient();

// ── Enum mappers ──

function mapAgentStatus(s: string) {
  const map: Record<string, string> = {
    running: "RUNNING",
    idle: "IDLE",
    paused: "PAUSED",
    error: "ERROR",
    deploying: "DEPLOYING",
  };
  return map[s.toLowerCase()] ?? "IDLE";
}

function mapModelProvider(m: string) {
  const map: Record<string, string> = {
    claude: "CLAUDE",
    "gpt-4": "GPT4",
    gpt4: "GPT4",
    gemini: "GEMINI",
    custom: "CUSTOM",
  };
  return map[m.toLowerCase()] ?? "CUSTOM";
}

function mapDeployStage(s: string) {
  const map: Record<string, string> = {
    production: "PRODUCTION",
    staging: "STAGING",
    dev: "DEV",
    review: "REVIEW",
  };
  return map[s.toLowerCase()] ?? "DEV";
}

function mapDeployStatus(s: string) {
  const map: Record<string, string> = {
    success: "SUCCESS",
    failed: "FAILED",
    in_progress: "IN_PROGRESS",
    rolled_back: "ROLLED_BACK",
    pending: "PENDING",
  };
  return map[s.toLowerCase()] ?? "PENDING";
}

function mapEnvironment(e: string) {
  const map: Record<string, string> = {
    production: "PRODUCTION",
    staging: "STAGING",
    development: "DEVELOPMENT",
  };
  return map[e.toLowerCase()] ?? "DEVELOPMENT";
}

function mapHealthStatus(s: string) {
  const map: Record<string, string> = {
    healthy: "HEALTHY",
    degraded: "DEGRADED",
    down: "DOWN",
  };
  return map[s.toLowerCase()] ?? "HEALTHY";
}

function mapServiceType(t: string) {
  const map: Record<string, string> = {
    api: "API",
    worker: "WORKER",
    database: "DATABASE_TYPE",
    cache: "CACHE",
    queue: "QUEUE",
    cdn: "CDN",
  };
  return map[t.toLowerCase()] ?? "API";
}

function mapLogLevel(l: string) {
  const map: Record<string, string> = {
    debug: "DEBUG",
    info: "INFO",
    warn: "WARN",
    error: "ERROR",
  };
  return map[l.toLowerCase()] ?? "INFO";
}

function mapRunStatus(s: string) {
  const map: Record<string, string> = {
    success: "RUN_SUCCESS",
    failed: "RUN_FAILED",
    running: "RUN_RUNNING",
  };
  return map[s.toLowerCase()] ?? "RUN_RUNNING";
}

function mapSpanStatus(s: string) {
  return s.toLowerCase() === "ok" ? "OK" : "SPAN_ERROR";
}

function mapIncidentSeverity(s: string) {
  return s.toUpperCase() as "P1" | "P2" | "P3";
}

function mapIncidentStatus(s: string) {
  const map: Record<string, string> = {
    open: "OPEN",
    investigating: "INVESTIGATING",
    resolved: "RESOLVED",
  };
  return map[s.toLowerCase()] ?? "OPEN";
}

function mapIntegrationStatus(s: string) {
  const map: Record<string, string> = {
    connected: "CONNECTED",
    disconnected: "DISCONNECTED",
    error: "ERROR",
  };
  return map[s.toLowerCase()] ?? "DISCONNECTED";
}

function mapIntegrationCategory(c: string) {
  const map: Record<string, string> = {
    source_control: "SOURCE_CONTROL",
    communication: "COMMUNICATION",
    deployment: "DEPLOYMENT",
    monitoring: "MONITORING",
    ai: "AI",
    database: "DATABASE",
    payment: "PAYMENT",
    automation: "AUTOMATION",
  };
  return map[c.toLowerCase()] ?? "AUTOMATION";
}

function mapWebhookStatus(s: string) {
  return s.toLowerCase() === "active" ? "ACTIVE" : "INACTIVE";
}

function mapInvoiceStatus(s: string) {
  const map: Record<string, string> = {
    paid: "PAID",
    pending: "PENDING",
    overdue: "OVERDUE",
  };
  return map[s.toLowerCase()] ?? "PENDING";
}

function mapAlertCondition(c: string) {
  const map: Record<string, string> = {
    gt: "GT",
    lt: "LT",
    eq: "EQ",
  };
  return map[c.toLowerCase()] ?? "GT";
}

function mapAlertChannels(channels: string[]) {
  const map: Record<string, string> = {
    slack: "SLACK",
    email: "EMAIL",
    pagerduty: "PAGERDUTY",
  };
  return channels.map((c) => map[c.toLowerCase()] ?? "SLACK");
}

function mapCIStatus(s: string) {
  const map: Record<string, string> = {
    passing: "PASSING",
    failing: "FAILING",
    pending: "CI_PENDING",
  };
  return map[s.toLowerCase()] ?? "CI_PENDING";
}

function mapPRStatus(s: string) {
  const map: Record<string, string> = {
    open: "OPEN",
    merged: "MERGED",
    closed: "CLOSED",
  };
  return map[s.toLowerCase()] ?? "OPEN";
}

function mapTeamRole(r: string) {
  const map: Record<string, string> = {
    admin: "ADMIN",
    developer: "DEVELOPER",
    agent_manager: "AGENT_MANAGER",
    viewer: "VIEWER",
  };
  return map[r.toLowerCase()] ?? "VIEWER";
}

// ── Main seed ──

async function main() {
  console.log("Seeding Mission Control database...\n");

  // ── 1. Clear all existing data (reverse-dependency order) ──
  console.log("Clearing existing data...");
  await prisma.notification.deleteMany();
  await prisma.growthMetric.deleteMany();
  await prisma.conversionStep.deleteMany();
  await prisma.featureUsage.deleteMany();
  await prisma.geoData.deleteMany();
  await prisma.retentionCohort.deleteMany();
  await prisma.analyticsSnapshot.deleteMany();
  await prisma.codeHealthScore.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.commit.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.onCallSchedule.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.webhook.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.traceSpan.deleteMany();
  await prisma.llmCall.deleteMany();
  await prisma.errorGroup.deleteMany();
  await prisma.logEntry.deleteMany();
  await prisma.dailyCost.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.agentCost.deleteMany();
  await prisma.costSubcategory.deleteMany();
  await prisma.costBreakdown.deleteMany();
  await prisma.queueMetric.deleteMany();
  await prisma.apiEndpoint.deleteMany();
  await prisma.serviceNode.deleteMany();
  await prisma.resourceMetric.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.environmentConfig.deleteMany();
  await prisma.evalResult.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.agentTool.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
  console.log("  Done.\n");

  // ── 2. Create default project ──
  console.log("Creating project...");
  const project = await prisma.project.create({
    data: {
      id: "proj_mission_control",
      name: "Mission Control",
      description: "AI-powered operations dashboard for RecoupFi",
      timezone: "America/New_York",
    },
  });
  console.log(`  Project: ${project.name} (${project.id})\n`);

  // ── 3. Create users ──
  console.log("Creating users...");
  const passwordHash = await bcrypt.hash("password123", 12);

  // Single admin user for auth fallback — no mock team members
  const userDefs = [
    { id: "usr_admin", name: "Admin", email: "admin@missioncontrol.local", role: "ADMIN" as const, avatar: "", twoFAEnabled: false, jobTitle: "Administrator" },
  ];

  const users: Record<string, { id: string; name: string }> = {};
  for (const u of userDefs) {
    const user = await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar,
        image: u.avatar,
        twoFAEnabled: u.twoFAEnabled,
        jobTitle: u.jobTitle,
        passwordHash,
      },
    });
    users[u.id] = { id: user.id, name: user.name! };
    console.log(`  User: ${user.name} (${user.role})`);
  }
  console.log();

  // ── 4. Create project members ──
  console.log("Creating project members...");
  for (const u of userDefs) {
    await prisma.projectMember.create({
      data: {
        userId: u.id,
        projectId: project.id,
        role: u.role,
      },
    });
  }
  console.log(`  ${userDefs.length} members linked.\n`);

  // ── 5. Seed agents ──
  console.log("Seeding agents...");
  // Map createdBy name -> userId
  const nameToUserId: Record<string, string> = {};
  for (const u of userDefs) {
    nameToUserId[u.name] = u.id;
  }

  for (const a of seedAgents) {
    const agent = await prisma.agent.create({
      data: {
        id: a.id,
        projectId: project.id,
        name: a.name,
        description: a.description,
        model: mapModelProvider(a.model) as never,
        status: mapAgentStatus(a.status) as never,
        systemPrompt: a.systemPrompt,
        temperature: a.temperature,
        maxTokens: a.maxTokens,
        tags: a.tags,
        healthScore: a.healthScore,
        contextWindowUsage: a.contextWindowUsage,
        tokenUsage: a.tokenUsage,
        avgLatency: a.avgLatency,
        costPerHour: a.costPerHour,
        totalCost: a.totalCost,
        errorRate: a.errorRate,
        tasksCompleted: a.tasksCompleted,
        lastRun: a.lastRun ? new Date(a.lastRun) : null,
        createdAt: new Date(a.createdAt),
        createdBy: nameToUserId[a.createdBy] || "usr_001",
      },
    });

    // Tools
    for (const t of a.tools) {
      await prisma.agentTool.create({
        data: {
          agentId: agent.id,
          name: t.name,
          enabled: t.enabled,
          usageCount: t.usageCount,
        },
      });
    }

    // Runs
    for (const r of a.runs) {
      await prisma.agentRun.create({
        data: {
          id: r.id,
          agentId: agent.id,
          startedAt: new Date(r.startedAt),
          duration: r.duration,
          status: mapRunStatus(r.status) as never,
          tokensUsed: r.tokensUsed,
          cost: r.cost,
          output: r.output,
        },
      });
    }

    // Eval results
    for (const e of a.evalResults) {
      await prisma.evalResult.create({
        data: {
          agentId: agent.id,
          name: e.name,
          passed: e.passed,
          score: e.score,
          details: e.details,
        },
      });
    }

    console.log(`  Agent: ${a.name} (${a.tools.length} tools, ${a.runs.length} runs, ${a.evalResults.length} evals)`);
  }
  console.log();

  // ── 6. Seed deployments ──
  console.log("Seeding deployments...");
  for (const d of seedDeployments) {
    await prisma.deployment.create({
      data: {
        id: d.id,
        projectId: project.id,
        service: d.service,
        version: d.version,
        stage: mapDeployStage(d.stage) as never,
        status: mapDeployStatus(d.status) as never,
        timestamp: new Date(d.timestamp),
        duration: d.duration,
        triggeredBy: d.triggeredBy,
        isAgent: d.isAgent,
        commitHash: d.commitHash,
        changelog: d.changelog,
        environment: mapEnvironment(d.environment) as never,
      },
    });
  }
  console.log(`  ${seedDeployments.length} deployments.\n`);

  // ── 7. Seed environment configs ──
  console.log("Seeding environment configs...");
  for (const e of seedEnvironments) {
    await prisma.environmentConfig.create({
      data: {
        projectId: project.id,
        name: mapEnvironment(e.name) as never,
        status: mapHealthStatus(e.status) as never,
        lastDeploy: new Date(e.lastDeploy),
        currentVersion: e.currentVersion,
        uptime: e.uptime,
        activeUsers: e.activeUsers,
        healthChecks: e.healthChecks as never,
      },
    });
  }
  console.log(`  ${seedEnvironments.length} environments.\n`);

  // ── 8. Seed feature flags ──
  console.log("Seeding feature flags...");
  for (const f of seedFeatureFlags) {
    await prisma.featureFlag.create({
      data: {
        id: f.id,
        projectId: project.id,
        name: f.name,
        description: f.description,
        environments: f.environments as never,
      },
    });
  }
  console.log(`  ${seedFeatureFlags.length} feature flags.\n`);

  // ── 9. Seed infrastructure ──
  console.log("Seeding infrastructure...");
  for (const r of seedResourceMetrics) {
    await prisma.resourceMetric.create({
      data: {
        projectId: project.id,
        label: r.label,
        value: r.value,
        max: r.max,
        unit: r.unit,
        trend: r.trend,
      },
    });
  }
  for (const s of seedServiceNodes) {
    await prisma.serviceNode.create({
      data: {
        id: s.id,
        projectId: project.id,
        name: s.name,
        status: mapHealthStatus(s.status) as never,
        type: mapServiceType(s.type) as never,
        connections: s.connections,
        latency: s.latency,
      },
    });
  }
  for (const e of seedAPIEndpoints) {
    await prisma.apiEndpoint.create({
      data: {
        projectId: project.id,
        path: e.path,
        method: e.method,
        p50: e.p50,
        p95: e.p95,
        p99: e.p99,
        errorRate: e.errorRate,
        rps: e.rps,
        status: mapHealthStatus(e.status) as never,
      },
    });
  }
  for (const q of seedQueueMetrics) {
    await prisma.queueMetric.create({
      data: {
        projectId: project.id,
        name: q.name,
        depth: q.depth,
        processingRate: q.processingRate,
        dlqCount: q.dlqCount,
      },
    });
  }
  console.log(`  ${seedResourceMetrics.length} resources, ${seedServiceNodes.length} services, ${seedAPIEndpoints.length} endpoints, ${seedQueueMetrics.length} queues.\n`);

  // ── 10. Seed costs ──
  console.log("Seeding costs...");
  for (const cb of seedCostBreakdown) {
    const breakdown = await prisma.costBreakdown.create({
      data: {
        projectId: project.id,
        category: cb.category,
        total: cb.total,
      },
    });
    for (const sub of cb.subcategories) {
      await prisma.costSubcategory.create({
        data: {
          breakdownId: breakdown.id,
          name: sub.name,
          amount: sub.amount,
          trend: sub.trend,
        },
      });
    }
  }
  for (const ac of seedAgentCosts) {
    await prisma.agentCost.create({
      data: {
        projectId: project.id,
        agentId: ac.agentId,
        agentName: ac.agentName,
        costPerRun: ac.costPerRun,
        totalRuns: ac.totalRuns,
        totalCost: ac.totalCost,
        trend: ac.trend,
      },
    });
  }
  for (const b of seedBudgets) {
    await prisma.budget.create({
      data: {
        projectId: project.id,
        category: b.category,
        budgetLimit: b.limit,
        spent: b.spent,
        alertThreshold: b.alertThreshold / 100, // Normalize to 0-1
      },
    });
  }
  for (const inv of seedInvoices) {
    await prisma.invoice.create({
      data: {
        id: inv.id,
        projectId: project.id,
        date: new Date(inv.date),
        amount: inv.amount,
        status: mapInvoiceStatus(inv.status) as never,
      },
    });
  }
  for (const dc of seedDailyCosts) {
    await prisma.dailyCost.create({
      data: {
        projectId: project.id,
        date: new Date(dc.date),
        value: dc.value,
      },
    });
  }
  console.log(`  ${seedCostBreakdown.length} breakdowns, ${seedAgentCosts.length} agent costs, ${seedBudgets.length} budgets, ${seedInvoices.length} invoices, ${seedDailyCosts.length} daily costs.\n`);

  // ── 11. Seed logs ──
  console.log("Seeding logs...");
  for (const l of seedLogs) {
    await prisma.logEntry.create({
      data: {
        id: l.id,
        projectId: project.id,
        timestamp: new Date(l.timestamp),
        level: mapLogLevel(l.level) as never,
        service: l.service,
        message: l.message,
        agentId: l.agentId ?? null,
        userId: l.userId ?? null,
        traceId: l.traceId ?? null,
        metadata: l.metadata as never ?? null,
      },
    });
  }
  console.log(`  ${seedLogs.length} log entries.`);

  for (const eg of seedErrorGroups) {
    await prisma.errorGroup.create({
      data: {
        id: eg.id,
        projectId: project.id,
        message: eg.message,
        count: eg.count,
        firstSeen: new Date(eg.firstSeen),
        lastSeen: new Date(eg.lastSeen),
        affectedUsers: eg.affectedUsers,
        stackTrace: eg.stackTrace,
        service: eg.service,
      },
    });
  }
  console.log(`  ${seedErrorGroups.length} error groups.`);

  for (const llm of seedLLMCalls) {
    await prisma.llmCall.create({
      data: {
        id: llm.id,
        projectId: project.id,
        timestamp: new Date(llm.timestamp),
        model: llm.model,
        prompt: llm.prompt,
        response: llm.response,
        tokensIn: llm.tokensIn,
        tokensOut: llm.tokensOut,
        latency: llm.latency,
        cost: llm.cost,
        agentId: llm.agentId,
        agentName: llm.agentName,
      },
    });
  }
  console.log(`  ${seedLLMCalls.length} LLM calls.`);

  for (const ts of seedTraceSpans) {
    await prisma.traceSpan.create({
      data: {
        id: ts.id,
        projectId: project.id,
        traceId: ts.traceId,
        name: ts.name,
        service: ts.service,
        start: ts.start,
        duration: ts.duration,
        status: mapSpanStatus(ts.status) as never,
      },
    });
  }
  console.log(`  ${seedTraceSpans.length} trace spans.\n`);

  // ── 12. Seed team data ──
  console.log("Seeding team data...");
  for (const al of seedAuditLog) {
    await prisma.auditLogEntry.create({
      data: {
        id: al.id,
        projectId: project.id,
        userId: al.userId,
        userName: al.userName,
        action: al.action,
        target: al.target,
        timestamp: new Date(al.timestamp),
        details: al.details,
      },
    });
  }
  console.log(`  ${seedAuditLog.length} audit log entries.`);

  for (const key of seedAPIKeys) {
    // Find the user by name to get the createdById
    const creatorEntry = userDefs.find((u) => u.name === key.createdBy);
    const createdById = creatorEntry?.id || "usr_001";
    await prisma.apiKey.create({
      data: {
        id: key.id,
        projectId: project.id,
        name: key.name,
        prefix: key.prefix,
        hashedKey: await bcrypt.hash(key.prefix + "_secret", 10),
        scopes: key.scopes,
        createdAt: new Date(key.createdAt),
        lastUsed: key.lastUsed ? new Date(key.lastUsed) : null,
        createdById,
        status: "active",
      },
    });
  }
  console.log(`  ${seedAPIKeys.length} API keys.\n`);

  // ── 13. Seed integrations ──
  console.log("Seeding integrations...");
  for (const int of seedIntegrations) {
    await prisma.integration.create({
      data: {
        id: int.id,
        projectId: project.id,
        name: int.name,
        description: int.description,
        icon: int.icon,
        status: mapIntegrationStatus(int.status) as never,
        category: mapIntegrationCategory(int.category) as never,
        connectedAt: int.connectedAt ? new Date(int.connectedAt) : null,
        lastSync: int.lastSync ? new Date(int.lastSync) : null,
      },
    });
  }
  console.log(`  ${seedIntegrations.length} integrations.`);

  for (const wh of seedWebhooks) {
    await prisma.webhook.create({
      data: {
        id: wh.id,
        projectId: project.id,
        url: wh.url,
        events: wh.events,
        status: mapWebhookStatus(wh.status) as never,
        lastDelivery: wh.lastDelivery ? new Date(wh.lastDelivery) : null,
        successRate: wh.successRate,
        secret: `whsec_${wh.id}_${Date.now()}`,
      },
    });
  }
  console.log(`  ${seedWebhooks.length} webhooks.\n`);

  // ── 14. Seed incidents ──
  console.log("Seeding incidents...");
  for (const inc of seedIncidents) {
    // Find assignee userId
    const assigneeUser = userDefs.find((u) => u.name === inc.assignee?.name);
    await prisma.incident.create({
      data: {
        id: inc.id,
        projectId: project.id,
        title: inc.title,
        description: inc.description,
        severity: mapIncidentSeverity(inc.severity) as never,
        status: mapIncidentStatus(inc.status) as never,
        createdAt: new Date(inc.createdAt),
        assigneeId: assigneeUser?.id ?? null,
        affectedServices: inc.affectedServices,
        timeline: inc.timeline as never,
      },
    });
  }
  console.log(`  ${seedIncidents.length} incidents.`);

  for (const ar of seedAlertRules) {
    await prisma.alertRule.create({
      data: {
        id: ar.id,
        projectId: project.id,
        name: ar.name,
        metric: ar.metric,
        condition: mapAlertCondition(ar.condition) as never,
        threshold: ar.threshold,
        duration: "5m",
        channels: mapAlertChannels(ar.channels) as never,
        enabled: ar.enabled,
        lastTriggered: ar.lastTriggered ? new Date(ar.lastTriggered) : null,
      },
    });
  }
  console.log(`  ${seedAlertRules.length} alert rules.`);

  for (const oc of seedOnCallSchedule) {
    // Find member userId by name
    const memberUser = userDefs.find((u) => u.name === oc.member);
    if (memberUser) {
      await prisma.onCallSchedule.create({
        data: {
          id: oc.id,
          projectId: project.id,
          memberId: memberUser.id,
          startDate: new Date(oc.startDate),
          endDate: new Date(oc.endDate),
        },
      });
    }
  }
  console.log(`  ${seedOnCallSchedule.length} on-call schedules.\n`);

  // ── 15. Seed codebase ──
  console.log("Seeding codebase...");
  for (const repo of seedRepositories) {
    await prisma.repository.create({
      data: {
        id: repo.id,
        projectId: project.id,
        name: repo.name,
        url: repo.url,
        lastCommit: repo.lastCommit,
        branch: repo.branch,
        ciStatus: mapCIStatus(repo.ciStatus) as never,
        language: repo.language,
      },
    });
  }
  console.log(`  ${seedRepositories.length} repositories.`);

  // All commits belong to the first repo for simplicity
  const primaryRepoId = seedRepositories.length > 0 ? seedRepositories[0].id : null;
  for (const c of seedCommits) {
    if (!primaryRepoId) break;
    await prisma.commit.create({
      data: {
        id: c.id,
        repositoryId: primaryRepoId,
        hash: c.hash,
        message: c.message,
        author: c.author,
        isAgent: c.isAgent,
        timestamp: new Date(c.timestamp),
        filesChanged: c.filesChanged,
        additions: c.additions,
        deletions: c.deletions,
      },
    });
  }
  console.log(`  ${seedCommits.length} commits.`);

  for (const pr of seedPullRequests) {
    if (!primaryRepoId) break;
    await prisma.pullRequest.create({
      data: {
        id: pr.id,
        repositoryId: primaryRepoId,
        title: pr.title,
        author: pr.author,
        status: mapPRStatus(pr.status) as never,
        createdAt: new Date(pr.createdAt),
        labels: pr.labels,
        reviewers: pr.reviewers,
        additions: pr.additions,
        deletions: pr.deletions,
      },
    });
  }
  console.log(`  ${seedPullRequests.length} pull requests.`);

  await prisma.codeHealthScore.create({
    data: {
      projectId: project.id,
      overall: seedCodeHealth.overall,
      testCoverage: seedCodeHealth.testCoverage,
      technicalDebt: seedCodeHealth.technicalDebt,
      securityIssues: seedCodeHealth.securityIssues,
      dependencyFreshness: seedCodeHealth.dependencyFreshness,
      aiCodeRatio: seedCodeHealth.aiCodeRatio,
    },
  });
  console.log("  Code health score.\n");

  // ── 16. Seed analytics ──
  console.log("Seeding analytics...");
  const now = new Date();

  // DAU/WAU/MAU snapshot (single overview record)
  await prisma.analyticsSnapshot.create({
    data: {
      projectId: project.id,
      date: now,
      dau: seedAnalytics.overview.dau,
      wau: seedAnalytics.overview.wau,
      mau: seedAnalytics.overview.mau,
    },
  });
  console.log("  1 analytics snapshot.");

  // Retention cohorts
  for (const cohort of seedAnalytics.retention) {
    await prisma.retentionCohort.create({
      data: {
        projectId: project.id,
        cohortWeek: cohort.cohortWeek,
        weekIndex: cohort.weekIndex,
        retentionRate: cohort.retentionRate,
      },
    });
  }
  console.log(`  ${seedAnalytics.retention.length} retention cohorts.`);

  // Geo data
  for (const g of seedAnalytics.geo) {
    await prisma.geoData.create({
      data: {
        projectId: project.id,
        country: g.country,
        users: g.users,
        snapshotDate: now,
      },
    });
  }
  console.log(`  ${seedAnalytics.geo.length} geo data entries.`);

  // Feature usage
  for (const f of seedAnalytics.features) {
    await prisma.featureUsage.create({
      data: {
        projectId: project.id,
        feature: f.feature,
        usage: f.usage,
        trend: f.trend,
        snapshotDate: now,
      },
    });
  }
  console.log(`  ${seedAnalytics.features.length} feature usage entries.`);

  // Conversion funnel
  for (const step of seedAnalytics.funnel) {
    await prisma.conversionStep.create({
      data: {
        projectId: project.id,
        stage: step.stage,
        count: step.count,
        snapshotDate: now,
      },
    });
  }
  console.log(`  ${seedAnalytics.funnel.length} conversion steps.`);

  // Growth metrics
  for (const gm of seedAnalytics.growth) {
    await prisma.growthMetric.create({
      data: {
        projectId: project.id,
        metric: gm.metric,
        current: gm.current,
        previous: gm.previous,
        snapshotDate: now,
      },
    });
  }
  console.log(`  ${seedAnalytics.growth.length} growth metrics.\n`);

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
