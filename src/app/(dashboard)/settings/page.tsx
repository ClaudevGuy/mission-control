"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, GlassPanel } from "@/components/shared";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Download, Trash2, Pause, RotateCcw, ShieldX } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";

const NAV_ITEMS = ["General", "Appearance", "Notifications", "Data & Privacy", "Security", "Integrations", "Danger Zone"];

const NOTIF_EVENTS: { name: string; app: boolean; email: boolean; slack: boolean }[] = [];

const LOGINS: { ip: string; location: string; device: string; time: string; status: string }[] = [];

const ACCENT_COLORS = [
  { name: "Cyan", value: "#00D4FF" }, { name: "Purple", value: "#A855F7" }, { name: "Green", value: "#39FF14" },
  { name: "Amber", value: "#F59E0B" }, { name: "Red", value: "#EF4444" }, { name: "White", value: "#FFFFFF" },
];

export default function SettingsPage() {
  const [section, setSection] = useState("General");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = useState("#00D4FF");
  const [notifs, setNotifs] = useState(NOTIF_EVENTS);
  const [logRetention, setLogRetention] = useState(30);
  const [metricsRetention, setMetricsRetention] = useState(90);
  const [llmRetention, setLlmRetention] = useState(60);
  const [sessionTimeout, setSessionTimeout] = useState("8h");
  const [require2FA, setRequire2FA] = useState(false);
  const [polling, setPolling] = useState(true);
  const [pollInterval, setPollInterval] = useState("5s");
  const projectName = useSettingsStore((s) => s.projectName);
  const projectDescription = useSettingsStore((s) => s.projectDescription);
  const storeSetProjectName = useSettingsStore((s) => s.setProjectName);
  const storeSetProjectDescription = useSettingsStore((s) => s.setProjectDescription);
  const projectLogo = useSettingsStore((s) => s.projectLogo);
  const storeSetProjectLogo = useSettingsStore((s) => s.setProjectLogo);
  const fetchSettings = useSettingsStore((s) => s.fetch);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSettings(); }, []);

  useEffect(() => {
    const saved = localStorage.getItem("accent-color");
    if (saved) {
      setAccent(saved);
      document.documentElement.style.setProperty("--primary", saved);
      document.documentElement.style.setProperty("--ring", saved);
      document.documentElement.style.setProperty("--sidebar-primary", saved);
      document.documentElement.style.setProperty("--sidebar-ring", saved);
    }
  }, []);

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
                <div><label className="text-xs text-muted-foreground block mb-1">Project Name</label><input value={projectName} onChange={(e) => storeSetProjectName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00D4FF]/50" /></div>
                <div><label className="text-xs text-muted-foreground block mb-1">Description</label><textarea value={projectDescription} onChange={(e) => storeSetProjectDescription(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none resize-none focus:border-[#00D4FF]/50" /></div>
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
                      className="h-9 flex-1 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00D4FF]/50 placeholder:text-muted-foreground/30"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground/50">Appears in the sidebar. Use a square image for best results.</p>
                </div>
                <div><label className="text-xs text-muted-foreground block mb-1">Timezone</label>
                  <select className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none"><option>America/Los_Angeles (PST)</option><option>America/New_York (EST)</option><option>Europe/London (GMT)</option><option>UTC</option></select>
                </div>
                <button className="text-xs font-medium text-primary-foreground bg-[#00D4FF] rounded-lg px-4 py-2 hover:bg-[#00D4FF]/80" onClick={() => toast.success("Settings saved")}>Save Changes</button>
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
                <h3 className="text-sm font-semibold text-foreground mb-4">Accent Color</h3>
                <div className="flex gap-3">
                  {ACCENT_COLORS.map((c) => (
                    <button key={c.value} onClick={() => {
  setAccent(c.value);
  document.documentElement.style.setProperty("--primary", c.value);
  document.documentElement.style.setProperty("--ring", c.value);
  document.documentElement.style.setProperty("--sidebar-primary", c.value);
  document.documentElement.style.setProperty("--sidebar-ring", c.value);
  localStorage.setItem("accent-color", c.value);
  toast.success(`Accent: ${c.name}`);
}} className={cn("size-8 rounded-full border-2 transition-transform hover:scale-110", accent === c.value ? "border-white scale-110" : "border-transparent")} style={{ background: c.value }} title={c.name} />
                  ))}
                </div>
              </GlassPanel>
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-4">Live Polling</h3>
                <div className="flex items-center gap-4">
                  <Switch checked={polling} onCheckedChange={setPolling} className="data-[state=checked]:bg-[#00D4FF]" />
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
                          <Switch checked={n[ch]} onCheckedChange={(v) => { const next = [...notifs]; next[i] = { ...next[i], [ch]: v }; setNotifs(next); }} className="data-[state=checked]:bg-[#00D4FF]" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3"><button className="text-xs font-medium text-primary-foreground bg-[#00D4FF] rounded-lg px-4 py-2 hover:bg-[#00D4FF]/80" onClick={() => toast.success("Preferences saved")}>Save Preferences</button></div>
            </GlassPanel>
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
                      <input type="range" min={7} max={90} step={1} value={s.value} onChange={(e) => s.set(Number(e.target.value))} className="w-full accent-[#00D4FF]" />
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
                    <Switch checked={require2FA} onCheckedChange={setRequire2FA} className="data-[state=checked]:bg-[#00D4FF]" />
                  </div>
                </div>
              </GlassPanel>
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-3">Recent Login Activity</h3>
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
              </GlassPanel>
              <GlassPanel padding="lg">
                <h3 className="text-sm font-semibold text-foreground mb-2">Single Sign-On (SSO)</h3>
                <p className="text-xs text-muted-foreground mb-3">Not configured. Supports Google, GitHub, and SAML.</p>
                <button className="text-xs text-foreground bg-muted/50 rounded-lg px-4 py-2 hover:bg-muted" onClick={() => toast.success("SSO configuration opened")}>Configure SSO</button>
              </GlassPanel>
            </div>
          )}

          {/* ─── INTEGRATIONS ─── */}
          {section === "Integrations" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold text-foreground">Integrations</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect external services to enhance your project&apos;s capabilities.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: "GitHub",
                    desc: "Sync repositories, pull requests, and CI status",
                    connected: true,
                  },
                  {
                    name: "Slack",
                    desc: "Send incident alerts and agent notifications",
                    connected: true,
                  },
                  {
                    name: "PagerDuty",
                    desc: "On-call escalation and incident management",
                    connected: false,
                  },
                  {
                    name: "Linear",
                    desc: "Auto-create issues from agent findings",
                    connected: false,
                  },
                  {
                    name: "Datadog",
                    desc: "Forward metrics, traces, and logs",
                    connected: false,
                  },
                ].map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {integration.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">{integration.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-medium ${
                          integration.connected ? "text-green-400" : "text-muted-foreground"
                        }`}
                      >
                        {integration.connected ? "Connected" : "Not connected"}
                      </span>
                      <button className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors">
                        {integration.connected ? "Configure" : "Connect"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
