"use client";

import React, { useState, useEffect } from "react";
import { useIntegrationsStore } from "@/stores/integrations-store";
import { PageHeader, GlassPanel } from "@/components/shared";
import { Switch } from "@/components/ui/switch";
import { ModalShell } from "@/components/ui/modal-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, GitBranch, MessageSquare, Cloud, Cpu, Brain, BarChart3, AlertTriangle as SentryIcon,
  CreditCard, Webhook, Plus, Bug, Boxes, Zap, X, Copy, Check, Loader2, Link2, Plug, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Integration } from "@/types/integrations";

/* ── Known-brand icons: used for auto-detect when a user types a recognized
 *    service name. Anything not listed falls back to a first-letter badge. ── */
const ICON_MAP: Record<string, { icon: typeof GitBranch; color: string }> = {
  github: { icon: GitBranch, color: "#ffffff" },
  slack: { icon: MessageSquare, color: "#E01E5A" },
  vercel: { icon: Boxes, color: "#ffffff" },
  aws: { icon: Cloud, color: "#FF9900" },
  openai: { icon: Brain, color: "#10A37F" },
  anthropic: { icon: Zap, color: "#CC785C" },
  datadog: { icon: BarChart3, color: "#632CA6" },
  pagerduty: { icon: Cpu, color: "#06AC38" },
  jira: { icon: Bug, color: "#0052CC" },
  linear: { icon: Boxes, color: "#5E6AD2" },
  sentry: { icon: SentryIcon, color: "#362D59" },
  stripe: { icon: CreditCard, color: "#635BFF" },
  posthog: { icon: BarChart3, color: "#F9BD2B" },
  discord: { icon: MessageSquare, color: "#5865F2" },
  notion: { icon: Boxes, color: "#ffffff" },
};

/* ── Services with a server-side adapter that does more than store a key
 *    (runs testConnection, is invoked by downstream code). Tiles for these
 *    earn the "Native" badge. Everything else is honest key-storage. ── */
const NATIVE_ADAPTERS = new Set(["github", "slack", "anthropic", "openai"]);

/* ── Suggestions shown on the empty state — clicking one prefills the modal.
 *    Kept short (8) so the row wraps cleanly on mobile. ── */
const POPULAR_SUGGESTIONS: { name: string; category: CategoryLower }[] = [
  { name: "OpenAI",    category: "ai" },
  { name: "Anthropic", category: "ai" },
  { name: "GitHub",    category: "source_control" },
  { name: "Slack",     category: "communication" },
  { name: "Stripe",    category: "payment" },
  { name: "Notion",    category: "automation" },
  { name: "Discord",   category: "communication" },
  { name: "Linear",    category: "automation" },
];

const FILTERS = ["All", "Connected", "Disconnected", "AI", "DevOps", "Monitoring", "Automation", "Payment"];

type CategoryLower =
  | "source_control" | "communication" | "deployment" | "monitoring"
  | "ai" | "database" | "payment" | "automation";

const CATEGORY_MAP: Record<string, string> = {
  source_control: "DevOps", deployment: "DevOps", ai: "AI",
  monitoring: "Monitoring", communication: "DevOps", automation: "Automation", payment: "Payment",
  database: "DevOps",
};

/* ── Category options in the Add modal. Labels are human; values are the
 *    lowercase type the Integration record uses; the API expects UPPERCASE. ── */
const CATEGORY_OPTIONS: { value: CategoryLower; label: string }[] = [
  { value: "ai",             label: "AI / LLM" },
  { value: "source_control", label: "Source Control" },
  { value: "deployment",     label: "Deployment / Infra" },
  { value: "communication",  label: "Communication" },
  { value: "monitoring",     label: "Monitoring / Analytics" },
  { value: "automation",     label: "Automation / PM" },
  { value: "payment",        label: "Payment / Billing" },
  { value: "database",       label: "Database / Storage" },
];

/* ── Available webhook events users can subscribe to ── */
const WEBHOOK_EVENTS = [
  { id: "agent.run.completed",    label: "Agent run completed" },
  { id: "agent.run.failed",       label: "Agent run failed" },
  { id: "agent.created",          label: "Agent created" },
  { id: "agent.deleted",          label: "Agent deleted" },
  { id: "workflow.completed",     label: "Workflow completed" },
  { id: "workflow.failed",        label: "Workflow failed" },
  { id: "deployment.started",     label: "Deployment started" },
  { id: "deployment.completed",   label: "Deployment completed" },
  { id: "deployment.failed",      label: "Deployment failed" },
  { id: "incident.opened",        label: "Incident opened" },
  { id: "incident.resolved",      label: "Incident resolved" },
];

function formatTimeShort(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/* ═══════════ ICON PREVIEW ═══════════ */

function IntegrationIcon({ name, iconSlug, size = "md" }: { name: string; iconSlug?: string; size?: "sm" | "md" | "lg" }) {
  const slug = iconSlug || slugify(name);
  const iconInfo = ICON_MAP[slug];
  const sizes = {
    sm: { box: "size-6", icon: "size-3",   text: "text-[10px]" },
    md: { box: "size-8", icon: "size-4",   text: "text-xs" },
    lg: { box: "size-10", icon: "size-5",  text: "text-sm" },
  };
  const cls = sizes[size];

  if (iconInfo) {
    const Icon = iconInfo.icon;
    return (
      <div className={cn("rounded-lg flex items-center justify-center shrink-0", cls.box)} style={{ background: `${iconInfo.color}15` }}>
        <Icon className={cls.icon} style={{ color: iconInfo.color }} />
      </div>
    );
  }

  const letter = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <div className={cn("rounded-lg flex items-center justify-center shrink-0 bg-brand/10", cls.box)}>
      <span className={cn("font-bold text-brand", cls.text)}>{letter}</span>
    </div>
  );
}

/* ═══════════ ADD INTEGRATION MODAL ═══════════ */

function AddIntegrationModal({
  open,
  onClose,
  onCreated,
  prefillName = "",
  prefillCategory = "ai",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefillName?: string;
  prefillCategory?: CategoryLower;
}) {
  const [name, setName] = useState(prefillName);
  const [apiKey, setApiKey] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryLower>(prefillCategory);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep form in sync with prefill when modal reopens with a different suggestion
  useEffect(() => {
    if (open) {
      setName(prefillName);
      setCategory(prefillCategory);
      setApiKey("");
      setDescription("");
      setError(null);
      setSubmitting(false);
    }
  }, [open, prefillName, prefillCategory]);

  const iconSlug = slugify(name);
  const isNative = NATIVE_ADAPTERS.has(iconSlug);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim()) return setError("Name is required");
    if (!apiKey.trim()) return setError("API key or credential is required");

    setSubmitting(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || `${name.trim()} integration`,
          icon: iconSlug || "plug",
          category: category.toUpperCase(),
          config: { apiKey: apiKey.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create integration");
      toast.success(`${name.trim()} connected`);
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell open={open} onClose={onClose} dismissable={!submitting}>
      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground">Add Integration</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" disabled={submitting}>
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Live icon preview */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
            <IntegrationIcon name={name || "?"} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {name.trim() || "Your integration"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {isNative ? (
                  <span className="inline-flex items-center gap-1 text-brand">
                    <Shield className="size-2.5" />
                    Native adapter — connection will be verified on save
                  </span>
                ) : (
                  "Key storage — your agents can reference this credential"
                )}
              </p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Service Name
            </label>
            <Input
              placeholder="e.g. OpenAI, Stripe, My Internal API..."
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              className="h-9"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
              API Key / Credential
            </label>
            <Input
              type="password"
              placeholder="sk-... or your bearer token"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setError(null); }}
              className="h-9 font-mono"
            />
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Encrypted at rest. Agents reference it by service name at runtime.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryLower)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Description <span className="text-muted-foreground/50 normal-case font-normal">(optional)</span>
            </label>
            <Input
              placeholder="What this service does for your workspace..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9"
              maxLength={120}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-brand hover:bg-brand/90 text-primary-foreground"
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !apiKey.trim()}
          >
            {submitting ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Connecting...</> : "Connect"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ═══════════ ADD WEBHOOK MODAL ═══════════ */

function AddWebhookModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setUrl("");
    setEvents([]);
    setError(null);
    setCreatedSecret(null);
    setCopied(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggleEvent = (id: string) => {
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!url.trim()) return setError("URL is required");
    try {
      new URL(url);
    } catch {
      return setError("URL must be a valid https:// URL");
    }
    if (!url.startsWith("https://")) return setError("URL must start with https://");
    if (events.length === 0) return setError("Select at least one event");

    setSubmitting(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), events }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create webhook");
      toast.success("Webhook created");
      setCreatedSecret(data?.data?.secret || data?.secret || null);
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!createdSecret) return;
    await navigator.clipboard.writeText(createdSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) return null;

  return (
    <ModalShell open={open} onClose={handleClose} dismissable={!submitting}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Webhook className="size-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground">
              {createdSecret ? "Webhook Created" : "Add Webhook"}
            </h2>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground" disabled={submitting}>
            <X className="size-4" />
          </button>
        </div>

        {createdSecret ? (
          <div className="px-5 py-5 space-y-4">
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.05] px-3 py-3">
              <p className="text-xs text-amber-300 font-medium">
                Copy your signing secret now — it will not be shown again.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Use this secret to verify webhook payload signatures with HMAC-SHA256.
              </p>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Signing Secret</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted/40 border border-border px-3 py-2 text-[11px] font-mono text-foreground break-all">
                  {createdSecret}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
                  {copied ? <><Check className="size-3.5 mr-1.5 text-green-400" />Copied</> : <><Copy className="size-3.5 mr-1.5" />Copy</>}
                </Button>
              </div>
            </div>
            <div className="flex justify-end border-t border-border pt-3">
              <Button size="sm" className="bg-brand hover:bg-brand/90 text-primary-foreground" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Endpoint URL
                </label>
                <Input
                  placeholder="https://your-service.com/webhooks/mothership"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(null); }}
                  className="h-9 font-mono text-xs"
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Must be HTTPS. We&apos;ll POST a JSON payload with HMAC-SHA256 signature header.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Events ({events.length} selected)
                  </label>
                  <button
                    type="button"
                    className="text-[10px] text-brand hover:underline"
                    onClick={() => setEvents(events.length === WEBHOOK_EVENTS.length ? [] : WEBHOOK_EVENTS.map((e) => e.id))}
                  >
                    {events.length === WEBHOOK_EVENTS.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-lg border border-border bg-muted/20 p-2">
                  {WEBHOOK_EVENTS.map((ev) => {
                    const checked = events.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
                          checked ? "bg-brand/10 border border-brand/30" : "border border-transparent hover:bg-muted/40"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEvent(ev.id)}
                          className="accent-brand size-3.5 shrink-0"
                        />
                        <span className="text-[11px] font-mono text-foreground">{ev.id}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 py-2">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <Button variant="outline" size="sm" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-brand hover:bg-brand/90 text-primary-foreground"
                onClick={handleSubmit}
                disabled={submitting || !url.trim() || events.length === 0}
              >
                {submitting ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Creating...</> : "Create Webhook"}
              </Button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

/* ═══════════ MAIN PAGE ═══════════ */

export default function IntegrationsPage() {
  const { integrations, webhooks, fetch: fetchIntegrations } = useIntegrationsStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  // Add integration modal state (+ optional prefill from Popular suggestions)
  const [addOpen, setAddOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [prefillCategory, setPrefillCategory] = useState<CategoryLower>("ai");

  // Add webhook modal state
  const [addWebhookOpen, setAddWebhookOpen] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchIntegrations(); }, []);

  const connected = integrations.filter((i) => i.status === "connected").length;
  const disconnected = integrations.filter((i) => i.status === "disconnected").length;
  const errors = integrations.filter((i) => i.status === "error").length;
  const totalForBar = Math.max(integrations.length, 1);

  const filtered = integrations.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "Connected") return i.status === "connected";
    if (filter === "Disconnected") return i.status === "disconnected";
    if (filter !== "All") return CATEGORY_MAP[i.category] === filter;
    return true;
  });

  const openAddModal = (name = "", category: CategoryLower = "ai") => {
    setPrefillName(name);
    setPrefillCategory(category);
    setAddOpen(true);
  };

  const handleDisconnect = async (integ: Integration) => {
    try {
      const res = await fetch(`/api/integrations/${integ.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast.success(`${integ.name} disconnected`);
      fetchIntegrations();
    } catch {
      toast.error(`Failed to disconnect ${integ.name}`);
    }
  };

  const hasIntegrations = integrations.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Store API keys, credentials, and webhooks for any service your agents need"
      >
        {hasIntegrations && (
          <Button
            onClick={() => openAddModal()}
            size="sm"
            className="bg-brand hover:bg-brand/90 text-primary-foreground"
          >
            <Plus className="size-3.5 mr-1.5" />
            Add Integration
          </Button>
        )}
      </PageHeader>

      {!hasIntegrations ? (
        /* ── EMPTY STATE ── */
        <GlassPanel padding="lg">
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex items-center justify-center size-16 rounded-2xl bg-muted/30 border border-border/50">
              <Plug className="size-7 text-muted-foreground/30" />
            </div>
            <div className="max-w-md">
              <p className="text-base font-semibold text-foreground">No integrations yet</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Connect anything your agents need — an LLM provider, Slack for alerts, Stripe for billing data,
                your internal API. MotherShip stores the credential encrypted and makes it available at runtime.
              </p>
            </div>
            <Button
              onClick={() => openAddModal()}
              className="bg-brand hover:bg-brand/90 text-primary-foreground mt-1"
            >
              <Plus className="size-4 mr-1.5" />
              Add your first integration
            </Button>

            {/* Popular shortcuts — prefill the modal with a known name + category */}
            <div className="mt-5 pt-5 border-t border-border/50 w-full max-w-xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                Popular
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR_SUGGESTIONS.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => openAddModal(s.name, s.category)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground hover:border-brand/50 hover:bg-brand/5 transition-colors"
                  >
                    <IntegrationIcon name={s.name} size="sm" />
                    <span className="font-medium">{s.name}</span>
                    {NATIVE_ADAPTERS.has(slugify(s.name)) && (
                      <span className="text-[9px] font-mono text-brand/80 border border-brand/30 rounded px-1 py-0.5 uppercase">
                        Native
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-3">
                Or type any service name in the Add modal — we&apos;ll store the key either way.
              </p>
            </div>
          </div>
        </GlassPanel>
      ) : (
        <>
          {/* Summary stats */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground">
              <span className="text-green-400 font-medium">{connected} connected</span>
              {" \u00b7 "}
              <span className="text-foreground/60">{disconnected} disconnected</span>
              {errors > 0 && <>{" \u00b7 "}<span className="text-red-400 font-medium">{errors} error</span></>}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-muted/40 max-w-[200px]">
              <div
                className="h-1.5 rounded-full bg-green-500 transition-all"
                style={{ width: `${(connected / totalForBar) * 100}%` }}
              />
            </div>
          </div>

          {/* Search + filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search integrations..."
                className="h-8 w-full rounded-lg border border-border bg-muted/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                    filter === f ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Cards grid */}
          {filtered.length === 0 ? (
            <GlassPanel padding="lg">
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex items-center justify-center size-12 rounded-xl bg-muted/30 border border-border/50">
                  <Search className="size-5 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No integrations match your filters</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try a different search term or filter category.
                  </p>
                </div>
                <button
                  className="text-xs text-brand hover:underline"
                  onClick={() => { setSearch(""); setFilter("All"); }}
                >
                  Clear filters
                </button>
              </div>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((integ) => {
                const isConnected = integ.status === "connected";
                const isError = integ.status === "error";
                const isNative = NATIVE_ADAPTERS.has(integ.icon);

                return (
                  <GlassPanel
                    key={integ.id}
                    padding="md"
                    hover
                    className={cn(
                      "h-[140px] flex flex-col justify-between",
                      isError && "border-l-[3px] border-l-[#EF4444]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IntegrationIcon name={integ.name} iconSlug={integ.icon} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground truncate">{integ.name}</span>
                            {isNative && (
                              <span className="text-[9px] font-mono text-brand/80 border border-brand/30 rounded px-1 py-0.5 uppercase shrink-0">
                                Native
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("relative flex size-2", isConnected && "text-green-400")}>
                          {isConnected && <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />}
                          <span className={cn("relative size-2 rounded-full", isConnected ? "bg-green-400" : isError ? "bg-red-400" : "bg-[#555]")} />
                        </span>
                        <span className={cn("text-[10px] font-medium", isConnected ? "text-green-400" : isError ? "text-red-400" : "text-muted-foreground")}>
                          {isConnected ? "Connected" : isError ? "Error" : "Disconnected"}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 mt-2">
                      <p className="text-[13px] text-muted-foreground line-clamp-2">{integ.description}</p>
                      {isConnected && integ.lastSync && (
                        <p className="font-mono text-[11px] text-brand mt-1" suppressHydrationWarning>
                          Last sync: {formatTimeShort(integ.lastSync)}
                        </p>
                      )}
                      {isError && (
                        <p className="text-[11px] text-red-400 mt-1">Authentication expired — reconnect</p>
                      )}
                    </div>

                    <div className="flex justify-end mt-1">
                      <button
                        className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                        onClick={() => handleDisconnect(integ)}
                      >
                        {isConnected || isError ? "Disconnect" : "Remove"}
                      </button>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ WEBHOOKS ═══ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Webhook className="size-4 text-brand" />
              Webhooks
              {webhooks.length > 0 && (
                <span className="text-[10px] font-mono text-muted-foreground/60">({webhooks.length})</span>
              )}
            </h2>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 ml-6">
              Receive HTTPS POST callbacks when events fire in your project.
            </p>
          </div>
          <button
            className="flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
            onClick={() => setAddWebhookOpen(true)}
          >
            <Plus className="size-3" /> Add Webhook
          </button>
        </div>

        <GlassPanel padding="none">
          {webhooks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex items-center justify-center size-12 rounded-xl bg-muted/30 border border-border/50">
                <Link2 className="size-5 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No webhooks configured</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Subscribe an HTTPS endpoint to receive real-time event notifications when agents run, workflows complete, or deployments trigger.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-brand hover:bg-brand/90 text-primary-foreground mt-1"
                onClick={() => setAddWebhookOpen(true)}
              >
                <Plus className="size-3.5 mr-1.5" />
                Add your first webhook
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Endpoint", "Events", "Last Triggered", "Success Rate", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        {wh.url.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}/•••
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {wh.events.slice(0, 2).map((e) => (
                          <span key={e} className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono bg-muted/40 text-muted-foreground border border-border">
                            {e}
                          </span>
                        ))}
                        {wh.events.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{wh.events.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono" suppressHydrationWarning>
                      {wh.lastDelivery ? formatTimeShort(wh.lastDelivery) : "Never"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("font-mono text-xs", wh.successRate >= 95 ? "text-green-400" : wh.successRate >= 80 ? "text-amber-400" : "text-red-400")}>
                        {wh.successRate}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Switch
                        checked={wh.status === "active"}
                        onCheckedChange={() => toast.success(`Webhook ${wh.status === "active" ? "paused" : "activated"}`)}
                        className="data-[state=checked]:bg-brand"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassPanel>
      </div>

      {/* Modals */}
      <AddIntegrationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => fetchIntegrations()}
        prefillName={prefillName}
        prefillCategory={prefillCategory}
      />
      <AddWebhookModal
        open={addWebhookOpen}
        onClose={() => setAddWebhookOpen(false)}
        onCreated={() => fetchIntegrations()}
      />
    </div>
  );
}
