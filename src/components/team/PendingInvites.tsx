"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GlassPanel } from "@/components/shared";
import { Mail, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

const ROLE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  admin: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#EF4444" },
  developer: { bg: "rgb(var(--brand-rgb) / 0.12)", border: "rgb(var(--brand-rgb) / 0.3)", text: "var(--primary)" },
  agent_manager: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", text: "#A855F7" },
  viewer: { bg: "rgb(var(--ink-rgb) / 0.05)", border: "rgb(var(--ink-rgb) / 0.12)", text: "#888" },
};

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

interface Props {
  refreshKey: number;
}

export function PendingInvites({ refreshKey }: Props) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchInvites = useCallback(() => {
    setLoading(true);
    fetch("/api/team/members/invites")
      .then((r) => r.json())
      .then((d) => setInvites(d.data?.invites || []))
      .catch(() => setInvites([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites, refreshKey]);

  const handleRevoke = async (id: string, email: string) => {
    setRevoking(id);
    try {
      const res = await fetch(`/api/team/members/invites/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      toast.success(`Invite for ${email} revoked`);
      setInvites((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("Failed to revoke invite");
    } finally {
      setRevoking(null);
    }
  };

  const handleResend = (email: string) => {
    toast.success(`Invite resent to ${email}`);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Loading invites...
      </div>
    );
  }

  if (invites.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Pending Invites ({invites.length})
      </p>
      <GlassPanel padding="none">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {["Email", "Role", "Sent", "Expires", ""].map((h) => (
                <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => {
              const roleStyle = ROLE_STYLES[invite.role] || ROLE_STYLES.viewer;
              const isExpired = new Date(invite.expiresAt) < new Date();
              return (
                <tr key={invite.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground/40" />
                      <span className="text-foreground">{invite.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-medium"
                      style={{ background: roleStyle.bg, border: `1px solid ${roleStyle.border}`, color: roleStyle.text }}
                    >
                      {invite.role.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground" suppressHydrationWarning>
                    {timeAgo(invite.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn("text-xs", isExpired ? "text-red-400" : "text-muted-foreground")} suppressHydrationWarning>
                      {isExpired ? "Expired" : `${Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / 86400000)}d left`}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => handleResend(invite.email)}
                      >
                        <RotateCcw className="size-2.5 mr-1" />
                        Resend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-400 hover:border-red-500/30"
                        onClick={() => handleRevoke(invite.id, invite.email)}
                        disabled={revoking === invite.id}
                      >
                        {revoking === invite.id ? (
                          <Loader2 className="size-2.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-2.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}
