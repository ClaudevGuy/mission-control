"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Rocket, Check, Sparkles, Hand, DollarSign, Shield, Loader2, FileCode, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { profileTask } from "@/lib/agent-profiler";
import { detectSafetyOverrides } from "@/lib/model-selector";
import { useAgentsStore } from "@/stores/agents-store";
import { invalidate } from "@/lib/store-cache";
import { toast } from "sonner";
import { GlassPanel, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STEPS = [
  "Identity",
  "Model Strategy",
  "System Prompt",
  "Tools",
  "Memory",
  "Triggers",
  "Review",
] as const;

const AVAILABLE_TOOLS = [
  { id: "file_system", label: "File System" },
  { id: "web_search", label: "Web Search" },
  { id: "code_execution", label: "Code Execution" },
  { id: "api_access", label: "API Access" },
  { id: "database", label: "Database" },
  { id: "notifications", label: "Notifications" },
];

const CONTEXT_SIZES = ["4K", "8K", "16K", "32K", "64K", "128K"];
const MEMORY_MODES = ["none", "session", "persistent"];

const MODEL_MAP: Record<string, string> = {
  Claude: "CLAUDE",
  "GPT-4": "GPT4",
  Gemini: "GEMINI",
  Custom: "CUSTOM",
};

export default function AgentBuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [deploying, setDeploying] = useState(false);

  // Step 1 - Identity
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState("Claude");
  const [modelStrategy, setModelStrategy] = useState<"auto" | "manual" | "cost_first" | "quality_first">("auto");

  // Step 2 - System Prompt
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptMode, setPromptMode] = useState<"custom" | "studio">("custom");
  const [linkedPromptId, setLinkedPromptId] = useState<string | null>(null);
  const [linkedPromptName, setLinkedPromptName] = useState("");
  const [studioPrompts, setStudioPrompts] = useState<{ id: string; name: string; version: number; activeVersion: number | null }[]>([]);

  // Load studio prompts for the selector
  useEffect(() => {
    apiFetch("/api/prompts").then(r => r.json()).then(({ data }) => {
      setStudioPrompts(data?.prompts || []);
    }).catch(() => {});
  }, []);

  // Load template params from URL (from "Use Template" on agents page)
  const searchParams = useSearchParams();
  useEffect(() => {
    const tName = searchParams.get("name");
    const tModel = searchParams.get("model");
    const tStrategy = searchParams.get("strategy");
    const tPrompt = searchParams.get("systemPrompt");
    const tDesc = searchParams.get("description");
    if (tName) setName(tName);
    if (tDesc) setDescription(tDesc);
    if (tModel) {
      const reverseMap: Record<string, string> = { CLAUDE: "Claude", GPT4: "GPT-4", GEMINI: "Gemini" };
      setModel(reverseMap[tModel] || "Claude");
    }
    if (tStrategy) setModelStrategy(tStrategy as typeof modelStrategy);
    if (tPrompt) setSystemPrompt(tPrompt);
  }, [searchParams]);

  // Step 3 - Tools
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({
    file_system: true,
    web_search: false,
    code_execution: true,
    api_access: false,
    database: false,
    notifications: false,
  });

  // Step 4 - Memory
  const [contextSize, setContextSize] = useState("32K");
  const [memoryMode, setMemoryMode] = useState("session");

  // Step 5 - Triggers
  const [triggerType, setTriggerType] = useState("manual");
  const [cronExpression, setCronExpression] = useState("0 */6 * * *");
  const [eventType, setEventType] = useState("pr_opened");

  const toggleTool = (id: string) => {
    setEnabledTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 2) return systemPrompt.trim().length > 0;
    return true;
  };

  const handleDeploy = async () => {
    if (deploying) return;
    setDeploying(true);

    const tools = Object.entries(enabledTools)
      .filter(([, enabled]) => enabled)
      .map(([toolName]) => ({ name: toolName, enabled: true }));

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || `${name} agent`,
      model: MODEL_MAP[model] || "CLAUDE",
      modelStrategy,
      systemPrompt: promptMode === "studio" && linkedPromptId
        ? `__PROMPT_STUDIO__:${linkedPromptId}`
        : (systemPrompt.trim() || "You are a helpful AI assistant."),
      temperature: 0.7,
      maxTokens: parseInt(contextSize.replace("K", "")) * 1024 || 4096,
      tags: [],
      tools,
    };

    // Link prompt to agent in Prompt Studio
    if (promptMode === "studio" && linkedPromptId) {
      apiFetch(`/api/prompts/${linkedPromptId}/activate`, { method: "PUT" }).catch(() => {});
    }

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || `Failed to create agent (${res.status})`);
      }

      // API wraps the record as { data: agent }. Seed the store optimistically
      // and invalidate the cache so the agents-list page shows the new agent
      // immediately after routing back — without this, the session freshness
      // cache makes fetchAgents() a no-op and the list appears stale until
      // the user force-refreshes.
      const { data: agent } = body;
      if (agent?.id) {
        useAgentsStore.setState((s) => ({
          agents: [{ ...agent, runs: [], evalResults: [] }, ...s.agents],
        }));
        invalidate("agents");
      }

      toast.success(`Agent "${name}" created successfully`);
      router.push("/agents");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeploying(false);
    }
  };

  const tokenEstimate = Math.round(systemPrompt.split(/\s+/).filter(Boolean).length * 1.3);

  return (
    <div className="space-y-6">
      <PageHeader title="Agent Builder" description="Design and configure a new AI agent">
        <Link href="/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-3.5 mr-1" />
            Back
          </Button>
        </Link>
      </PageHeader>

      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex items-center gap-2 text-xs font-medium transition-colors",
                i < step
                  ? "text-cyan-400 cursor-pointer"
                  : i === step
                  ? "text-foreground"
                  : "text-muted-foreground cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center size-6 rounded-full text-xs font-semibold border transition-colors",
                  i < step
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                    : i === step
                    ? "bg-foreground/10 border-foreground/20 text-foreground"
                    : "bg-muted/40 border-border text-muted-foreground"
                )}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px",
                  i < step ? "bg-cyan-500/40" : "bg-muted/50"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <GlassPanel padding="lg" className="min-h-[320px]">
        {/* Step 1 - Identity */}
        {step === 0 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Agent Identity</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
                <Input
                  placeholder="e.g., CodeReviewer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <Textarea
                  placeholder="Describe what this agent does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="max-w-lg min-h-[80px]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Model</label>
                <Select value={model} onValueChange={(v) => v && setModel(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Claude">Claude</SelectItem>
                    <SelectItem value="GPT-4">GPT-4</SelectItem>
                    <SelectItem value="Gemini">Gemini</SelectItem>
                    <SelectItem value="Custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 - Model Strategy */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Model Strategy</h3>
              <p className="text-xs text-muted-foreground">Choose how the system selects models for this agent&apos;s tasks.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: "auto" as const, label: "Auto", desc: "System selects optimal model per task", icon: Sparkles, recommended: true },
                { id: "manual" as const, label: "Manual", desc: "Always use the provider's default model", icon: Hand },
                { id: "cost_first" as const, label: "Cost-First", desc: "Always use cheapest model in family", icon: DollarSign },
                { id: "quality_first" as const, label: "Quality-First", desc: "Always use strongest model", icon: Shield },
              ] as const).map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setModelStrategy(opt.id)}
                    className={cn(
                      "relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      modelStrategy === opt.id
                        ? "border-brand/40 bg-brand/[0.06]"
                        : "border-border hover:border-border/80 hover:bg-muted/30"
                    )}
                  >
                    {"recommended" in opt && opt.recommended && (
                      <span className="absolute top-2.5 right-2.5 text-[9px] font-medium text-brand bg-brand/10 rounded-full px-2 py-0.5">
                        Recommended
                      </span>
                    )}
                    <Icon className={cn("size-5", modelStrategy === opt.id ? "text-brand" : "text-muted-foreground")} />
                    <div>
                      <span className="text-sm font-medium text-foreground block">{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {modelStrategy === "auto" && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                <p className="text-xs font-medium text-foreground">Estimated distribution for this agent:</p>
                <div className="space-y-1.5 text-xs text-muted-foreground font-mono">
                  <div className="flex justify-between"><span>~40% of runs → Tier 3 (simple tasks)</span><span className="text-green-400">lowest cost</span></div>
                  <div className="flex justify-between"><span>~45% of runs → Tier 2 (standard tasks)</span><span className="text-brand">balanced</span></div>
                  <div className="flex justify-between"><span>~15% of runs → Tier 1 (complex tasks)</span><span className="text-purple-400">highest quality</span></div>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-2">Est. savings vs always using Tier 2: ~30%</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3 - System Prompt */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-foreground">System Prompt</h3>

            {/* Mode selector */}
            <div className="flex gap-3">
              <button
                onClick={() => setPromptMode("custom")}
                className={cn("flex-1 rounded-lg border p-3 text-left transition-all", promptMode === "custom" ? "border-brand/40 bg-brand/[0.04]" : "border-border hover:border-border/80")}
              >
                <p className="text-xs font-semibold text-foreground">Write custom prompt</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Write a system prompt directly</p>
              </button>
              <button
                onClick={() => setPromptMode("studio")}
                className={cn("flex-1 rounded-lg border p-3 text-left transition-all", promptMode === "studio" ? "border-brand/40 bg-brand/[0.04]" : "border-border hover:border-border/80")}
              >
                <div className="flex items-center gap-1.5">
                  <FileCode className="size-3.5 text-brand" />
                  <p className="text-xs font-semibold text-foreground">Use from Prompt Studio</p>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Link a versioned prompt</p>
              </button>
            </div>

            {promptMode === "custom" ? (
              <>
                <Textarea
                  placeholder="You are a helpful AI agent that..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{systemPrompt.length} characters</span>
                  <span>~{tokenEstimate} tokens</span>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {studioPrompts.length === 0 ? (
                  <div className="rounded-lg border border-border/50 p-6 text-center">
                    <FileCode className="size-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No prompts in Prompt Studio yet</p>
                    <Link href="/prompts" className="text-[10px] text-brand hover:underline mt-1 inline-block">Create one →</Link>
                  </div>
                ) : (
                  <>
                    <Select value={linkedPromptId || ""} onValueChange={(val) => {
                      setLinkedPromptId(val);
                      const p = studioPrompts.find(x => x.id === val);
                      if (p) setLinkedPromptName(p.name);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select a prompt..." /></SelectTrigger>
                      <SelectContent>
                        {studioPrompts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.activeVersion ? `(v${p.activeVersion} active)` : `(v${p.version})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {linkedPromptId && (
                      <div className="rounded-lg border border-brand/20 bg-brand/[0.03] p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCode className="size-3.5 text-brand" />
                          <span className="text-xs font-medium text-foreground">Using: {linkedPromptName}</span>
                        </div>
                        <Link href="/prompts" className="text-[10px] text-brand hover:underline">Edit in Prompt Studio →</Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4 - Tools */}
        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Tools</h3>
            <p className="text-sm text-muted-foreground">Select the tools this agent can use.</p>
            <div className="space-y-3">
              {AVAILABLE_TOOLS.map((tool) => {
                const isEnabled = enabledTools[tool.id] ?? false;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    className={cn(
                      "flex items-center justify-between w-full py-3 px-4 rounded-lg border text-left transition-all",
                      isEnabled
                        ? "border-brand/40 bg-brand/[0.06]"
                        : "border-border bg-muted/30 hover:border-border/80 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-5 rounded-md border-2 flex items-center justify-center transition-colors",
                        isEnabled ? "border-brand bg-brand" : "border-[#3d3a39]"
                      )}>
                        {isEnabled && <Check className="size-3 text-primary-foreground" strokeWidth={3} />}
                      </div>
                      <span className={cn("text-sm", isEnabled ? "text-foreground font-medium" : "text-foreground")}>{tool.label}</span>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleTool(tool.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5 - Memory */}
        {step === 4 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Memory Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Context Window Size</label>
                <Select value={contextSize} onValueChange={(v) => v && setContextSize(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTEXT_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Memory Mode</label>
                <Select value={memoryMode} onValueChange={(v) => v && setMemoryMode(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 6 - Triggers */}
        {step === 5 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Triggers</h3>
            <div className="space-y-3">
              {[
                { value: "manual", label: "Manual", desc: "Trigger manually from the dashboard" },
                { value: "schedule", label: "Schedule", desc: "Run on a cron schedule" },
                { value: "webhook", label: "Webhook", desc: "Trigger via HTTP webhook" },
                { value: "event", label: "Event-based", desc: "React to system events" },
              ].map((option) => {
                const isSelected = triggerType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTriggerType(option.value)}
                    className={cn(
                      "flex items-start gap-3 w-full p-4 rounded-lg border text-left transition-all",
                      isSelected
                        ? "border-brand/40 bg-brand/[0.06]"
                        : "border-border bg-muted/30 hover:border-border/80 hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "border-brand bg-brand" : "border-[#3d3a39]"
                      )}
                    >
                      {isSelected && <div className="size-2 rounded-full bg-black" />}
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", isSelected ? "text-foreground" : "text-foreground")}>{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </div>
                  </button>
                );
              })}

              {triggerType === "schedule" && (
                <div className="ml-7 mt-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Cron Expression
                  </label>
                  <Input
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    className="max-w-xs font-mono"
                    placeholder="0 */6 * * *"
                  />
                </div>
              )}

              {triggerType === "webhook" && (
                <div className="ml-7 mt-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Webhook URL
                  </label>
                  <div className="flex items-center gap-2 max-w-lg">
                    <Input
                      readOnly
                      value={`https://api.mothership.dev/webhooks/${name.toLowerCase().replace(/\s+/g, "-") || "agent"}`}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {triggerType === "event" && (
                <div className="ml-7 mt-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Event Type
                  </label>
                  <Select value={eventType} onValueChange={(v) => v && setEventType(v)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pr_opened">PR Opened</SelectItem>
                      <SelectItem value="pr_merged">PR Merged</SelectItem>
                      <SelectItem value="deploy_complete">Deploy Complete</SelectItem>
                      <SelectItem value="error_alert">Error Alert</SelectItem>
                      <SelectItem value="incident_created">Incident Created</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 7 - Review */}
        {step === 6 && (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Review &amp; Deploy</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-semibold text-foreground">{name || "Untitled"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm text-foreground">{description || "No description"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <Badge variant="outline" className="mt-1">{model}</Badge>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Model Strategy</span><span>{modelStrategy === "auto" ? "Auto (Recommended)" : modelStrategy === "cost_first" ? "Cost-First" : modelStrategy === "quality_first" ? "Quality-First" : "Manual"}</span></div>
                <div>
                  <p className="text-xs text-muted-foreground">System Prompt</p>
                  <p className="text-sm text-foreground truncate max-w-xs">
                    {systemPrompt.slice(0, 100) || "Not set"}{systemPrompt.length > 100 ? "..." : ""}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Tools</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {AVAILABLE_TOOLS.filter((t) => enabledTools[t.id]).map((t) => (
                      <Badge key={t.id} variant="outline" className="text-[10px] h-5">
                        {t.label}
                      </Badge>
                    ))}
                    {AVAILABLE_TOOLS.filter((t) => enabledTools[t.id]).length === 0 && (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Context Window</p>
                  <p className="text-sm text-foreground">{contextSize}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Memory Mode</p>
                  <p className="text-sm text-foreground capitalize">{memoryMode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Trigger</p>
                  <p className="text-sm text-foreground capitalize">{triggerType}</p>
                  {triggerType === "schedule" && (
                    <p className="text-xs text-muted-foreground font-mono">{cronExpression}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Safety-override advisory — fires only when user picked a strategy
                that bypasses overrides AND the profile would have triggered one
                or more persistent overrides under Auto mode. Informational only —
                the agent will be created with the user's chosen strategy. */}
            {(modelStrategy === "cost_first" || modelStrategy === "manual") && (() => {
              const tools = Object.entries(enabledTools)
                .filter(([, enabled]) => enabled)
                .map(([toolName]) => ({ name: toolName, enabled: true }));
              const profile = profileTask(
                {
                  name: name.trim(),
                  model: MODEL_MAP[model] || "CLAUDE",
                  tags: [],
                  tools,
                  systemPrompt: systemPrompt.trim() || "You are a helpful AI assistant.",
                  temperature: 0.7,
                  maxTokens: parseInt(contextSize.replace("K", "")) * 1024 || 4096,
                  tasksCompleted: 0,
                },
                ""
              );
              const overrides = detectSafetyOverrides(profile).filter((o) => o.persistent);
              if (overrides.length === 0) return null;
              const strategyLabel = modelStrategy === "cost_first" ? "Cost-First" : "Manual";
              const tierExplain =
                modelStrategy === "cost_first" ? "the cheapest tier" : "the provider default";
              return (
                <div className="rounded-xl border border-amber/30 bg-amber/[0.06] p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber" aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">
                      Safety overrides would have fired in Auto mode
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on your current configuration, Auto mode would route this agent to tier 1
                    (highest quality) because:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {overrides.map((o) => (
                      <li key={o.rule} className="flex items-start gap-2">
                        <span className="text-amber mt-[1px]" aria-hidden="true">•</span>
                        <span className="first-letter:uppercase">{o.reason}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground pt-1">
                    <span className="font-medium text-foreground">{strategyLabel}</span> bypasses
                    these overrides — you&apos;re telling the system to use {tierExplain} regardless
                    of the profile. This is informational; your choice will be honored.
                  </p>
                </div>
              );
            })()}

            <div className="pt-4 border-t border-border">
              <Button onClick={handleDeploy} size="lg" disabled={deploying}>
                {deploying ? (
                  <><Loader2 className="size-4 mr-1.5 animate-spin" /> Deploying...</>
                ) : (
                  <><Rocket className="size-4 mr-1.5" /> Deploy Agent</>
                )}
              </Button>
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
        >
          <ArrowLeft className="size-3.5 mr-1" />
          Back
        </Button>
        {step < STEPS.length - 1 && (
          <Button
            size="sm"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
          >
            Next
            <ArrowRight className="size-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
