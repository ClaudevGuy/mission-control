"use client";

import React, { useState, useEffect } from "react";
import { useTeamStore } from "@/stores/team-store";
import { PageHeader, GlassPanel, StatusBadge, SparklineChart, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { UserPlus, ShieldCheck, ShieldX, Check, X, Copy, Key } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TeamRole } from "@/types/common";

const AVATAR_COLORS: Record<string, string> = {
  "Sarah Chen": "#00D4FF", "Marcus Johnson": "#A855F7", "Aisha Patel": "#F59E0B",
  "James Wilson": "#39FF14", "Emily Rodriguez": "#EF4444",
};

const ROLE_STYLES: Record<TeamRole, { bg: string; border: string; text: string }> = {
  admin: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#EF4444" },
  developer: { bg: "rgba(0,212,255,0.12)", border: "rgba(0,212,255,0.3)", text: "#00D4FF" },
  agent_manager: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", text: "#A855F7" },
  viewer: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", text: "#888" },
};

const PERMISSIONS = [
  "View Dashboard", "Manage Agents", "Deploy to Production", "View Costs & Billing",
  "Manage Team Members", "Access API Keys", "Kill Switch", "View Logs", "Manage Integrations",
];
const PERM_MATRIX: Record<string, boolean[]> = {
  admin:         [true, true, true, true, true, true, true, true, true],
  developer:     [true, true, true, false, false, true, false, true, true],
  agent_manager: [true, true, false, false, false, false, false, true, false],
  viewer:        [true, false, false, false, false, false, false, true, false],
};

const ACTION_COLORS: Record<string, string> = {
  create: "#39FF14", connect: "#39FF14", invite: "#39FF14",
  update: "#00D4FF", toggle: "#00D4FF", restart: "#00D4FF", update_role: "#F59E0B",
  trigger: "#00D4FF", rollback: "#F59E0B",
  delete: "#EF4444", revoke: "#EF4444", pause: "#F59E0B",
  resolve: "#39FF14",
};

const PENDING_INVITES = [
  { email: "invite@startup.com", role: "developer" as TeamRole, sent: "2 days ago" },
  { email: "dev@agency.com", role: "viewer" as TeamRole, sent: "5 days ago" },
];

const SCOPE_COLORS: Record<string, string> = {
  read: "#39FF14", write: "#00D4FF", admin: "#EF4444", agents: "#A855F7", deploy: "#F59E0B",
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function TeamPage() {
  const [tab, setTab] = useState<"members" | "roles" | "audit" | "keys">("members");
  const { members, auditLog, apiKeys, fetch: fetchTeam } = useTeamStore();
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchTeam(); }, []);

  const tabs = [
    { id: "members" as const, label: "Members" },
    { id: "roles" as const, label: "Roles & Permissions" },
    { id: "audit" as const, label: "Audit Log" },
    { id: "keys" as const, label: "API Keys" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Team & Permissions" description="Manage team members, roles, and access controls" />

      <div className="border-b border-border">
        <div className="flex gap-6">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn("pb-2.5 text-sm font-medium transition-colors relative", tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/70")}>
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00D4FF]" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ MEMBERS ═══ */}
      {tab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{members.length} members · 2 pending invites</span>
            <Button size="default" onClick={() => toast.success("Invite sent")}>
              <UserPlus className="size-4 mr-2" /> Invite Member
            </Button>
          </div>

          <GlassPanel padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Member", "Role", "Activity (7d)", "2FA", "Agents", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const color = AVATAR_COLORS[m.name] || "#888";
                  const roleStyle = ROLE_STYLES[m.role];
                  const isOnline = new Date().getTime() - new Date(m.lastActive).getTime() < 3600000;
                  const loginSpark = Array.from({ length: 7 }, () => Math.round(Math.random() * 8 + 2));
                  return (
                    <tr key={m.id} className="group border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="size-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: `${color}30`, color }}>
                              {m.name.split(" ").map((n) => n[0]).join("")}
                            </div>
                            <span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card", isOnline ? "bg-[#39FF14]" : "bg-[#555]")} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{m.name}</p>
                            <p className="text-[11px] text-muted-foreground">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-medium" style={{ background: roleStyle.bg, border: `1px solid ${roleStyle.border}`, color: roleStyle.text }}>
                          {m.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <SparklineChart data={loginSpark} color={color} width={56} height={18} />
                      </td>
                      <td className="px-4 py-3">
                        {m.twoFAEnabled ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs"><ShieldCheck className="size-3.5" /> Enabled</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-xs font-medium"><ShieldX className="size-3.5" /> No 2FA</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {m.agentsOwned.length > 0 ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono bg-muted/50 text-foreground">{m.agentsOwned.length}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-[10px] text-muted-foreground hover:text-[#00D4FF]" onClick={() => toast.success("Role editor opened")}>Edit Role</button>
                          <button className="text-[10px] text-muted-foreground hover:text-red-400" onClick={() => setRemoveTarget(m.name)}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </GlassPanel>

          {/* Pending Invites */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Invites (2)</h3>
            <GlassPanel padding="none">
              {PENDING_INVITES.map((inv) => (
                <div key={inv.email} className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0">
                  <div className="size-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground text-xs">?</div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground/60 italic">{inv.email}</p>
                    <p className="text-[10px] text-muted-foreground">Sent {inv.sent}</p>
                  </div>
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: ROLE_STYLES[inv.role].bg, border: `1px solid ${ROLE_STYLES[inv.role].border}`, color: ROLE_STYLES[inv.role].text }}>{inv.role}</span>
                  <StatusBadge status="paused" size="sm" />
                  <button className="text-[10px] text-[#00D4FF] hover:underline" onClick={() => toast.success("Invite resent")}>Resend</button>
                  <button className="text-[10px] text-red-400 hover:underline" onClick={() => toast.success("Invite revoked")}>Revoke</button>
                </div>
              ))}
            </GlassPanel>
          </div>
        </div>
      )}

      {/* ═══ ROLES & PERMISSIONS ═══ */}
      {tab === "roles" && (
        <GlassPanel padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-[220px]">Permission</th>
                {(["admin", "developer", "agent_manager", "viewer"] as TeamRole[]).map((role) => {
                  const rs = ROLE_STYLES[role];
                  return (
                    <th key={role} className="text-center text-xs font-medium px-4 py-3" style={{ color: rs.text, background: `${rs.bg}` }}>
                      {role.replace("_", " ")}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((perm, i) => (
                <tr key={perm} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-2.5 text-foreground">{perm}</td>
                  {(["admin", "developer", "agent_manager", "viewer"] as TeamRole[]).map((role) => (
                    <td key={role} className="text-center px-4 py-2.5">
                      {PERM_MATRIX[role][i] ? (
                        <Check className="size-4 text-green-400 mx-auto" />
                      ) : (
                        <X className="size-4 text-red-400/50 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </GlassPanel>
      )}

      {/* ═══ AUDIT LOG ═══ */}
      {tab === "audit" && (
        <div className="space-y-3">
          <GlassPanel padding="none">
            <div className="max-h-[600px] overflow-y-auto">
              {auditLog.map((entry) => {
                const actionType = entry.action.split(".")[1] || entry.action;
                const actionColor = ACTION_COLORS[actionType] || "#888";
                const avatarColor = AVATAR_COLORS[entry.userName] || "#888";
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ background: `${avatarColor}20`, color: avatarColor }}>
                      {entry.userName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{entry.userName}</span>
                        <span className="text-muted-foreground"> {entry.details}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-medium" style={{ background: `${actionColor}15`, color: actionColor }}>
                          {entry.action}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0" suppressHydrationWarning>{formatTime(entry.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ═══ API KEYS ═══ */}
      {tab === "keys" && (() => {
        const API_KEYS_DISPLAY = [
          ...apiKeys.map((k) => ({ ...k, status: "active" as const, expires: k.name === "Partner Integration" ? "2026-06-01" : null })),
          { id: "key_005", name: "Legacy Webhook", prefix: "mc_old_e9c2", scopes: ["read"], createdAt: "2025-08-15T00:00:00Z", lastUsed: "2026-01-10T00:00:00Z", createdBy: "Marcus Johnson", status: "revoked" as const, expires: null },
        ];

        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="default" onClick={() => toast.success("API key created: sk-mc-•••••••3f8a\nCopy now — you won't see this again!")}>
                <Key className="size-4 mr-2" /> Create API Key
              </Button>
            </div>

            <GlassPanel padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Name", "Key", "Scopes", "Created", "Expires", "Last Used", "Status", ""].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {API_KEYS_DISPLAY.map((key) => {
                    const isRevoked = key.status === "revoked";
                    return (
                      <tr key={key.id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", isRevoked && "opacity-50")}>
                        <td className={cn("px-4 py-2.5 font-medium", isRevoked ? "text-muted-foreground line-through" : "text-foreground")}>{key.name}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-mono text-xs", isRevoked ? "text-muted-foreground/50 line-through" : "text-muted-foreground")}>sk-{key.prefix}-••••••••</span>
                            {!isRevoked && (
                              <button onClick={() => { navigator.clipboard.writeText(`sk-${key.prefix}-mock`); toast.success("Copied"); }}>
                                <Copy className="size-3 text-muted-foreground/30 hover:text-[#00D4FF]" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            {key.scopes.map((s) => (
                              <span key={s} className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-medium", isRevoked && "opacity-50")} style={{ background: `${SCOPE_COLORS[s] || "#888"}15`, color: SCOPE_COLORS[s] || "#888", border: `1px solid ${SCOPE_COLORS[s] || "#888"}30` }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{new Date(key.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                        <td className="px-4 py-2.5 text-xs font-mono">{key.expires ? <span className="text-foreground">{new Date(key.expires).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span> : <span className="text-muted-foreground/50">Never</span>}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono" suppressHydrationWarning>{formatTime(key.lastUsed)}</td>
                        <td className="px-4 py-2.5">
                          {isRevoked ? (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}>Revoked</span>
                          ) : (
                            <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ background: "rgba(57,255,20,0.12)", border: "1px solid rgba(57,255,20,0.3)", color: "#39FF14" }}>Active</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {!isRevoked && (
                            <button className="text-[10px] text-red-400 hover:underline" onClick={() => toast.success(`Key ${key.name} revoked`)}>Revoke</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </GlassPanel>
          </div>
        );
      })()}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${removeTarget}? They will lose access immediately.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => { toast.success(`${removeTarget} removed`); setRemoveTarget(null); }}
      />
    </div>
  );
}
