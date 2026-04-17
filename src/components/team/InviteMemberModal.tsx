"use client";

import React, { useState } from "react";
import { X, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent: () => void;
}

const ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "developer", label: "Developer" },
  { value: "agent_manager", label: "Agent Manager" },
  { value: "admin", label: "Admin" },
];

export function InviteMemberModal({ open, onOpenChange, onInviteSent }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!isValidEmail) {
      setError("Please enter a valid email address");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/team/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invite");

      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setRole("viewer");
      onOpenChange(false);
      onInviteSent();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-brand" />
              <h2 className="text-sm font-semibold text-foreground">Invite Team Member</h2>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                className="h-9"
                autoFocus
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 py-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand/90 text-primary-foreground"
              onClick={handleSubmit}
              disabled={!email.trim() || loading}
            >
              {loading ? (
                <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Sending...</>
              ) : (
                "Send Invite"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
