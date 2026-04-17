"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileCode, Plus, Search, Bot, Save, CheckCircle2, Play, Square, Copy,
  ChevronRight, Sparkles, X, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/format";

// ── Types ──

interface PromptSummary {
  id: string;
  name: string;
  agentId: string | null;
  version: number;
  activeVersion: number | null;
  versions: number;
  tokenCount: number | null;
  isActive: boolean;
  createdAt: string;
  notes: string | null;
}

interface PromptVersion {
  id: string;
  name: string;
  content: string;
  version: number;
  isActive: boolean;
  tokenCount: number | null;
  createdAt: string;
  createdBy: string | null;
  notes: string | null;
  agentId: string | null;
}

// ── Token estimator ──
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Main Page ──

export default function PromptStudioPage() {
  const [prompts, setPrompts] = useState<PromptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"editor" | "playground" | "versions">("editor");

  // Editor state
  const [editorContent, setEditorContent] = useState("");
  const [editorName, setEditorName] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [currentVersion, setCurrentVersion] = useState<PromptVersion | null>(null);
  const [allVersions, setAllVersions] = useState<PromptVersion[]>([]);
  const [saving, setSaving] = useState(false);

  // Playground state
  const [testModel, setTestModel] = useState("claude-sonnet-4-6");
  const [testTemp, setTestTemp] = useState(0.7);
  const [testMaxTokens, setTestMaxTokens] = useState(1000);
  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("");
  const [testStats, setTestStats] = useState<{ tokensIn: number; tokensOut: number; cost: number; duration: number } | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLPreElement>(null!)

  // Create new prompt state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  // Diff state
  const [diffPair, setDiffPair] = useState<[PromptVersion | null, PromptVersion | null]>([null, null]);

  // ── Fetch prompts ──
  const fetchPrompts = useCallback(async () => {
    try {
      const res = await apiFetch("/api/prompts");
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setPrompts(data.prompts || []);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  // ── Select a prompt ──
  const selectPrompt = useCallback(async (id: string) => {
    setSelectedId(id);
    setActiveTab("editor");
    setDiffPair([null, null]);
    try {
      const res = await apiFetch(`/api/prompts/${id}`);
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      const versions: PromptVersion[] = data.versions || [];
      setAllVersions(versions);

      // Load the active version, or latest
      const active = versions.find((v: PromptVersion) => v.isActive) || versions[0];
      if (active) {
        setCurrentVersion(active);
        setEditorContent(active.content);
        setEditorName(active.name);
        setVersionNotes("");
      }
    } catch {
      toast.error("Failed to load prompt");
    }
  }, []);

  // ── Create new prompt ──
  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await apiFetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, content: "You are a helpful assistant.", notes: "Initial version" }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setCreateOpen(false);
      setNewName("");
      await fetchPrompts();
      selectPrompt(data.prompt.id);
      toast.success("Prompt created");
    } catch {
      toast.error("Failed to create prompt");
    }
  };

  // ── Save new version ──
  const handleSaveVersion = async () => {
    if (!selectedId || !versionNotes.trim()) {
      toast.error("Please add version notes describing what changed");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/prompts/${selectedId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editorContent, notes: versionNotes }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      toast.success(`Saved as v${data.version.version}`);
      setVersionNotes("");
      await fetchPrompts();
      await selectPrompt(selectedId);
    } catch {
      toast.error("Failed to save version");
    }
    setSaving(false);
  };

  // ── Activate version ──
  const handleActivate = async (versionId: string) => {
    try {
      const res = await apiFetch(`/api/prompts/${versionId}/activate`, { method: "PUT" });
      if (!res.ok) throw new Error();
      toast.success("Version activated");
      await fetchPrompts();
      if (selectedId) await selectPrompt(selectedId);
    } catch {
      toast.error("Failed to activate version");
    }
  };

  // ── Delete prompt ──
  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      await apiFetch(`/api/prompts/${selectedId}`, { method: "DELETE" });
      setSelectedId(null);
      setCurrentVersion(null);
      setAllVersions([]);
      await fetchPrompts();
      toast.success("Prompt deleted");
    } catch {
      toast.error("Failed to delete prompt");
    }
  };

  // ── Run playground test ──
  const runTest = async () => {
    if (!selectedId || !testInput.trim()) return;
    setIsStreaming(true);
    setTestOutput("");
    setTestStats(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/prompts/${selectedId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: testInput,
          model: testModel,
          temperature: testTemp,
          maxTokens: testMaxTokens,
        }),
        signal: controller.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "delta") {
              setTestOutput((prev) => prev + event.content);
              if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
            } else if (event.type === "done") {
              setTestStats({ tokensIn: event.tokensIn, tokensOut: event.tokensOut, cost: event.cost, duration: event.duration });
            } else if (event.type === "error") {
              toast.error(event.message);
            }
          } catch { /* parse error, skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") toast.error("Test failed");
    }
    setIsStreaming(false);
    abortRef.current = null;
  };

  const stopTest = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };

  const filteredPrompts = prompts.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const tokenCount = estimateTokens(editorContent);

  return (
    <div className="flex h-[calc(100vh-54px)] -m-4 md:-m-6 overflow-hidden">
      {/* ── LEFT PANEL — Prompt Library ── */}
      <div className="w-[320px] shrink-0 border-r border-border flex flex-col bg-card/30">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <FileCode className="size-4 text-brand" />
            <span className="text-sm font-semibold text-foreground">Prompts</span>
          </div>
          <Button
            size="sm"
            className="h-7 gap-1.5 bg-brand hover:bg-brand/90 text-primary-foreground text-xs font-medium"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3" />
            New Prompt
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="h-8 pl-8 text-xs bg-muted/30 border-border/50"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground/50 text-xs">Loading...</div>
          ) : filteredPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted/30">
                <FileCode className="size-4 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">No prompts yet</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">Create your first prompt to start testing and versioning</p>
              </div>
              <Button size="sm" className="h-7 text-xs bg-brand hover:bg-brand/90 text-primary-foreground" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3 mr-1" /> Create Prompt
              </Button>
            </div>
          ) : (
            filteredPrompts.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPrompt(p.id)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 border-b border-border/20 text-left transition-colors",
                  selectedId === p.id
                    ? "bg-brand/[0.06] border-l-2 border-l-brand"
                    : "hover:bg-muted/20 border-l-2 border-l-transparent"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{p.name}</span>
                    {p.agentId && <Bot className="size-3 text-muted-foreground/50 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-muted-foreground/50">v{p.version}</span>
                    {p.activeVersion && (
                      <span className="flex items-center gap-0.5">
                        <span className="size-1.5 rounded-full bg-brand" />
                        <span className="text-[10px] text-brand/70">Active</span>
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/30" suppressHydrationWarning>
                      {formatRelativeTime(p.createdAt)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-3 text-muted-foreground/20 mt-1 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {!selectedId || !currentVersion ? (
          /* No prompt selected */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
            <FileCode className="size-8" />
            <p className="text-sm">Select a prompt or create a new one</p>
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex items-center border-b border-border/50 px-4 bg-card/30">
              {(["editor", "playground", "versions"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setDiffPair([null, null]); }}
                  className={cn(
                    "px-4 py-2.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px",
                    activeTab === tab
                      ? "text-brand border-brand"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  {tab}
                </button>
              ))}
              {/* Prompt name + token count in tab bar */}
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground/40 font-mono">~{tokenCount} tokens</span>
                <button onClick={handleDelete} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Delete</button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === "editor" && (
                <EditorTab
                  content={editorContent}
                  setContent={setEditorContent}
                  name={editorName}
                  setName={setEditorName}
                  notes={versionNotes}
                  setNotes={setVersionNotes}
                  currentVersion={currentVersion}
                  onSave={handleSaveVersion}
                  onActivate={() => currentVersion && handleActivate(currentVersion.id)}
                  saving={saving}
                  tokenCount={tokenCount}
                />
              )}
              {activeTab === "playground" && (
                <PlaygroundTab
                  model={testModel}
                  setModel={setTestModel}
                  temperature={testTemp}
                  setTemperature={setTestTemp}
                  maxTokens={testMaxTokens}
                  setMaxTokens={setTestMaxTokens}
                  input={testInput}
                  setInput={setTestInput}
                  output={testOutput}
                  stats={testStats}
                  isStreaming={isStreaming}
                  onRun={runTest}
                  onStop={stopTest}
                  outputRef={outputRef}
                />
              )}
              {activeTab === "versions" && (
                <VersionsTab
                  versions={allVersions}
                  onActivate={handleActivate}
                  onRestore={(v) => { setEditorContent(v.content); setActiveTab("editor"); toast.success(`Loaded v${v.version} into editor`); }}
                  diffPair={diffPair}
                  setDiffPair={setDiffPair}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Create Prompt Modal ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={() => setCreateOpen(false)}>
          <div className="w-[400px] rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-foreground mb-4">New Prompt</h3>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Prompt name..."
              className="mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-brand hover:bg-brand/90 text-primary-foreground" onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDITOR TAB
// ═══════════════════════════════════════════════════════════════════════════════

function EditorTab({
  content, setContent, name, setName, notes, setNotes,
  currentVersion, onSave, onActivate, saving, tokenCount,
}: {
  content: string;
  setContent: (s: string) => void;
  name: string;
  setName: (s: string) => void;
  notes: string;
  setNotes: (s: string) => void;
  currentVersion: PromptVersion;
  onSave: () => void;
  onActivate: () => void;
  saving: boolean;
  tokenCount: number;
}) {
  const [editingName, setEditingName] = useState(false);
  const lines = content.split("\n");

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 bg-card/20 shrink-0">
        {editingName ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
            className="h-7 w-48 text-xs font-semibold"
            autoFocus
          />
        ) : (
          <button onClick={() => setEditingName(true)} className="text-sm font-semibold text-foreground hover:text-brand transition-colors">
            {name}
          </button>
        )}
        <span className="text-[10px] text-muted-foreground/40 font-mono">v{currentVersion.version}</span>
        <span className="text-[10px] text-muted-foreground/40">~{tokenCount} tokens</span>
        <div className="ml-auto flex items-center gap-2">
          {!currentVersion.isActive && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onActivate}>
              <CheckCircle2 className="size-3 mr-1" /> Set as Active
            </Button>
          )}
          {currentVersion.isActive && (
            <span className="text-[10px] text-brand font-medium bg-brand/10 px-2 py-0.5 rounded">ACTIVE</span>
          )}
          <Button
            size="sm"
            className="h-7 text-xs bg-brand hover:bg-brand/90 text-primary-foreground gap-1"
            onClick={onSave}
            disabled={saving}
          >
            <Save className="size-3" />
            {saving ? "Saving..." : `Save as v${currentVersion.version + 1}`}
          </Button>
        </div>
      </div>

      {/* Editor area with line numbers */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-[400px]">
          {/* Line numbers — subtle bg, no border (border ran the full editor height even for single lines) */}
          <div className="shrink-0 py-4 px-3 text-right select-none bg-[#050507]/30">
            {lines.map((_, i) => (
              <div key={i} className="text-[11px] font-mono text-muted-foreground/20 leading-6 h-6">{i + 1}</div>
            ))}
          </div>
          {/* Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 resize-none bg-transparent p-4 text-[13px] font-mono leading-6 text-[#f2f2f2] placeholder:text-muted-foreground/20 focus:outline-none"
            placeholder="Write your system prompt here..."
            spellCheck={false}
          />
        </div>
      </div>

      {/* Version notes */}
      <div className="border-t border-border/30 px-4 py-2.5 shrink-0 bg-card/20">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What changed in this version?"
          className="h-8 text-xs bg-muted/20 border-border/30"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYGROUND TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PlaygroundTab({
  model, setModel, temperature, setTemperature, maxTokens, setMaxTokens,
  input, setInput, output, stats, isStreaming, onRun, onStop, outputRef,
}: {
  model: string;
  setModel: (s: string) => void;
  temperature: number;
  setTemperature: (n: number) => void;
  maxTokens: number;
  setMaxTokens: (n: number) => void;
  input: string;
  setInput: (s: string) => void;
  output: string;
  stats: { tokensIn: number; tokensOut: number; cost: number; duration: number } | null;
  isStreaming: boolean;
  onRun: () => void;
  onStop: () => void;
  outputRef: React.RefObject<HTMLPreElement>;
}) {
  return (
    <div className="flex h-full">
      {/* Left — Input */}
      <div className="w-[340px] shrink-0 border-r border-border/30 flex flex-col p-4 gap-3 overflow-y-auto">
        {/* Model selector */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1 block">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full h-8 rounded-md border border-border/50 bg-muted/30 px-2 text-xs text-foreground"
          >
            <option value="claude-haiku-4-5">claude-haiku-4-5</option>
            <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
            <option value="claude-opus-4-6">claude-opus-4-6</option>
          </select>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Temperature</label>
            <span className="text-[10px] font-mono text-muted-foreground/40">{temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-1.5 accent-brand"
          />
        </div>

        {/* Max tokens */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1 block">Max Tokens</label>
          <Input
            type="number"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
            className="h-8 text-xs bg-muted/30 border-border/50"
          />
        </div>

        {/* User message */}
        <div className="flex-1 flex flex-col">
          <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1">User Message</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a test message..."
            className="flex-1 min-h-[120px] resize-none rounded-md border border-border/50 bg-muted/20 p-3 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-brand/30"
          />
        </div>

        {/* Run / Stop */}
        {isStreaming ? (
          <Button className="h-9 w-full bg-red-500 hover:bg-red-500/90 text-white text-xs gap-1.5" onClick={onStop}>
            <Square className="size-3" /> Stop
          </Button>
        ) : (
          <Button className="h-9 w-full bg-brand hover:bg-brand/90 text-primary-foreground text-xs gap-1.5" onClick={onRun}>
            <Play className="size-3" /> Run Test
          </Button>
        )}
      </div>

      {/* Right — Output terminal */}
      <div className="flex-1 flex flex-col bg-[#050507]">
        {/* Terminal header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#3d3a39]/30 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3 text-brand/50" />
            <span className="text-[10px] font-medium text-brand/50 uppercase tracking-wider">Output</span>
          </div>
          {output && (
            <button
              onClick={() => { navigator.clipboard.writeText(output); toast.success("Copied"); }}
              className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <Copy className="size-3" /> Copy
            </button>
          )}
        </div>

        {/* Terminal content */}
        <pre
          ref={outputRef}
          className="flex-1 overflow-auto p-4 text-[13px] font-mono leading-relaxed text-[#f2f2f2] whitespace-pre-wrap"
        >
          {output || (
            <span className="text-muted-foreground/20">Run a test to see output here...</span>
          )}
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-brand animate-pulse ml-0.5 align-text-bottom" />}
        </pre>

        {/* Stats bar */}
        {stats && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[#3d3a39]/30 text-[10px] font-mono text-muted-foreground/50 shrink-0">
            <span className="text-brand">Completed</span>
            <span>{stats.tokensIn} in / {stats.tokensOut} out</span>
            <span>${stats.cost.toFixed(4)}</span>
            <span>{stats.duration}ms</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function VersionsTab({
  versions, onActivate, onRestore, diffPair, setDiffPair,
}: {
  versions: PromptVersion[];
  onActivate: (id: string) => void;
  onRestore: (v: PromptVersion) => void;
  diffPair: [PromptVersion | null, PromptVersion | null];
  setDiffPair: (pair: [PromptVersion | null, PromptVersion | null]) => void;
}) {
  const showDiff = diffPair[0] && diffPair[1];

  return (
    <div className="flex h-full">
      {/* Version list */}
      <div className={cn("overflow-y-auto", showDiff ? "w-[320px] shrink-0 border-r border-border/30" : "flex-1")}>
        {versions.map((v, i) => {
          const prevVersion = versions[i + 1] || null; // versions are desc, so i+1 is the previous
          return (
            <div
              key={v.id}
              className={cn(
                "flex items-start gap-4 px-5 py-4 border-b border-border/20",
                v.isActive && "bg-brand/[0.04] border-l-2 border-l-brand",
                !v.isActive && "border-l-2 border-l-transparent"
              )}
            >
              <div className="text-lg font-mono font-bold text-muted-foreground/30 w-8 shrink-0">
                v{v.version}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {v.isActive && (
                    <span className="text-[9px] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded uppercase">Active</span>
                  )}
                  <span className="text-[10px] text-muted-foreground/40" suppressHydrationWarning>{formatRelativeTime(v.createdAt)}</span>
                  {v.createdBy && <span className="text-[10px] text-muted-foreground/30">by {v.createdBy}</span>}
                </div>
                {v.notes && <p className="text-xs text-muted-foreground/60 mt-1">{v.notes}</p>}
                {v.tokenCount && <p className="text-[10px] text-muted-foreground/30 mt-1 font-mono">~{v.tokenCount} tokens</p>}

                {/* Actions */}
                <div className="flex items-center gap-3 mt-2">
                  {prevVersion && (
                    <button
                      onClick={() => setDiffPair([prevVersion, v])}
                      className="text-[10px] text-muted-foreground/50 hover:text-brand transition-colors"
                    >
                      View diff
                    </button>
                  )}
                  {!v.isActive && (
                    <button
                      onClick={() => onActivate(v.id)}
                      className="text-[10px] text-muted-foreground/50 hover:text-brand transition-colors"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => onRestore(v)}
                    className="text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="size-2.5" /> Restore to Editor
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diff viewer */}
      {showDiff && diffPair[0] && diffPair[1] && (
        <DiffViewer
          left={diffPair[0]}
          right={diffPair[1]}
          onClose={() => setDiffPair([null, null])}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIFF VIEWER
// ═══════════════════════════════════════════════════════════════════════════════

function DiffViewer({ left, right, onClose }: { left: PromptVersion; right: PromptVersion; onClose: () => void }) {
  const leftLines = left.content.split("\n");
  const rightLines = right.content.split("\n");
  const maxLines = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Diff header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-card/20 shrink-0">
        <span className="text-xs text-muted-foreground">
          Comparing <span className="font-mono text-foreground">v{left.version}</span> → <span className="font-mono text-foreground">v{right.version}</span>
        </span>
        <button onClick={onClose} className="text-muted-foreground/40 hover:text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>

      {/* Side-by-side diff */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-0">
          {/* Left (old) */}
          <div className="flex-1 border-r border-border/20">
            <div className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground/40 border-b border-border/10 bg-red-500/[0.03]">
              v{left.version} (previous)
            </div>
            {Array.from({ length: maxLines }).map((_, i) => {
              const line = leftLines[i] ?? "";
              const otherLine = rightLines[i] ?? "";
              const changed = line !== otherLine;
              const removed = i >= rightLines.length && line;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex text-[11px] font-mono leading-5",
                    removed ? "bg-red-500/10" : changed ? "bg-amber-500/[0.06]" : ""
                  )}
                >
                  <span className="w-8 shrink-0 text-right pr-2 text-muted-foreground/15 select-none">{i + 1}</span>
                  <span className={cn("flex-1 px-2 whitespace-pre-wrap", removed ? "text-red-400/70" : changed ? "text-amber-400/70" : "text-muted-foreground/50")}>
                    {line || " "}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right (new) */}
          <div className="flex-1">
            <div className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground/40 border-b border-border/10 bg-green-500/[0.03]">
              v{right.version} (selected)
            </div>
            {Array.from({ length: maxLines }).map((_, i) => {
              const line = rightLines[i] ?? "";
              const otherLine = leftLines[i] ?? "";
              const changed = line !== otherLine;
              const added = i >= leftLines.length && line;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex text-[11px] font-mono leading-5",
                    added ? "bg-green-500/10" : changed ? "bg-amber-500/[0.06]" : ""
                  )}
                >
                  <span className="w-8 shrink-0 text-right pr-2 text-muted-foreground/15 select-none">{i + 1}</span>
                  <span className={cn("flex-1 px-2 whitespace-pre-wrap", added ? "text-green-400/70" : changed ? "text-amber-400/70" : "text-muted-foreground/50")}>
                    {line || " "}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
