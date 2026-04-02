"use client";

import React, { useState } from "react";
import { PageHeader, GlassPanel } from "@/components/shared";
import { Camera, ShieldCheck, Globe } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SESSIONS: { device: string; icon: React.ComponentType<{ className?: string }>; location: string; lastActive: string; current: boolean; suspicious: boolean }[] = [];

const CONNECTED: { name: string; connected: boolean; handle: string | null; color: string }[] = [];

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [landingPage, setLandingPage] = useState("/overview");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [numberFormat, setNumberFormat] = useState("1,000");
  const [emailDigest, setEmailDigest] = useState("weekly");

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Manage your personal settings and preferences" />

      {/* ─── Profile Header ─── */}
      <GlassPanel padding="lg">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="size-20 rounded-full bg-[#00D4FF]/15 flex items-center justify-center text-2xl font-bold text-[#00D4FF]">
              MC
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-[#39FF14] border-[3px] border-card" style={{ boxShadow: "0 0 6px rgba(57,255,20,0.5)", animation: "badge-pulse 2s ease-in-out infinite" }} />
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera className="size-5 text-white/80" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-semibold text-foreground">{name}</h2>
              <span className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-medium" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>
                Admin
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{email}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{jobTitle}</p>
          </div>

          <button className="text-xs font-medium text-primary-foreground bg-[#00D4FF] rounded-lg px-4 py-2 hover:bg-[#00D4FF]/80 shrink-0" onClick={() => toast.success("Profile updated")}>
            Edit Profile
          </button>
        </div>
      </GlassPanel>

      {/* ─── Personal Info ─── */}
      <GlassPanel padding="lg">
        <h3 className="text-sm font-semibold text-foreground mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00D4FF]/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00D4FF]/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00D4FF]/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Job Title</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00D4FF]/50" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Timezone</label>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-9 w-full max-w-sm rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none">
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Jerusalem">Asia/Jerusalem (IST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
        <button className="mt-4 text-xs font-medium text-primary-foreground bg-[#00D4FF] rounded-lg px-4 py-2 hover:bg-[#00D4FF]/80" onClick={() => toast.success("Profile saved")}>Save Changes</button>
      </GlassPanel>

      {/* ─── Security ─── */}
      <GlassPanel padding="lg">
        <h3 className="text-sm font-semibold text-foreground mb-4">Security</h3>
        <div className="space-y-6">
          {/* Change Password */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Change Password</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl">
              <input type="password" placeholder="Current password" className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              <input type="password" placeholder="New password" className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
              <input type="password" placeholder="Confirm new password" className="h-9 rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
            <button className="mt-2 text-xs font-medium text-foreground bg-muted/50 rounded-lg px-4 py-2 hover:bg-muted" onClick={() => toast.success("Password updated")}>Update Password</button>
          </div>

          {/* 2FA */}
          <div className="flex items-center justify-between max-w-2xl">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Two-Factor Authentication</h4>
              <span className="inline-flex items-center gap-1 text-xs text-green-400"><ShieldCheck className="size-3.5" /> Enabled</span>
            </div>
            <button className="text-xs font-medium text-foreground bg-muted/50 rounded-lg px-4 py-2 hover:bg-muted">Manage 2FA</button>
          </div>

          {/* Active Sessions */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active Sessions</h4>
            <div className="space-y-1.5 max-w-2xl">
              {SESSIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg", s.suspicious ? "bg-red-400/[0.04] border border-red-400/10" : "bg-muted/30")}>
                    <Icon className={cn("size-4 shrink-0", s.suspicious ? "text-red-400" : "text-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", s.current ? "text-foreground font-medium" : "text-foreground/80")}>{s.device}</p>
                      <p className="text-[10px] text-muted-foreground">{s.location}</p>
                    </div>
                    <span className={cn("text-xs font-mono shrink-0", s.current ? "text-green-400" : s.suspicious ? "text-red-400" : "text-muted-foreground")}>
                      {s.lastActive}
                    </span>
                    {s.current ? (
                      <span className="text-[9px] font-medium text-green-400 bg-green-400/10 rounded px-2 py-0.5">Current</span>
                    ) : (
                      <button className="text-[10px] text-red-400 hover:underline" onClick={() => toast.success("Session revoked")}>Revoke</button>
                    )}
                    {s.suspicious && <span className="text-[9px] font-bold text-red-400">⚠ Suspicious</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ─── Preferences ─── */}
      <GlassPanel padding="lg">
        <h3 className="text-sm font-semibold text-foreground mb-4">Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Default Landing Page</label>
            <select value={landingPage} onChange={(e) => setLandingPage(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none">
              <option value="/overview">Overview</option>
              <option value="/agents">AI Agents</option>
              <option value="/logs">Logs</option>
              <option value="/deployments">Deployments</option>
              <option value="/costs">Costs & Billing</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Date Format</label>
            <div className="flex gap-1.5">
              {["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map((f) => (
                <button key={f} onClick={() => setDateFormat(f)} className={cn("rounded-md px-3 py-1.5 text-xs font-mono transition-colors", dateFormat === f ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground bg-muted/30")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Number Format</label>
            <div className="flex gap-1.5">
              {["1,000", "1.000"].map((f) => (
                <button key={f} onClick={() => setNumberFormat(f)} className={cn("rounded-md px-3 py-1.5 text-xs font-mono transition-colors", numberFormat === f ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground bg-muted/30")}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Email Digest</label>
            <div className="flex gap-1.5">
              {[{ k: "daily", l: "Daily" }, { k: "weekly", l: "Weekly" }, { k: "never", l: "Never" }].map((f) => (
                <button key={f.k} onClick={() => setEmailDigest(f.k)} className={cn("rounded-md px-3 py-1.5 text-xs transition-colors", emailDigest === f.k ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground bg-muted/30")}>
                  {f.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ─── Connected Accounts ─── */}
      <GlassPanel padding="lg">
        <h3 className="text-sm font-semibold text-foreground mb-4">Connected Accounts</h3>
        <div className="space-y-3 max-w-2xl">
          {CONNECTED.map((acc) => (
            <div key={acc.name} className="flex items-center gap-4 px-3 py-3 rounded-lg bg-muted/30">
              <div className="size-9 rounded-lg flex items-center justify-center" style={{ background: `${acc.color}15` }}>
                <Globe className="size-4" style={{ color: acc.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{acc.name}</p>
                {acc.connected && acc.handle && (
                  <p className="text-[11px] font-mono text-[#00D4FF]">{acc.handle}</p>
                )}
              </div>
              {acc.connected ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
                    <span className="size-1.5 rounded-full bg-green-400" /> Connected
                  </span>
                  <button className="text-[10px] text-muted-foreground hover:text-red-400" onClick={() => toast.success(`${acc.name} disconnected`)}>Disconnect</button>
                </div>
              ) : (
                <button className="text-[10px] font-medium text-primary-foreground bg-[#00D4FF] rounded px-3 py-1.5 hover:bg-[#00D4FF]/80" onClick={() => toast.success(`${acc.name} connected`)}>Connect</button>
              )}
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
