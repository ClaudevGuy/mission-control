"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, GlassPanel } from "@/components/shared";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Download, Trash2, Pause, RotateCcw, ShieldX, Bell, Shield, Plus, X, Loader2, Link2, Key, Copy } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { useIntegrationsStore } from "@/stores/integrations-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { invalidate } from "@/lib/store-cache";

const NAV_ITEMS = ["General", "Appearance", "Notifications", "Data & Privacy", "Security", "API Keys", "Integrations", "Danger Zone"];

const NOTIF_EVENTS: { name: string; app: boolean; email: boolean; slack: boolean }[] = [];

const LOGINS: { ip: string; location: string; device: string; time: string; status: string }[] = [];


export default function SettingsPage() {
  const [section, setSection] = useState("General");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const { theme, setTheme } = useTheme();
  const [notifs, setNotifs] = useState(NOTIF_EVENTS);
  const [logRetention, setLogRetention] = useState(30);
  const [metricsRetention, setMetricsRetention] = useState(90);
  const [llmRetention, setLlmRetention] = useState(60);
  const [sessionTimeout, setSessionTimeout] = useState("8h");
  const [require2FA, setRequire2FA] = useState(false);
  const [polling, setPolling] = useState(true);
  const [pollInterval, setPollInterval] = useState("5s");
  // Integrations state
  const { integrations, fetch: fetchIntegrations } = useIntegrationsStore();
  const [addIntOpen, setAddIntOpen] = useState(false);
  const [addIntName, setAddIntName] = useState("");
  const [addIntKey, setAddIntKey] = useState("");
  const [addIntCategory, setAddIntCategory] = useState("ai");
  const [addingInt, setAddingInt] = useState(false);
  const [addIntError, setAddIntError] = useState<string | null>(null);
  // API Keys state
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; prefix: string; scopes: string[]; createdAt: string; lastUsed: string | null; expiresAt: string | null; status: string }[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [createKeyOpen, setCreateKeyOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("never");
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKeyRaw, setCreatedKeyRaw] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const projectName = useSettingsStore((s) => s.projectName);
  const projectDescription = useSettingsStore((s) => s.projectDescription);
  const storeSetProjectName = useSettingsStore((s) => s.setProjectName);
  const storeSetProjectDescription = useSettingsStore((s) => s.setProjectDescription);
  const projectLogo = useSettingsStore((s) => s.projectLogo);
  const storeSetProjectLogo = useSettingsStore((s) => s.setProjectLogo);
  const fetchSettings = useSettingsStore((s) => s.fetch);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSettings(); }, []);


  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Project configuration, appearance, and account management" />

      <div className="flex gap-6">
        {/* Left nav */}
        <div className="w-[200px] shrink-0 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => setSection(item)}
              className={cn(
                "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors",
                section === item
                  ? "text-foreground bg-muted/50 font-medium"
                  : item === "Danger Zone"
                    ? "text-red-400/60 hover:text-red-400 hover:bg-red-400/[0.04]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 space-y-6">

          {/* ─── GENERAL ─── */}
          {section === "General" && (
            <GlassPanel padding="lg">
              <h3 className="text-sm font-semibold text-foreground mb-4">Project Identity</h3>
              <div className="space-y-4 max-w-lg">
                <div><label className="text-xs text-muted-foreground block mb-1">Project Name</label><input value={projectName} onChange={(e) => storeSetProjectName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00d992]/50" /></div>
                <div><label className="text-xs text-muted-foreground block mb-1">Description</label><textarea value={projectDescription} onChange={(e) => storeSetProjectDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none resize-none focus:border-[#00d992]/50" /></div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Logo URL</label>
                  <div className="flex items-center gap-3">
                    {/* Preview */}
                    <div className="relative shrink-0 size-9 rounded-lg border border-border bg-muted/30 overflow-hidden flex items-center justify-center">
                      {projectLogo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={projectLogo} alt="Logo preview" className="size-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40 font-mono">URL</span>
                      )}
                    </div>
                    <input
                      value={projectLogo}
                      onChange={(e) => storeSetProjectLogo(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="h-9 flex-1 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00d992]/50 placeholder:text-muted-foreground/30"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground/50">Appears in the sidebar. Use a square image for best results.</p>
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Timezone</label>
                  <select className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none"><option>America/Los_Angeles (PST)</option><option>America/New_York (EST)</option><option>Europe/London (GMT)</option><option>UTC</option></select>
                </div>
                <button className="text-xs font-medium text-primary-foreground bg-[#00d992] rounded-lg px-4 py-2 hover:bg-[#00d992]/80" onClick={() => toast.success("Settings saved")}>Save Changes</button>
              </div>
            </GlassPanel>
          )}

          {/* ─── APPEARANCE ─── */}
          {section === "Appearance" && (
            <div className="space-y-6">
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-4">Theme</h3>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  {(["dark", "light", "system"] as const).map((t) => (
                    <button key={t} onClick={() => setTheme(t)} className={cn("rounded-lg border p-4 text-center text-sm font-medium capitalize transition-all", theme === t ? "border-primary/50 bg-primary/[0.06] text-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-border")}>
                      {t}
                    </button>
                  ))}
                </div>
              </GlassPanel>
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-4">Live Polling</h3>
                <div className="flex items-center gap-4">
                  <Switch checked={polling} onCheckedChange={setPolling} className="data-[state=checked]:bg-[#00d992]" />
                  <span className="text-sm text-foreground">{polling ? "Enabled" : "Disabled"}</span>
                  {polling && (
                    <select value={pollInterval} onChange={(e) => setPollInterval(e.target.value)} className="h-8 rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none">
                      <option value="5s">Every 5s</option><option value="10s">Every 10s</option><option value="30s">Every 30s</option><option value="1m">Every 1min</option>
                    </select>
                  )}
                </div>
              </GlassPanel>
            </div>
          )}

          {/* ─── NOTIFICATIONS ─── */}
          {section === "Notifications" && (
            notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Bell className="size-8 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground">No notification events configured</p>
                <p className="text-xs text-muted-foreground/50">Notification preferences will appear here when events are set up</p>
              </div>
            ) : (
              <GlassPanel padding="none">
                <div className="px-4 py-3 border-b border-border"><h3 className="text-sm font-semibold text-foreground">Notification Preferences</h3></div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border">
                    {["Event", "In-App", "Email", "Slack"].map((h) => <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-2">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {notifs.map((n, i) => (
                      <tr key={n.name} className="border-b border-border/50">
                        <td className="px-4 py-2 text-foreground">{n.name}</td>
                        {(["app", "email", "slack"] as const).map((ch) => (
                          <td key={ch} className="px-4 py-2">
                            <Switch checked={n[ch]} onCheckedChange={(v) => { const next = [...notifs]; next[i] = { ...next[i], [ch]: v }; setNotifs(next); }} className="data-[state=checked]:bg-[#00d992]" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3"><button className="text-xs font-medium text-primary-foreground bg-[#00d992] rounded-lg px-4 py-2 hover:bg-[#00d992]/80" onClick={() => toast.success("Preferences saved")}>Save Preferences</button></div>
              </GlassPanel>
            )
          )}

          {/* ─── DATA & PRIVACY ─── */}
          {section === "Data & Privacy" && (
            <div className="space-y-6">
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-4">Data Retention</h3>
                <div className="space-y-4 max-w-lg">
                  {[
                    { label: "Log Retention", value: logRetention, set: setLogRetention },
                    { label: "Metrics Retention", value: metricsRetention, set: setMetricsRetention },
                    { label: "LLM Call History", value: llmRetention, set: setLlmRetention },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{s.label}</span><span className="font-mono text-foreground">{s.value} days</span></div>
                      <input type="range" min={7} max={90} step={1} value={s.value} onChange={(e) => s.set(Number(e.target.value))} className="w-full accent-[#00d992]" />
                    </div>
                  ))}
                </div>
              </GlassPanel>
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-3">Export Data</h3>
                <div className="flex gap-3">
                  <button className="text-xs text-foreground bg-muted/50 rounded-lg px-4 py-2 hover:bg-muted" onClick={() => toast.success("Export started")}><Download className="size-3 inline mr-1" /> Export All Data</button>
                  <button className="text-xs text-foreground bg-muted/50 rounded-lg px-4 py-2 hover:bg-muted" onClick={() => toast.success("Logs exported")}><Download className="size-3 inline mr-1" /> Export Logs</button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Last export: Never</p>
              </GlassPanel>
            </div>
          )}

          {/* ─── SECURITY ─── */}
          {section === "Security" && (
            <div className="space-y-6">
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-4">Session Settings</h3>
                <div className="space-y-4 max-w-md">
                  <div><label className="text-xs text-muted-foreground block mb-1">Session Timeout</label>
                    <select value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none"><option value="1h">1 hour</option><option value="4h">4 hours</option><option value="8h">8 hours</option><option value="24h">24 hours</option><option value="never">Never</option></select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-foreground">Require 2FA for all members</p>
                      {!require2FA && <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5"><ShieldX className="size-3" /> 2 team members don&apos;t have 2FA enabled</p>}
                    </div>
                    <Switch checked={require2FA} onCheckedChange={setRequire2FA} className="data-[state=checked]:bg-[#00d992]" />
                  </div>
                </div>
              </GlassPanel>
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-3">Recent Login Activity</h3>
                {LOGINS.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Shield className="size-6 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground/50">No login activity recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {LOGINS.map((l, i) => (
                      <div key={i} className={cn("flex items-center gap-4 px-3 py-2 rounded-lg text-xs", i === 0 && "bg-muted/30 font-medium", l.status === "failed" && "bg-red-400/[0.04]")}>
                        <span className="font-mono text-muted-foreground w-28 shrink-0">{l.ip}</span>
                        <span className="text-muted-foreground w-32 shrink-0 truncate">{l.location}</span>
                        <span className="text-muted-foreground flex-1 truncate">{l.device}</span>
                        <span className="text-muted-foreground w-16 shrink-0">{l.time}</span>
                        <span className={cn("font-mono text-[10px]", l.status === "success" ? "text-green-400" : "text-red-400")}>{l.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassPanel>
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-2">Single Sign-On (SSO)</h3>
                <p className="text-xs text-muted-foreground mb-3">Not configured. Supports Google, GitHub, and SAML.</p>
                <button className="text-xs text-foreground bg-muted/50 rounded-lg px-4 py-2 hover:bg-muted" onClick={() => toast.success("SSO configuration opened")}>Configure SSO</button>
              </GlassPanel>
            </div>
          )}

          {/* ─── API KEYS ─── */}
          {section === "API Keys" && (() => {
            const fetchKeys = () => {
              setApiKeysLoading(true);
              fetch("/api/team/api-keys")
                .then((r) => r.json())
                .then((d) => setApiKeys(d.data?.keys || []))
                .catch(() => setApiKeys([]))
                .finally(() => setApiKeysLoading(false));
            };

            // Fetch on first render of this section
            if (!apiKeysLoading && apiKeys.length === 0 && !keyError) {
              fetchKeys();
            }

            const handleCreateKey = async () => {
              if (!newKeyName.trim()) { setKeyError("Key name is required"); return; }
              setCreatingKey(true);
              setKeyError(null);
              try {
                const res = await fetch("/api/team/api-keys", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: newKeyName.trim(), scopes: newKeyScopes, expiresIn: newKeyExpiry }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to create key");
                setCreatedKeyRaw(data.data.key.rawKey);
                fetchKeys();
              } catch (err) {
                setKeyError((err as Error).message);
              } finally {
                setCreatingKey(false);
              }
            };

            const handleDoneKey = () => {
              setCreatedKeyRaw(null);
              setCreateKeyOpen(false);
              setNewKeyName("");
              setNewKeyScopes(["read"]);
              setNewKeyExpiry("never");
            };

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">API Keys</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Keys for external tools to send events to your dashboard</p>
                  </div>
                  <Button size="sm" className="bg-[#00d992] hover:bg-[#00d992]/90 text-black" onClick={() => setCreateKeyOpen(true)}>
                    <Key className="size-3.5 mr-1" /> Create Key
                  </Button>
                </div>

                {apiKeys.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center rounded-lg border border-border bg-card/50">
                    <Key className="size-8 text-muted-foreground/20" />
                    <p className="text-sm font-medium text-muted-foreground">No API keys yet</p>
                    <p className="text-xs text-muted-foreground/50">Create a key to let external tools send data to Mission Control</p>
                    <Button size="sm" className="bg-[#00d992] hover:bg-[#00d992]/90 text-black mt-1" onClick={() => setCreateKeyOpen(true)}>
                      <Key className="size-3.5 mr-1" /> Create your first key
                    </Button>
                  </div>
                ) : (
                  <GlassPanel padding="none">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Name", "Key", "Scopes", "Created", "Last Used", "Status", ""].map((h) => (
                            <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.map((k) => (
                          <tr key={k.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-foreground">{k.name}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">mc_{k.prefix}-••••••••</td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1">
                                {k.scopes.map((s) => (
                                  <span key={s} className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono bg-muted/40 text-muted-foreground border border-border">{s}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(k.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : "Never"}</td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-500/15 text-green-400">Active</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                                onClick={() => {
                                  const name = k.name;
                                  const id = k.id;
                                  fetch(`/api/team/api-keys/${id}`, { method: "DELETE" })
                                    .then((res) => {
                                      if (res.ok) {
                                        toast.success(`Key "${name}" deleted`);
                                        setApiKeys((prev) => prev.filter((key) => key.id !== id));
                                      } else {
                                        toast.error("Failed to delete key");
                                      }
                                    })
                                    .catch(() => toast.error("Failed to delete key"));
                                }}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </GlassPanel>
                )}

                {/* Quick-start guide */}
                <GlassPanel padding="lg">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Connect External Agents</h3>
                  <p className="text-xs text-muted-foreground mb-4">Send events from any AI framework to see agents on your dashboard.</p>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#00d992]/10 text-[10px] font-bold text-[#00d992] font-mono mt-0.5">1</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">Create an API key above</p>
                        <p className="text-[11px] text-muted-foreground">Select the &quot;Ingest&quot; scope so the key can receive events.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#00d992]/10 text-[10px] font-bold text-[#00d992] font-mono mt-0.5">2</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">Send events from your app</p>
                        <p className="text-[11px] text-muted-foreground mb-2">After each agent run, POST to the ingest endpoint:</p>
                        <pre className="rounded-lg bg-[#050507] border border-[#3d3a39] p-3 text-[11px] font-mono text-[#f2f2f2] overflow-x-auto whitespace-pre">{`curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://your-dashboard.com"}/api/events/ingest \\
  -H "Authorization: Bearer mc_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "agent.run.completed",
    "source": "my-app",
    "agent": { "id": "agent-1", "name": "My Agent" },
    "data": { "cost": 0.05, "duration": 3000 }
  }'`}</pre>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#00d992]/10 text-[10px] font-bold text-[#00d992] font-mono mt-0.5">3</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">See agents on your dashboard</p>
                        <p className="text-[11px] text-muted-foreground">External agents appear automatically on the Overview page with their status, run count, and costs.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/30">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground/70">Or use the SDK:</span>{" "}
                      <code className="font-mono text-[#00d992] bg-[#00d992]/10 rounded px-1 py-0.5">npm install @mission-control/sdk</code>{" "}
                      — see <code className="font-mono text-[#00d992] bg-[#00d992]/10 rounded px-1 py-0.5">packages/sdk/README.md</code> for full docs.
                    </p>
                  </div>
                </GlassPanel>

                {/* Create Key Modal */}
                {createKeyOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => !createdKeyRaw && handleDoneKey()} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Key className="size-4 text-[#00d992]" />
                            <h2 className="text-sm font-semibold text-foreground">{createdKeyRaw ? "Key Created" : "Create API Key"}</h2>
                          </div>
                          {!createdKeyRaw && <button onClick={handleDoneKey} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>}
                        </div>

                        {createdKeyRaw ? (
                          <div className="px-5 py-5 space-y-4">
                            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-4 py-3 flex items-start gap-2">
                              <Shield className="size-4 text-red-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-400">Copy this key now</p>
                                <p className="text-xs text-foreground/70 mt-0.5">It will never be shown again.</p>
                              </div>
                            </div>
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="font-mono text-xs text-foreground break-all select-all">{createdKeyRaw}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button className="flex-1 bg-[#00d992] hover:bg-[#00d992]/90 text-black" onClick={() => { navigator.clipboard.writeText(createdKeyRaw); toast.success("Copied"); }}>
                                <Copy className="size-3.5 mr-1.5" /> Copy Key
                              </Button>
                              <Button variant="outline" onClick={handleDoneKey}>Done</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="px-5 py-5 space-y-4">
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Key Name</label>
                                <Input placeholder="e.g. Production SDK Key" value={newKeyName} onChange={(e) => { setNewKeyName(e.target.value); setKeyError(null); }} className="h-9" autoFocus />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Scopes</label>
                                <div className="space-y-2">
                                  {[
                                    { value: "read", label: "Read", desc: "Read data and list resources" },
                                    { value: "write", label: "Write", desc: "Create and update resources" },
                                    { value: "ingest", label: "Ingest", desc: "Send events from external agents" },
                                  ].map((s) => (
                                    <label key={s.value} className="flex items-start gap-2.5 cursor-pointer">
                                      <input type="checkbox" checked={newKeyScopes.includes(s.value)} onChange={() => setNewKeyScopes((prev) => prev.includes(s.value) ? prev.filter((x) => x !== s.value) : [...prev, s.value])} className="mt-0.5 rounded border-border" />
                                      <div>
                                        <span className="text-xs font-medium text-foreground">{s.label}</span>
                                        <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Expiry</label>
                                <select value={newKeyExpiry} onChange={(e) => setNewKeyExpiry(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                                  <option value="30d">30 days</option>
                                  <option value="90d">90 days</option>
                                  <option value="1y">1 year</option>
                                  <option value="never">Never</option>
                                </select>
                              </div>
                              {keyError && (
                                <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 py-2">
                                  <p className="text-xs text-red-400">{keyError}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
                              <Button variant="outline" size="sm" onClick={handleDoneKey} disabled={creatingKey}>Cancel</Button>
                              <Button size="sm" className="bg-[#00d992] hover:bg-[#00d992]/90 text-black" onClick={handleCreateKey} disabled={creatingKey || !newKeyName.trim()}>
                                {creatingKey ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Generating...</> : "Generate Key"}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ─── INTEGRATIONS ─── */}
          {section === "Integrations" && (() => {
            const coreServices = [
              { name: "Anthropic (Claude)", desc: "AI model provider — powers agent execution", color: "#CC785C" },
              { name: "Neon PostgreSQL", desc: "Serverless database — stores all project data", color: "#00d992" },
            ];

            const handleAddInt = async () => {
              if (!addIntName.trim() || !addIntKey.trim()) {
                setAddIntError("Name and API key are required");
                return;
              }
              setAddingInt(true);
              setAddIntError(null);
              try {
                const res = await fetch("/api/integrations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: addIntName.trim(),
                    description: `${addIntName.trim()} integration`,
                    icon: addIntName.trim().toLowerCase().replace(/\s+/g, "-"),
                    category: addIntCategory,
                    config: { apiKey: addIntKey.trim() },
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed to connect");
                toast.success(`${addIntName} connected successfully`);
                setAddIntOpen(false);
                setAddIntName("");
                setAddIntKey("");
                invalidate("integrations");
                fetchIntegrations();
              } catch (err) {
                setAddIntError((err as Error).message);
              } finally {
                setAddingInt(false);
              }
            };

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Connected Services ({coreServices.length + integrations.filter((i) => i.status === "connected").length})
                  </p>
                  <Button size="sm" className="bg-[#00d992] hover:bg-[#00d992]/90 text-black" onClick={() => setAddIntOpen(true)}>
                    <Plus className="size-3.5 mr-1" /> Add Integration
                  </Button>
                </div>

                {/* Core services (always connected) */}
                <div className="space-y-2">
                  {coreServices.map((svc) => (
                    <div key={svc.name} className="flex items-center justify-between rounded-lg border border-[#00d992]/20 bg-[#00d992]/[0.03] px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${svc.color}15`, color: svc.color }}>
                          {svc.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{svc.name}</p>
                          <p className="text-xs text-muted-foreground">{svc.desc}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                        <span className="size-1.5 rounded-full bg-green-400 animate-pulse" /> Active
                      </span>
                    </div>
                  ))}

                  {/* User-added integrations from DB */}
                  {integrations.filter((i) => i.status === "connected").map((integ) => (
                    <div key={integ.id} className="flex items-center justify-between rounded-lg border border-[#00d992]/20 bg-[#00d992]/[0.03] px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg flex items-center justify-center text-xs font-bold bg-[#00d992]/10 text-[#00d992]">
                          {integ.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{integ.name}</p>
                          <p className="text-xs text-muted-foreground">{integ.description || integ.category}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400">
                        <span className="size-1.5 rounded-full bg-green-400 animate-pulse" /> Connected
                      </span>
                    </div>
                  ))}
                </div>

                {/* Fallback note */}
                <div className="rounded-lg border border-border/50 bg-muted/5 px-4 py-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground/70">Troubleshooting:</span> If an integration added here isn&apos;t working, you can also add the API key directly to your <code className="font-mono text-[#00d992] bg-[#00d992]/10 rounded px-1 py-0.5 text-[10px]">.env</code> file as a fallback. See <code className="font-mono text-[#00d992] bg-[#00d992]/10 rounded px-1 py-0.5 text-[10px]">.env.example</code> for the key names.
                  </p>
                </div>

                {/* Add Integration Modal */}
                {addIntOpen && (
                  <>
                    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setAddIntOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <div className="w-full max-w-md rounded-lg border border-border bg-card shadow-2xl">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Link2 className="size-4 text-[#00d992]" />
                            <h2 className="text-sm font-semibold text-foreground">Add Integration</h2>
                          </div>
                          <button onClick={() => setAddIntOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
                        </div>
                        <div className="px-5 py-5 space-y-4">
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Service Name</label>
                            <Input placeholder="e.g. OpenAI, Slack, Vercel..." value={addIntName} onChange={(e) => { setAddIntName(e.target.value); setAddIntError(null); }} className="h-9" autoFocus />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">API Key</label>
                            <Input type="password" placeholder="sk-..." value={addIntKey} onChange={(e) => { setAddIntKey(e.target.value); setAddIntError(null); }} className="h-9 font-mono" />
                            <p className="text-[10px] text-muted-foreground/50 mt-1">Stored encrypted in the database. Agents will use this key automatically.</p>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Category</label>
                            <select value={addIntCategory} onChange={(e) => setAddIntCategory(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                              <option value="ai">AI Provider</option>
                              <option value="monitoring">Monitoring</option>
                              <option value="communication">Communication</option>
                              <option value="source_control">Source Control</option>
                              <option value="deployment">Deployment</option>
                              <option value="automation">Automation</option>
                            </select>
                          </div>
                          {addIntError && (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 py-2">
                              <p className="text-xs text-red-400">{addIntError}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
                          <Button variant="outline" size="sm" onClick={() => setAddIntOpen(false)} disabled={addingInt}>Cancel</Button>
                          <Button size="sm" className="bg-[#00d992] hover:bg-[#00d992]/90 text-black" onClick={handleAddInt} disabled={addingInt || !addIntName.trim() || !addIntKey.trim()}>
                            {addingInt ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Connecting...</> : "Connect"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ─── DANGER ZONE ─── */}
          {section === "Danger Zone" && (
            <div className="space-y-4">
              {[
                { title: "Pause All Agents", desc: "Stop all running agents immediately.", consequence: "All active agent tasks will be terminated.", btn: "Pause All", color: "amber", icon: Pause },
                { title: "Reset All Settings", desc: "Restore all settings to their default values.", consequence: "Custom configurations will be lost.", btn: "Reset", color: "red", icon: RotateCcw },
                { title: "Export & Delete All Data", desc: "Download your data then permanently delete everything.", consequence: "This action is irreversible after 30 days.", btn: "Export & Delete", color: "red", icon: Download },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <GlassPanel key={action.title} padding="lg" className="border-l-[3px] border-l-red-400/30 bg-red-400/[0.02]">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Icon className="size-4 text-red-400" />{action.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
                        <p className="text-[10px] text-red-400 mt-0.5">{action.consequence}</p>
                      </div>
                      <button className={cn("text-xs font-medium rounded-lg px-4 py-2 border transition-colors", action.color === "amber" ? "text-amber-400 border-amber-400/30 hover:bg-amber-400/10" : "text-red-400 border-red-400/30 hover:bg-red-400/10")} onClick={() => toast.success(`${action.title} initiated`)}>
                        {action.btn}
                      </button>
                    </div>
                  </GlassPanel>
                );
              })}

              {/* Delete Project — special */}
              <GlassPanel padding="lg" className="border-l-[3px] border-l-red-500 bg-red-500/[0.03]">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Trash2 className="size-4 text-red-500" /> Delete Project</h4>
                    <p className="text-xs text-muted-foreground mt-1">Permanently delete this project and ALL data.</p>
                    <p className="text-[10px] text-red-500 font-medium mt-0.5">This cannot be undone.</p>
                  </div>
                  <button className="text-xs font-medium text-white bg-red-500 rounded-lg px-4 py-2 hover:bg-red-600" onClick={() => setDeleteConfirm(true)}>Delete Project</button>
                </div>
              </GlassPanel>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center" onClick={() => setDeleteConfirm(false)}>
          <div className="bg-card border border-red-500/30 rounded-xl p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Delete Project</h3>
            <p className="text-sm text-muted-foreground">Type <span className="font-mono text-red-400">Mission Control</span> to confirm deletion.</p>
            <input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder="Mission Control" className="h-9 w-full rounded-lg border border-red-500/30 bg-muted/30 px-3 text-sm text-foreground outline-none" />
            <div className="flex gap-3 justify-end">
              <button className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5" onClick={() => setDeleteConfirm(false)}>Cancel</button>
              <button disabled={deleteInput !== "Mission Control"} className="text-xs font-medium text-white bg-red-500 rounded-lg px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-600" onClick={() => { toast.error("Project deleted"); setDeleteConfirm(false); }}>
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
