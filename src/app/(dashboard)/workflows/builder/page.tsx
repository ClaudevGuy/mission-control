"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowLeft, Sparkles, GripVertical, Bot, Clock, Hand, Webhook, Zap, Plus, CircleCheck, Search, AlertTriangle, Maximize2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import { useAgentsStore } from "@/stores/agents-store";
import { TriggerNode, AgentNode, EndNode } from "@/components/workflows/nodes";
import { AnimatedEdge } from "@/components/workflows/AnimatedEdge";
import { toast } from "sonner";

// Register custom node and edge types
const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  end: EndNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

const MODEL_DOT_COLORS: Record<string, string> = {
  Claude: "#CC785C",
  "GPT-4": "#10A37F",
  Gemini: "#4285F4",
  Custom: "#F59E0B",
};

// Trigger type options
const TRIGGERS = [
  { type: "manual", label: "Manual", icon: Hand, desc: "Run manually" },
  { type: "schedule", label: "Schedule", icon: Clock, desc: "Cron-based" },
  { type: "webhook", label: "Webhook", icon: Webhook, desc: "HTTP trigger" },
  { type: "event", label: "Event", icon: Zap, desc: "Event-driven" },
];

let nodeIdCounter = 1;
function nextNodeId(prefix: string) {
  return `${prefix}_${Date.now()}_${nodeIdCounter++}`;
}

/* ── T11: Validation logic ── */
interface ValidationError {
  message: string;
}

function validateWorkflow(nodes: Node[], edges: Edge[], name: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!name.trim()) {
    errors.push({ message: "Workflow name is required" });
  }

  const triggerNodes = nodes.filter((n) => n.type === "trigger");
  if (triggerNodes.length === 0) {
    errors.push({ message: "Add a trigger node" });
  } else if (triggerNodes.length > 1) {
    errors.push({ message: "Only one trigger node allowed" });
  }

  const agentNodes = nodes.filter((n) => n.type === "agent");
  if (agentNodes.length === 0) {
    errors.push({ message: "Add at least one agent step" });
  }

  // Check for disconnected agent nodes (no incoming edge)
  for (const agent of agentNodes) {
    const hasIncoming = edges.some((e) => e.target === agent.id);
    if (!hasIncoming) {
      const agentName = (agent.data as Record<string, string>).agentName || "Agent";
      errors.push({ message: `"${agentName}" is not connected` });
    }
  }

  // Check all agent nodes have valid agentId
  for (const agent of agentNodes) {
    if (!(agent.data as Record<string, string>).agentId) {
      errors.push({ message: "Agent node missing agentId" });
    }
  }

  return errors;
}

/* ═══════════ INNER BUILDER (needs ReactFlow context) ═══════════ */

function WorkflowBuilderInner() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const { fitView } = useReactFlow();
  const {
    workflowName, setWorkflowName,
    isDirty, setDirty,
  } = useWorkflowBuilderStore();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [agentSearch, setAgentSearch] = useState("");
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Load agents from store
  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetch);
  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const filteredAgents = agents.filter((a) =>
    !agentSearch || a.name.toLowerCase().includes(agentSearch.toLowerCase())
  );

  // T11: Compute validation errors
  const validationErrors = useMemo(
    () => validateWorkflow(nodes, edges, workflowName),
    [nodes, edges, workflowName]
  );
  const canActivate = validationErrors.length === 0;

  // T13: Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: "animated" }, eds));
      setDirty(true);
    },
    [setEdges, setDirty]
  );

  // Node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Track dirty state
  const onNodesChangeWrapped = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes);
      setDirty(true);
    },
    [onNodesChange, setDirty]
  );

  // Add trigger node
  const addTrigger = (type: string) => {
    if (nodes.some((n) => n.type === "trigger")) {
      toast.error("Only one trigger allowed per workflow");
      return;
    }
    const newNode: Node = {
      id: nextNodeId("trigger"),
      type: "trigger",
      position: { x: 80, y: 200 },
      data: { type },
    };
    setNodes((nds) => [...nds, newNode]);
    setDirty(true);
  };

  // Add agent node
  const addAgent = (agentId: string, agentName: string, model: string) => {
    const agentCount = nodes.filter((n) => n.type === "agent").length;
    const newNode: Node = {
      id: nextNodeId("agent"),
      type: "agent",
      position: { x: 350 + agentCount * 250, y: 200 },
      data: {
        agentId,
        agentName,
        model,
        inputSource: agentCount === 0 ? "trigger" : "previous",
        outputVar: `step${agentCount + 1}_output`,
        onFailure: "stop",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setDirty(true);
  };

  // Add end node
  const addEndNode = () => {
    if (nodes.some((n) => n.type === "end")) {
      toast.error("Only one end node allowed");
      return;
    }
    const maxX = Math.max(...nodes.map((n) => n.position.x), 200);
    const newNode: Node = {
      id: nextNodeId("end"),
      type: "end",
      position: { x: maxX + 250, y: 200 },
      data: {},
    };
    setNodes((nds) => [...nds, newNode]);
    setDirty(true);
  };

  // Delete selected node
  const deleteSelected = useCallback(() => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    setDirty(true);
  }, [selectedNode, setNodes, setEdges, setDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        deleteSelected();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedNode, deleteSelected]);

  // T12: Save handler (serializes canvas state)
  const handleSave = async () => {
    if (!workflowName.trim()) {
      toast.error("Workflow name is required");
      return;
    }

    const agentNodes = nodes.filter((n) => n.type === "agent");
    const steps = agentNodes.map((n, i) => ({
      agentId: (n.data as Record<string, string>).agentId,
      agentName: (n.data as Record<string, string>).agentName,
      position: i,
    }));

    if (steps.length === 0) {
      toast.error("Add at least one agent to the pipeline");
      return;
    }

    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName,
          description: "",
          steps,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setDirty(false);
      toast.success("Workflow saved");
      router.push("/workflows");
    } catch {
      toast.error("Failed to save workflow");
    }
  };

  // T11: Activate handler
  const handleActivate = async () => {
    if (!canActivate) {
      validationErrors.forEach((e) => toast.error(e.message));
      return;
    }
    await handleSave();
  };

  // T14: Fit to screen
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  // T15: Check if no agents exist at all in DB
  const noAgentsInDb = !agents.length;

  return (
    <div className="flex h-[calc(100vh-54px)] flex-col overflow-hidden -m-4 md:-m-6">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4 py-2.5 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/workflows" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
          </Link>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Untitled Workflow"
            className="bg-transparent text-lg font-semibold text-foreground placeholder:text-muted-foreground/40 outline-none border-none w-64"
          />
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-muted/50 text-muted-foreground uppercase tracking-wider">
            Draft
          </span>
          {isDirty && (
            <span className="text-[10px] text-amber-400">Unsaved changes</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            Save Draft
          </Button>

          {/* T11: Activate button with validation tooltip */}
          <div className="relative group">
            <Button
              size="sm"
              className="bg-brand text-primary-foreground hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!canActivate}
              onClick={handleActivate}
            >
              <Sparkles className="size-3.5 mr-1.5" />
              Activate
            </Button>
            {!canActivate && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border bg-card p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Cannot activate:</p>
                {validationErrors.map((e, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-red-400 mt-1">
                    <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel ── */}
        <div className="w-[240px] shrink-0 border-r border-border bg-card/50 overflow-y-auto">
          {/* Agents section */}
          <div className="p-3 border-b border-border/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Agents</p>

            {/* T15: Empty state when no agents in DB */}
            {noAgentsInDb ? (
              <div className="py-8 text-center space-y-2">
                <Bot className="size-10 text-muted-foreground/15 mx-auto" />
                <p className="text-xs font-medium text-muted-foreground/60">No agents available</p>
                <p className="text-[10px] text-muted-foreground/40">Create an agent first to use in workflows</p>
                <Link
                  href="/agents"
                  className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline mt-1"
                >
                  <ArrowLeft className="size-3 rotate-180" />
                  Go to Agents
                </Link>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
                  <Input
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Search agents..."
                    className="pl-7 h-7 text-xs"
                  />
                </div>

                {filteredAgents.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-[11px] text-muted-foreground/50">No matching agents</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => addAgent(agent.id, agent.name, agent.model)}
                        className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-left hover:bg-muted/40 transition-colors group"
                      >
                        <GripVertical className="size-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0" />
                        <Bot className="size-3.5 text-brand/50 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{agent.name}</p>
                          <div className="flex items-center gap-1">
                            <span className="size-1.5 rounded-full" style={{ background: MODEL_DOT_COLORS[agent.model] || "#888" }} />
                            <span className="text-[9px] text-muted-foreground">{agent.model}</span>
                          </div>
                        </div>
                        <Plus className="size-3 text-muted-foreground/20 group-hover:text-brand shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Triggers section */}
          <div className="p-3 border-b border-border/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Triggers</p>
            <div className="space-y-1">
              {TRIGGERS.map((t) => (
                <button
                  key={t.type}
                  onClick={() => addTrigger(t.type)}
                  className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-left hover:bg-[#A855F7]/[0.06] transition-colors group"
                >
                  <t.icon className="size-3.5 text-[#A855F7]/50 group-hover:text-[#A855F7] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground">{t.label}</p>
                    <p className="text-[9px] text-muted-foreground">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* End node */}
          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Flow Control</p>
            <button
              onClick={addEndNode}
              className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-left hover:bg-[#39FF14]/[0.06] transition-colors group"
            >
              <CircleCheck className="size-3.5 text-[#39FF14]/50 group-hover:text-[#39FF14] shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">End Node</p>
                <p className="text-[9px] text-muted-foreground">Pipeline terminator</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          className="flex-1"
          ref={reactFlowWrapper}
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: isDark ? "#050507" : "#f5f1e8",
            backgroundImage: `radial-gradient(circle, ${isDark ? "rgb(var(--ink-rgb) / 0.10)" : "rgba(14,14,14,0.07)"} 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeWrapped}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: "animated" }}
            fitView
            proOptions={{ hideAttribution: true }}
            style={{ background: "transparent" }}
          >
            {/* T14: Controls with fit-to-screen */}
            <Controls
              showInteractive={false}
              showFitView={false}
              style={{
                backgroundColor: isDark ? "#0D0D14" : "#FFFFFF",
                border: `1px solid ${isDark ? "rgb(var(--ink-rgb) / 0.1)" : "rgba(0,0,0,0.1)"}`,
                borderRadius: "8px",
                boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />

            {/* T14: Minimap with proper dark background */}
            <MiniMap
              style={{
                backgroundColor: isDark ? "#050507" : "#FFFFFF",
                border: `1px solid ${isDark ? "rgb(var(--ink-rgb) / 0.08)" : "rgba(0,0,0,0.1)"}`,
                borderRadius: "8px",
                boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.08)",
              }}
              nodeColor={(n) =>
                n.type === "trigger" ? "#A855F7" :
                n.type === "end" ? "#39FF14" :
                "var(--primary)"
              }
              maskColor={isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.08)"}
            />

            {/* T14: Custom fit-to-screen button */}
            <Panel position="bottom-right" className="!bottom-[120px] !right-[12px]">
              <button
                onClick={handleFitView}
                className="flex items-center justify-center size-7 rounded-md transition-colors"
                style={{
                  backgroundColor: isDark ? "#0D0D14" : "#FFFFFF",
                  border: `1px solid ${isDark ? "rgb(var(--ink-rgb) / 0.1)" : "rgba(0,0,0,0.1)"}`,
                  color: isDark ? "#888" : "#555",
                  boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.08)",
                }}
                title="Fit to screen"
              >
                <Maximize2 className="size-3.5" />
              </button>
            </Panel>

            {/* Empty canvas hint */}
            {nodes.length === 0 && (
              <Panel position="top-center" className="!top-1/2 !-translate-y-1/2">
                <div className="text-center space-y-3 p-8 rounded-2xl border-2 border-dashed border-border/40">
                  {noAgentsInDb ? (
                    /* T15: No agents in DB state */
                    <>
                      <Bot className="size-12 text-muted-foreground/15 mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground/50">No agents in your project</p>
                        <p className="text-xs text-muted-foreground/30 mt-1">Create agents first, then build pipelines with them</p>
                      </div>
                      <Link
                        href="/agents"
                        className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
                      >
                        Go to Agents
                        <ArrowLeft className="size-3 rotate-180" />
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 text-muted-foreground/30">
                        <Bot className="size-8" />
                        <ArrowLeft className="size-4 rotate-180" />
                        <Bot className="size-8" />
                        <ArrowLeft className="size-4 rotate-180" />
                        <Bot className="size-8" />
                      </div>
                      <p className="text-sm text-muted-foreground/40 max-w-xs">
                        Add a trigger and agents from the left panel to build your pipeline
                      </p>
                    </>
                  )}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* ── Right Config Panel ── */}
        {selectedNode && (
          <div className="w-[280px] shrink-0 border-l border-border bg-card/50 overflow-y-auto p-4 space-y-4">
            {selectedNode.type === "trigger" && (
              <>
                <h3 className="text-sm font-semibold text-foreground">Trigger Configuration</h3>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Type</p>
                  <p className="text-sm text-foreground capitalize">{(selectedNode.data as Record<string, string>).type || "manual"}</p>
                </div>
                {(selectedNode.data as Record<string, string>).type === "manual" && (
                  <p className="text-xs text-muted-foreground">This workflow runs manually only.</p>
                )}
                {(selectedNode.data as Record<string, string>).type === "schedule" && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Cron Expression</p>
                      <Input placeholder="0 9 * * 1-5" className="h-8 text-xs font-mono" />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Every weekday at 9:00 AM</p>
                  </div>
                )}
              </>
            )}

            {selectedNode.type === "agent" && (
              <>
                <h3 className="text-sm font-semibold text-foreground">
                  {(selectedNode.data as Record<string, string>).agentName || "Agent"}
                </h3>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Input Source</p>
                  <select className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground">
                    <option value="trigger">Trigger payload</option>
                    <option value="previous">Previous agent output</option>
                    <option value="manual">Manual input</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Output Variable</p>
                  <Input
                    defaultValue={(selectedNode.data as Record<string, string>).outputVar || ""}
                    placeholder="step1_output"
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">On Failure</p>
                  <select className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground">
                    <option value="stop">Stop pipeline</option>
                    <option value="skip">Skip this step</option>
                    <option value="retry">Retry (3 times)</option>
                    <option value="continue">Continue anyway</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Timeout Override</p>
                  <Input placeholder="Use agent default" className="h-8 text-xs" type="number" />
                </div>
                <button onClick={deleteSelected} className="text-xs text-red-400 hover:underline mt-2">
                  Remove node
                </button>
              </>
            )}

            {selectedNode.type === "end" && (
              <>
                <h3 className="text-sm font-semibold text-foreground">End Node</h3>
                <p className="text-xs text-muted-foreground">This node marks the end of the pipeline. Connect it to the last agent.</p>
                <button onClick={deleteSelected} className="text-xs text-red-400 hover:underline">
                  Remove node
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ WRAPPER (provides ReactFlow context) ═══════════ */

export default function WorkflowBuilderPage() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}
