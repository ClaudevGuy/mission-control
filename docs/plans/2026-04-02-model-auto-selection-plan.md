# Model Auto-Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a runtime model selection engine that automatically picks the optimal model tier per task within an agent's provider family, balancing cost and quality with safety guardrails.

**Architecture:** Agent stores a `modelStrategy` field. At execution time, the profiler builds a `TaskProfile` from agent config + task input, the selector scores complexity and returns a specific model ID + tier. LlmCall records the decision for audit and cost analysis.

**Tech Stack:** TypeScript, Prisma (PostgreSQL), Next.js API routes, React (agent builder wizard), Recharts (charts), Zustand (state), Zod (validation)

---

### Task 1: Schema Migration — Add New Fields

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add `modelStrategy` to Agent model**

In `prisma/schema.prisma`, find the Agent model (around line 310). Add after the `model` field:

```prisma
modelStrategy      String        @default("auto")
```

**Step 2: Add selection fields to LlmCall model**

In `prisma/schema.prisma`, find the LlmCall model (around line 630). Add after `agentName`:

```prisma
selectedTier        Int?
selectionReason     String?
wasUpgraded         Boolean       @default(false)
originalTier        Int?
selectionDurationMs Int?
```

**Step 3: Generate and run migration**

Run: `npx prisma migrate dev --name add-model-strategy`

Expected: Migration creates successfully, adds column to Agent and 5 columns to LlmCall.

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(schema): add modelStrategy to Agent and selection fields to LlmCall"
```

---

### Task 2: TypeScript Types — Add ModelStrategy and Update Interfaces

**Files:**
- Modify: `src/types/common.ts`
- Modify: `src/types/agents.ts`
- Modify: `src/types/logs.ts`

**Step 1: Add ModelStrategy type to common.ts**

In `src/types/common.ts`, add after the `ModelProvider` line (line 8):

```typescript
export type ModelStrategy = "auto" | "manual" | "cost_first" | "quality_first";
```

**Step 2: Add modelStrategy to Agent interface**

In `src/types/agents.ts`, add after line 30 (`model: ModelProvider;`):

```typescript
modelStrategy: ModelStrategy;
```

Also add the import at the top — change line 1 from:
```typescript
import type { AgentStatus, ModelProvider } from "./common";
```
to:
```typescript
import type { AgentStatus, ModelProvider, ModelStrategy } from "./common";
```

**Step 3: Add selection fields to LLMCall interface**

In `src/types/logs.ts`, add after line 37 (`agentName: string;`):

```typescript
selectedTier?: number | null;
selectionReason?: string | null;
wasUpgraded?: boolean;
originalTier?: number | null;
selectionDurationMs?: number | null;
```

**Step 4: Commit**

```bash
git add src/types/
git commit -m "feat(types): add ModelStrategy type and selection fields to Agent/LLMCall"
```

---

### Task 3: Core Engine — Model Tiers Registry & Selector

**Files:**
- Create: `src/lib/model-selector.ts`

**Step 1: Create the model selector**

Create `src/lib/model-selector.ts` with the full implementation:

```typescript
// ── Types ──

export type Tier = 1 | 2 | 3;
export type ProviderKey = "CLAUDE" | "GPT4" | "GEMINI" | "CUSTOM";

export interface TierConfig {
  modelId: string;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

export interface ModelSelection {
  modelId: string;
  tier: Tier;
  reason: string;
  provider: string;
  costRates: { input: number; output: number };
}

export interface TaskProfile {
  agentType: string;
  taskDescription: string;
  expectedOutputTokens: number;
  hasProductionAccess: boolean;
  isRepetitive: boolean;
  requiresReasoning: boolean;
  errorCostHigh: boolean;
  provider: ProviderKey;
  isFirstRun: boolean;
}

// ── Tiers Registry ──

const TIERS: Record<string, Record<Tier, TierConfig>> = {
  CLAUDE: {
    1: { modelId: "claude-opus-4-6",   inputCostPerMillion: 15,     outputCostPerMillion: 75 },
    2: { modelId: "claude-sonnet-4-6",  inputCostPerMillion: 3,      outputCostPerMillion: 15 },
    3: { modelId: "claude-haiku-4-5",   inputCostPerMillion: 0.80,   outputCostPerMillion: 4 },
  },
  GPT4: {
    1: { modelId: "gpt-4o",            inputCostPerMillion: 2.50,   outputCostPerMillion: 10 },
    2: { modelId: "gpt-4o-mini",       inputCostPerMillion: 0.15,   outputCostPerMillion: 0.60 },
    3: { modelId: "gpt-3.5-turbo",     inputCostPerMillion: 0.50,   outputCostPerMillion: 1.50 },
  },
  GEMINI: {
    1: { modelId: "gemini-2.5-pro",       inputCostPerMillion: 1.25,   outputCostPerMillion: 10 },
    2: { modelId: "gemini-2.0-flash",     inputCostPerMillion: 0.10,   outputCostPerMillion: 0.40 },
    3: { modelId: "gemini-1.5-flash-8b",  inputCostPerMillion: 0.0375, outputCostPerMillion: 0.15 },
  },
};

export function getTierConfig(provider: ProviderKey, tier: Tier): TierConfig | null {
  return TIERS[provider]?.[tier] ?? null;
}

export function getAllTiers(provider: ProviderKey): Record<Tier, TierConfig> | null {
  return TIERS[provider] ?? null;
}

// ── Selection Algorithm ──

export function selectModel(profile: TaskProfile): ModelSelection {
  // Custom provider: pass-through, always tier 2 equivalent
  if (profile.provider === "CUSTOM") {
    return {
      modelId: "custom",
      tier: 2,
      reason: "Custom provider — pass-through, no auto-selection",
      provider: "CUSTOM",
      costRates: { input: 0, output: 0 },
    };
  }

  const providerTiers = TIERS[profile.provider];
  if (!providerTiers) {
    const fallback = TIERS.CLAUDE;
    return buildSelection(fallback, 2, `Unknown provider ${profile.provider}, falling back to Claude tier 2`, profile.provider);
  }

  // ── SAFETY OVERRIDES — always tier 1 ──
  if (profile.hasProductionAccess) {
    return buildSelection(providerTiers, 1, "Safety override: agent has production access", profile.provider);
  }
  if (profile.errorCostHigh) {
    return buildSelection(providerTiers, 1, "Safety override: high error cost (critical/security/billing)", profile.provider);
  }
  if (profile.requiresReasoning && !profile.isRepetitive) {
    return buildSelection(providerTiers, 1, "Safety override: requires reasoning on non-repetitive task", profile.provider);
  }
  if (profile.agentType === "SecurityScanner") {
    return buildSelection(providerTiers, 1, "Safety override: SecurityScanner always uses tier 1", profile.provider);
  }
  if (profile.isFirstRun) {
    return buildSelection(providerTiers, 1, "Safety override: first run of new agent (unknown risk)", profile.provider);
  }

  // ── COMPLEXITY SCORING ──
  let score = 0;
  const reasons: string[] = [];

  if (profile.expectedOutputTokens > 2000) {
    score += 2;
    reasons.push("long output >2K tokens (+2)");
  } else if (profile.expectedOutputTokens > 500) {
    score += 1;
    reasons.push("medium output >500 tokens (+1)");
  }

  if (profile.requiresReasoning) {
    score += 2;
    reasons.push("requires reasoning (+2)");
  }

  if (profile.isRepetitive) {
    score -= 2;
    reasons.push("repetitive pattern (-2)");
  }

  // Agent type adjustments
  const agentTypeScores: Record<string, number> = {
    SecurityScanner: 3,
    CodeReviewer: 2,
    DataPipelineAgent: -1,
    InfraMonitor: -1,
  };
  const typeAdjust = agentTypeScores[profile.agentType];
  if (typeAdjust !== undefined) {
    score += typeAdjust;
    reasons.push(`agent type ${profile.agentType} (${typeAdjust >= 0 ? "+" : ""}${typeAdjust})`);
  }

  // ── DECISION ──
  let tier: Tier;
  if (score >= 4) {
    tier = 1;
  } else if (score >= 1) {
    tier = 2;
  } else {
    tier = 3;
  }

  return buildSelection(
    providerTiers,
    tier,
    `Complexity score ${score}: ${reasons.join(", ")}`,
    profile.provider
  );
}

function buildSelection(
  tiers: Record<Tier, TierConfig>,
  tier: Tier,
  reason: string,
  provider: string
): ModelSelection {
  const config = tiers[tier];
  return {
    modelId: config.modelId,
    tier,
    reason,
    provider,
    costRates: {
      input: config.inputCostPerMillion / 1_000_000,
      output: config.outputCostPerMillion / 1_000_000,
    },
  };
}

// ── Tier Upgrade (for retry) ──

export function upgradeTier(currentTier: Tier): Tier | null {
  if (currentTier === 1) return null; // already at top
  return (currentTier - 1) as Tier;
}
```

**Step 2: Commit**

```bash
git add src/lib/model-selector.ts
git commit -m "feat: add model tiers registry and selection algorithm"
```

---

### Task 4: Core Engine — Task Profiler

**Files:**
- Create: `src/lib/agent-profiler.ts`

**Step 1: Create the profiler**

Create `src/lib/agent-profiler.ts`:

```typescript
import type { TaskProfile, ProviderKey } from "./model-selector";

interface AgentConfig {
  name: string;
  model: string;           // "CLAUDE" | "GPT4" | "GEMINI" | "CUSTOM"
  tags: string[];
  tools: { name: string; enabled: boolean }[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  tasksCompleted: number;
}

const REASONING_KEYWORDS = [
  "analyze", "reason", "think step by step", "chain of thought",
  "evaluate", "compare", "assess", "debug", "investigate",
  "architect", "design", "security", "vulnerability",
];

const CRITICAL_TAGS = ["critical", "destructive", "security", "billing", "production", "finance"];
const DESTRUCTIVE_TOOLS = ["database", "file_system"];

function mapProviderKey(model: string): ProviderKey {
  const map: Record<string, ProviderKey> = {
    CLAUDE: "CLAUDE",
    GPT4: "GPT4",
    GEMINI: "GEMINI",
    CUSTOM: "CUSTOM",
  };
  return map[model.toUpperCase()] ?? "CUSTOM";
}

export function profileTask(agent: AgentConfig, taskInput: string): TaskProfile {
  const lowerPrompt = agent.systemPrompt.toLowerCase();
  const lowerInput = taskInput.toLowerCase();
  const lowerTags = agent.tags.map((t) => t.toLowerCase());
  const enabledTools = agent.tools.filter((t) => t.enabled).map((t) => t.name.toLowerCase());

  const hasProductionAccess =
    lowerTags.some((t) => t === "production" || t === "destructive") ||
    enabledTools.some((t) => DESTRUCTIVE_TOOLS.includes(t));

  const isRepetitive = agent.tasksCompleted > 50;

  const requiresReasoning =
    agent.temperature < 0.3 ||
    REASONING_KEYWORDS.some((kw) => lowerPrompt.includes(kw) || lowerInput.includes(kw));

  const errorCostHigh =
    hasProductionAccess ||
    lowerTags.some((t) => CRITICAL_TAGS.includes(t));

  const isFirstRun = agent.tasksCompleted === 0;

  return {
    agentType: agent.name,
    taskDescription: taskInput,
    expectedOutputTokens: agent.maxTokens,
    hasProductionAccess,
    isRepetitive,
    requiresReasoning,
    errorCostHigh,
    provider: mapProviderKey(agent.model),
    isFirstRun,
  };
}
```

**Step 2: Commit**

```bash
git add src/lib/agent-profiler.ts
git commit -m "feat: add task profiler for model auto-selection"
```

---

### Task 5: Update Validation Schema

**Files:**
- Modify: `src/lib/validations/agents.ts`

**Step 1: Add modelStrategy to create and update schemas**

In `src/lib/validations/agents.ts`, add to `createAgentSchema` (after `model` field, line 6):

```typescript
modelStrategy: z.enum(["auto", "manual", "cost_first", "quality_first"]).optional().default("auto"),
```

Add to `updateAgentSchema` (after `model` field, line 25):

```typescript
modelStrategy: z.enum(["auto", "manual", "cost_first", "quality_first"]).optional(),
```

**Step 2: Commit**

```bash
git add src/lib/validations/agents.ts
git commit -m "feat(validation): add modelStrategy to agent schemas"
```

---

### Task 6: Update Execute Endpoint — Runtime Model Selection

**Files:**
- Modify: `src/app/api/agents/[id]/execute/route.ts`

**Step 1: Add imports**

At the top of `src/app/api/agents/[id]/execute/route.ts`, add after the existing imports (after line 18):

```typescript
import { selectModel, upgradeTier, getTierConfig, type Tier, type ProviderKey } from "@/lib/model-selector";
import { profileTask } from "@/lib/agent-profiler";
```

**Step 2: Replace PROVIDER_DEFAULT_MODEL and costRates with selector logic**

Replace lines 38-42 (the `PROVIDER_DEFAULT_MODEL` constant) with:

```typescript
// Default model per provider (used for "manual" strategy)
const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  CLAUDE: "claude-sonnet-4-6",
  GPT4: "gpt-4o",
  GEMINI: "gemini-2.0-flash",
};
```

**Step 3: Add model resolution logic**

After building the messages array (after line 128), replace the `chatConfig` creation (lines 130-134) with:

```typescript
// ── Resolve model based on strategy ──
const strategy = (agent as Record<string, unknown>).modelStrategy as string ?? "auto";
const selectionStart = Date.now();
let resolvedModelId: string;
let selectedTier: number | null = null;
let selectionReason: string | null = null;

if (strategy === "manual" || providerKey === "CUSTOM") {
  resolvedModelId = PROVIDER_DEFAULT_MODEL[providerKey] || "claude-sonnet-4-6";
  selectionReason = "Manual strategy — using provider default";
} else if (strategy === "cost_first") {
  const tierConfig = getTierConfig(providerKey as ProviderKey, 3);
  resolvedModelId = tierConfig?.modelId ?? PROVIDER_DEFAULT_MODEL[providerKey] ?? "claude-sonnet-4-6";
  selectedTier = 3;
  selectionReason = "Cost-first strategy — always tier 3";
} else if (strategy === "quality_first") {
  const tierConfig = getTierConfig(providerKey as ProviderKey, 1);
  resolvedModelId = tierConfig?.modelId ?? PROVIDER_DEFAULT_MODEL[providerKey] ?? "claude-sonnet-4-6";
  selectedTier = 1;
  selectionReason = "Quality-first strategy — always tier 1";
} else {
  // Auto strategy
  const profile = profileTask(
    {
      name: agent.name,
      model: providerKey,
      tags: agent.tags,
      tools: [],  // tools aren't loaded in the current query; use tags for safety signals
      systemPrompt: agent.systemPrompt,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      tasksCompleted: agent.tasksCompleted,
    },
    body.input || body.messages?.map((m) => m.content).join(" ") || ""
  );
  const selection = selectModel(profile);
  resolvedModelId = selection.modelId;
  selectedTier = selection.tier;
  selectionReason = selection.reason;
}

const selectionDurationMs = Date.now() - selectionStart;

const chatConfig: ChatConfig = {
  model: resolvedModelId,
  temperature: agent.temperature,
  maxTokens: agent.maxTokens,
};
```

**Step 4: Replace hardcoded costRates**

Replace lines 172-179 (the `costRates` block and `estimatedCost` calculation) with:

```typescript
// Cost from tier registry or fallback
let inputRate = 0.003;
let outputRate = 0.015;
if (selectedTier) {
  const tierConfig = getTierConfig(providerKey as ProviderKey, selectedTier as Tier);
  if (tierConfig) {
    inputRate = tierConfig.inputCostPerMillion / 1_000_000;
    outputRate = tierConfig.outputCostPerMillion / 1_000_000;
  }
}
const estimatedCost = result.tokensIn * inputRate + result.tokensOut * outputRate;
```

**Step 5: Update LlmCall creation to include selection fields**

Replace the `prisma.llmCall.create` call (lines 182-195) with:

```typescript
await prisma.llmCall.create({
  data: {
    projectId,
    model: chatConfig.model,
    prompt: messages.map((m) => `[${m.role}] ${m.content}`).join("\n"),
    response: result.content,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    latency: duration,
    cost: estimatedCost,
    agentId,
    agentName: agent.name,
    selectedTier,
    selectionReason,
    selectionDurationMs,
    wasUpgraded: false,
    originalTier: null,
  },
});
```

**Step 6: Add response fields**

In the `apiResponse` at the end, add `selectedTier`, `selectionReason`, and `selectionDurationMs` to the returned object.

**Step 7: Commit**

```bash
git add src/app/api/agents/[id]/execute/route.ts
git commit -m "feat: integrate model selector into agent execution endpoint"
```

---

### Task 7: Update Agent Create API — Accept modelStrategy

**Files:**
- Modify: `src/app/api/agents/route.ts`

**Step 1: Add modelStrategy to the create data block**

In `src/app/api/agents/route.ts`, find the `prisma.agent.create` call in the POST handler. Add to the `data` object (after `model: body.model`):

```typescript
modelStrategy: body.modelStrategy ?? "auto",
```

**Step 2: Commit**

```bash
git add src/app/api/agents/route.ts
git commit -m "feat: accept modelStrategy field in agent creation"
```

---

### Task 8: Agent Builder — Add Model Strategy Step

**Files:**
- Modify: `src/app/(dashboard)/agents/builder/page.tsx`

**Step 1: Add modelStrategy state**

After the existing `model` state (around line 49), add:

```typescript
const [modelStrategy, setModelStrategy] = useState<"auto" | "manual" | "cost_first" | "quality_first">("auto");
```

**Step 2: Update total steps from 6 to 7**

Find the step count logic. Change `steps.length` or max step from 5 to 6. Update the step labels array to insert "Model Strategy" after "Identity".

**Step 3: Add Step 1 content — Model Strategy cards**

Insert between the current Step 0 (Identity) and Step 1 (System Prompt). The new step should render:

```tsx
{step === 1 && (
  <div className="space-y-6">
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-1">Model Strategy</h3>
      <p className="text-xs text-muted-foreground">Choose how the system selects models for this agent's tasks.</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {([
        { id: "auto" as const, label: "Auto", desc: "System selects optimal model per task", icon: "Sparkles", recommended: true },
        { id: "manual" as const, label: "Manual", desc: "Always use the provider's default model", icon: "Hand" },
        { id: "cost_first" as const, label: "Cost-First", desc: "Always use cheapest model in family", icon: "DollarSign" },
        { id: "quality_first" as const, label: "Quality-First", desc: "Always use strongest model", icon: "Shield" },
      ]).map((opt) => (
        <button
          key={opt.id}
          onClick={() => setModelStrategy(opt.id)}
          className={cn(
            "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
            modelStrategy === opt.id
              ? "border-[#00D4FF]/40 bg-[#00D4FF]/[0.06]"
              : "border-border hover:border-border/80 hover:bg-muted/30"
          )}
        >
          {opt.recommended && (
            <span className="absolute top-2 right-2 text-[9px] font-medium text-[#00D4FF] bg-[#00D4FF]/10 rounded-full px-2 py-0.5">
              Recommended
            </span>
          )}
          <span className="text-sm font-medium text-foreground">{opt.label}</span>
          <span className="text-xs text-muted-foreground">{opt.desc}</span>
        </button>
      ))}
    </div>

    {/* Auto preview card */}
    {modelStrategy === "auto" && (
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-medium text-foreground">Estimated distribution for this agent:</p>
        <div className="space-y-1.5 text-xs text-muted-foreground font-mono">
          <div className="flex justify-between"><span>~40% of runs → Tier 3 (simple tasks)</span><span className="text-green-400">lowest cost</span></div>
          <div className="flex justify-between"><span>~45% of runs → Tier 2 (standard tasks)</span><span className="text-[#00D4FF]">balanced</span></div>
          <div className="flex justify-between"><span>~15% of runs → Tier 1 (complex tasks)</span><span className="text-purple-400">highest quality</span></div>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-2">Est. savings vs always using Tier 2: ~30%</p>
      </div>
    )}
  </div>
)}
```

**Step 4: Include modelStrategy in the deploy payload**

Find the deploy/submit handler. Add `modelStrategy` to the POST body alongside existing fields.

**Step 5: Shift remaining step numbers**

Update all `step === N` conditions: old step 1→2, 2→3, 3→4, 4→5, 5→6.

**Step 6: Commit**

```bash
git add src/app/(dashboard)/agents/builder/page.tsx
git commit -m "feat: add Model Strategy step to agent builder wizard"
```

---

### Task 9: New API Endpoint — Model Savings

**Files:**
- Create: `src/app/api/costs/model-savings/route.ts`

**Step 1: Create the endpoint**

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler, requireAuth, getProjectId, apiResponse } from "@/lib/api-helpers";
import { getTierConfig, type ProviderKey, type Tier } from "@/lib/model-selector";

export const GET = withErrorHandler(async (_request: NextRequest) => {
  await requireAuth();
  const projectId = await getProjectId();

  // Get all LLM calls with tier selection data
  const calls = await prisma.llmCall.findMany({
    where: { projectId, selectedTier: { not: null } },
    select: {
      selectedTier: true,
      cost: true,
      tokensIn: true,
      tokensOut: true,
      wasUpgraded: true,
      model: true,
    },
  });

  // Calculate actual cost
  const actualCost = calls.reduce((sum, c) => sum + c.cost, 0);

  // Calculate hypothetical tier-1-only cost
  let tier1Cost = 0;
  for (const call of calls) {
    // Determine provider from model name
    let provider: ProviderKey = "CLAUDE";
    if (call.model.includes("gpt")) provider = "GPT4";
    else if (call.model.includes("gemini")) provider = "GEMINI";
    const t1 = getTierConfig(provider, 1);
    if (t1) {
      tier1Cost +=
        call.tokensIn * (t1.inputCostPerMillion / 1_000_000) +
        call.tokensOut * (t1.outputCostPerMillion / 1_000_000);
    } else {
      tier1Cost += call.cost;
    }
  }

  // Tier distribution
  const tierCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  let upgradeEvents = 0;
  for (const call of calls) {
    if (call.selectedTier) tierCounts[call.selectedTier] = (tierCounts[call.selectedTier] || 0) + 1;
    if (call.wasUpgraded) upgradeEvents++;
  }

  const totalCalls = calls.length || 1;
  const savings = tier1Cost - actualCost;
  const savingsPercent = tier1Cost > 0 ? Math.round((savings / tier1Cost) * 100) : 0;

  return apiResponse({
    actualCost,
    tier1Cost,
    savings,
    savingsPercent,
    upgradeEvents,
    tierDistribution: {
      tier1: { count: tierCounts[1], percent: Math.round((tierCounts[1] / totalCalls) * 100) },
      tier2: { count: tierCounts[2], percent: Math.round((tierCounts[2] / totalCalls) * 100) },
      tier3: { count: tierCounts[3], percent: Math.round((tierCounts[3] / totalCalls) * 100) },
    },
    totalCalls: calls.length,
  });
});
```

**Step 2: Commit**

```bash
git add src/app/api/costs/model-savings/
git commit -m "feat: add /api/costs/model-savings endpoint"
```

---

### Task 10: Update Costs Page — Savings Section

**Files:**
- Modify: `src/app/(dashboard)/costs/page.tsx`

**Step 1: Add state for savings data**

In the CostsPage component, add state and fetch for model savings:

```typescript
const [savings, setSavings] = useState<{
  actualCost: number; tier1Cost: number; savings: number; savingsPercent: number;
  upgradeEvents: number; tierDistribution: { tier1: { count: number; percent: number }; tier2: { count: number; percent: number }; tier3: { count: number; percent: number } };
  totalCalls: number;
} | null>(null);

useEffect(() => {
  fetch("/api/costs/model-savings").then(r => r.json()).then(d => setSavings(d.data)).catch(() => {});
}, []);
```

**Step 2: Add savings panel in the Overview tab**

After the existing overview content, add a "Model Auto-Selection" panel with:
- Three MetricCards: "If Always Tier 1", "Actual Cost", "Monthly Savings"
- A horizontal stacked bar showing tier distribution (tier 1 = purple, tier 2 = cyan, tier 3 = green)
- Upgrade events count

Use `GlassPanel`, `MetricCard`, and `formatCurrency` from existing imports.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/costs/page.tsx
git commit -m "feat: add model auto-selection savings section to costs page"
```

---

### Task 11: Update Agent Detail Page — Model Distribution

**Files:**
- Modify: `src/app/(dashboard)/agents/[id]/page.tsx`

**Step 1: Fetch model distribution for this agent**

Add state and fetch for agent-specific tier distribution. Use a query to `/api/costs/model-savings?agentId={id}` or compute from the agent's LLM calls.

**Step 2: Add to Config tab**

Below the existing Model badge in the Config tab, add:
- "Current Strategy" badge (Auto/Manual/Cost-First/Quality-First)
- DonutChartWidget showing tier distribution (last 30 days)
- "Auto-upgrade events" count badge

Use existing `DonutChartWidget` and `Badge` components.

**Step 3: Commit**

```bash
git add src/app/(dashboard)/agents/[id]/page.tsx
git commit -m "feat: add model distribution chart to agent detail page"
```

---

### Task 12: Update Logs Page — Tier Column & Selection Reason

**Files:**
- Modify: `src/app/(dashboard)/logs/page.tsx`

**Step 1: Add Tier column to LLM Calls table header**

In the LLM tab table header (around line 243), add "Tier" after "Model".

**Step 2: Add Tier pill badge in each row**

After the model column in each LLM call row, add:

```tsx
<td className="px-3 py-2">
  {call.selectedTier ? (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold",
      call.selectedTier === 1 ? "bg-purple-500/15 text-purple-400" :
      call.selectedTier === 2 ? "bg-[#00D4FF]/15 text-[#00D4FF]" :
      "bg-green-500/15 text-green-400"
    )}>
      T{call.selectedTier}
    </span>
  ) : (
    <span className="text-muted-foreground/30 text-[10px]">—</span>
  )}
</td>
```

**Step 3: Add selection reason to expanded detail**

In the expanded LLM call detail section (around line 261), add after the existing prompt/response blocks:

```tsx
{call.selectionReason && (
  <div className="flex items-center gap-2 text-[10px]">
    <span className="text-muted-foreground">Selection:</span>
    <span className="font-mono text-foreground/70">{call.selectionReason}</span>
    {call.selectionDurationMs != null && (
      <span className="text-muted-foreground/50">[{call.selectionDurationMs}ms]</span>
    )}
  </div>
)}
{call.wasUpgraded && (
  <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
    <span>↑ Upgraded from T{call.originalTier} → T{call.selectedTier} after failed attempt</span>
  </div>
)}
```

**Step 4: Update colSpan to account for new column**

Change `colSpan={8}` to `colSpan={9}` in the expanded detail row.

**Step 5: Commit**

```bash
git add src/app/(dashboard)/logs/page.tsx
git commit -m "feat: add tier column and selection reason to LLM calls log"
```

---

### Task 13: Final Build & Verify

**Step 1: Run build**

Run: `npx next build`

Expected: Compiles successfully with no type errors.

**Step 2: Test the full flow manually**

1. Navigate to Agent Builder → verify Model Strategy step appears as step 2
2. Create an agent with "Auto" strategy → verify POST includes `modelStrategy: "auto"`
3. Navigate to Costs → verify savings section renders (shows zeros since no runs yet)
4. Navigate to Logs → verify Tier column exists in LLM Calls tab
5. Navigate to Agent detail → verify strategy badge in Config tab

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete model auto-selection system

- Core engine: model-selector.ts with tiers registry + selection algorithm
- Task profiler: agent-profiler.ts for building TaskProfile from agent config
- Schema: modelStrategy on Agent, selection fields on LlmCall
- Agent builder: new Model Strategy step with 4 options + auto preview
- Execute endpoint: runtime model selection with tier-aware cost calculation
- Costs page: auto-selection savings panel
- Agent detail: model distribution chart + strategy badge
- Logs page: tier column + selection reason in LLM call detail"
```
