"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTeamStore } from "@/stores/team-store";
import { PageHeader, GlassPanel, ConfirmDialog } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { UserPlus, ShieldCheck, ShieldX, Check, X, Copy, Key } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { invalidate } from "@/lib/store-cache";
import type { TeamRole } from "@/types/common";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";
import { CreateApiKeyModal } from "@/components/team/CreateApiKeyModal";
import { PendingInvites } from "@/components/team/PendingInvites";
import { ModalShell } from "@/components/ui/modal-shell";

// Generate consistent avatar color from name
const PALETTE = ["var(--primary)", "#A855F7", "#F59E0B", "#39FF14", "#EF4444", "#EC4899", "#10A37F"];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
const AVATAR_COLORS: Record<string, string> = {};

const ROLE_STYLES: Record<TeamRole, { bg: string; border: string; text: string }> = {
  admin: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#EF4444" },
  developer: { bg: "rgb(var(--brand-rgb) / 0.12)", border: "rgb(var(--brand-rgb) / 0.3)", text: "var(--primary)" },
  agent_manager: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", text: "#A855F7" },
  viewer: { bg: "rgb(var(--ink-rgb) / 0.05)", border: "rgb(var(--ink-rgb) / 0.12)", text: "#888" },
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
  update: "var(--primary)", toggle: "var(--primary)", restart: "var(--primary)", update_role: "#F59E0B",
  trigger: "var(--primary)", rollback: "#F59E0B",
  delete: "#EF4444", revoke: "#EF4444", pause: "#F59E0B",
  resolve: "#39FF14",
};

const SCOPE_COLORS: Record<string, string> = {
  read: "#39FF14", write: "var(--primary)", admin: "#EF4444", agents: "#A855F7", deploy: "#F59E0B",
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
  const searchParams = useSearchParams();
  const initialTab = ((): "members" | "roles" | "audit" | "keys" => {
    const t = searchParams?.get("tab");
    return t === "roles" || t === "audit" || t === "keys" ? t : "members";
  })();
  const [tab, setTab] = useState<"members" | "roles" | "audit" | "keys">(initialTab);
  const { members, auditLog, apiKeys, fetch: fetchTeam } = useTeamStore();
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [editRoleTarget, setEditRoleTarget] = useState<{ id: string; name: string; role: string } | null>(null);
  const [newRole, setNewRole] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);

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
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand" />}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ MEMBERS ═══ */}
      {tab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</span>
            <Button size="default" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4 mr-2" /> Invite Member
            </Button>
          </div>

          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-border bg-card/50">
              <div className="flex items-center justify-center size-12 rounded-xl bg-muted/30">
                <UserPlus className="size-6 text-muted-foreground/25" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">No team members yet</p>
                <p className="text-xs text-muted-foreground/50 mt-0.5">Invite your team to collaborate on MOTHERSHIP</p>
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)} className="mt-1">
                <UserPlus className="size-3.5 mr-1.5" /> Invite Member
              </Button>
            </div>
          ) : (
          <GlassPanel padding="none">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Member", "Role", "2FA", "Agents", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const name = m.name || m.email || "Unknown";
                  const color = AVATAR_COLORS[name] || avatarColor(name);
                  const roleStyle = ROLE_STYLES[m.role];
                  const isOnline = m.lastActive ? new Date().getTime() - new Date(m.lastActive).getTime() < 3600000 : false;
                  return (
                    <tr key={m.id} className="group border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="size-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: `${color}30`, color }}>
                              {name.split(" ").map((n: string) => n[0]).join("")}
                            </div>
                            <span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card", isOnline ? "bg-[#39FF14]" : "bg-[#555]")} />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{name}</p>
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
                          <button className="text-[10px] text-muted-foreground hover:text-brand" onClick={() => { setEditRoleTarget({ id: m.id, name, role: m.role }); setNewRole(m.role); }}>Edit Role</button>
                          <button className="text-[10px] text-muted-foreground hover:text-red-400" onClick={() => setRemoveTarget({ id: m.id, name })}>Remove</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </GlassPanel>
          )}

          <PendingInvites refreshKey={inviteRefreshKey} />
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
                const entryAvatarColor = AVATAR_COLORS[entry.userName] || avatarColor(entry.userName);
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5" style={{ background: `${entryAvatarColor}20`, color: entryAvatarColor }}>
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
          ...apiKeys.map((k) => ({ ...k, status: "active" as "active" | "revoked", expires: k.name === "Partner Integration" ? "2026-06-01" : null })),
        ];

        return (
          <div className="space-y-4">
            {/* Header CTA shows only when there are keys — empty state has its
                own centered CTA so the user has a single clear path. */}
            {API_KEYS_DISPLAY.length > 0 && (
              <div className="flex justify-end">
                <Button size="default" onClick={() => setApiKeyOpen(true)}>
                  <Key className="size-4 mr-2" /> Create API Key
                </Button>
              </div>
            )}

            {API_KEYS_DISPLAY.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-border bg-card/50">
                <Key className="size-8 text-muted-foreground/20" />
                <p className="text-sm font-medium text-muted-foreground">No API keys yet</p>
                <p className="text-xs text-muted-foreground/50">Create a key to access the API programmatically</p>
                <button className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-brand/90" onClick={() => setApiKeyOpen(true)}>
                  <Key className="size-3.5" /> Create your first key
                </button>
              </div>
            ) : (
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
                                <Copy className="size-3 text-muted-foreground/30 hover:text-brand" />
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
            )}
          </div>
        );
      })()}

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove Team Member"
        description={`Are you sure you want to remove ${removeTarget?.name}? They will lose access immediately.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={async () => {
          try {
            const res = await fetch("/api/team/members", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: removeTarget?.id }),
            });
            if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
            toast.success(`${removeTarget?.name} removed`);
            invalidate("team");
            fetchTeam();
          } catch (err) {
            toast.error((err as Error).message);
          }
          setRemoveTarget(null);
        }}
      />

      {/* Edit Role Modal */}
      {editRoleTarget && (
        <ModalShell open={!!editRoleTarget} onClose={() => setEditRoleTarget(null)}>
          <div className="w-[380px] rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-foreground mb-1">Edit Role</h3>
            <p className="text-xs text-muted-foreground/60 mb-4">Change role for {editRoleTarget.name}</p>
            <div className="space-y-2 mb-4">
              {["ADMIN", "DEVELOPER", "AGENT_MANAGER", "VIEWER"].map((role) => (
                <button
                  key={role}
                  onClick={() => setNewRole(role)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg border p-3 text-left text-xs transition-colors",
                    newRole === role ? "border-brand/40 bg-brand/[0.04]" : "border-border/50 hover:border-border"
                  )}
                >
                  <div>
                    <span className="font-medium text-foreground">{role.replace("_", " ")}</span>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {role === "ADMIN" ? "Full access, manage team and settings" :
                       role === "DEVELOPER" ? "Deploy agents, trigger workflows, view all data" :
                       role === "AGENT_MANAGER" ? "Manage agents and workflows only" :
                       "Read-only access to dashboards and logs"}
                    </p>
                  </div>
                  {newRole === role && <span className="size-2 rounded-full bg-brand shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditRoleTarget(null)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-brand hover:bg-brand/90 text-primary-foreground"
                disabled={newRole === editRoleTarget.role}
                onClick={async () => {
                  try {
                    const res = await fetch("/api/team/members", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: editRoleTarget.id, role: newRole }),
                    });
                    if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
                    toast.success(`${editRoleTarget.name} is now ${newRole.replace("_", " ")}`);
                    invalidate("team");
                    fetchTeam();
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                  setEditRoleTarget(null);
                }}
              >
                Save Role
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      <InviteMemberModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInviteSent={() => setInviteRefreshKey((k) => k + 1)}
      />

      <CreateApiKeyModal
        open={apiKeyOpen}
        onOpenChange={setApiKeyOpen}
        onKeyCreated={() => { invalidate("team"); fetchTeam(); }}
      />
    </div>
  );
}
