"use client";

import React, { useState } from "react";
import { X, Loader2, Key, Copy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeyCreated: () => void;
}

const SCOPES = [
  { value: "read", label: "Read", desc: "Read data and list resources" },
  { value: "write", label: "Write", desc: "Create and update resources" },
  { value: "deploy", label: "Deploy", desc: "Deploy agents and workflows" },
  { value: "agents", label: "Agents", desc: "Execute and manage agents" },
];

const EXPIRY_OPTIONS = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "never", label: "Never" },
];

export function CreateApiKeyModal({ open, onOpenChange, onKeyCreated }: Props) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [expiresIn, setExpiresIn] = useState("never");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  if (!open) return null;

  const toggleScope = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Key name is required"); return; }
    if (scopes.length === 0) { setError("Select at least one scope"); return; }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/team/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes, expiresIn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setCreatedKey(data.data.key.rawKey);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey);
      toast.success("API key copied to clipboard");
    }
  };

  const handleDone = () => {
    setCreatedKey(null);
    setName("");
    setScopes(["read"]);
    setExpiresIn("never");
    onOpenChange(false);
    onKeyCreated();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => !createdKey && onOpenChange(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <Key className="size-4 text-brand" />
              <h2 className="text-sm font-semibold text-foreground">
                {createdKey ? "API Key Created" : "Create API Key"}
              </h2>
            </div>
            {!createdKey && (
              <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            )}
          </div>

          {createdKey ? (
            /* Key created view */
            <div className="px-5 py-5 space-y-4">
              <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-4 py-3 flex items-start gap-2">
                <AlertTriangle className="size-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Copy this key now</p>
                  <p className="text-xs text-foreground/70 mt-0.5">It will never be shown again.</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-3">
                <p className="font-mono text-xs text-foreground break-all select-all">{createdKey}</p>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-brand hover:bg-brand/90 text-primary-foreground" onClick={handleCopy}>
                  <Copy className="size-3.5 mr-1.5" /> Copy Key
                </Button>
                <Button variant="outline" onClick={handleDone}>Done</Button>
              </div>
            </div>
          ) : (
            /* Creation form */
            <>
              <div className="px-5 py-5 space-y-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Key Name</label>
                  <Input
                    placeholder="Production API Key"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setError(null); }}
                    className="h-9"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Scopes</label>
                  <div className="space-y-2">
                    {SCOPES.map((s) => (
                      <label key={s.value} className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={scopes.includes(s.value)}
                          onChange={() => toggleScope(s.value)}
                          className="mt-0.5 rounded border-border"
                        />
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
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    {EXPIRY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 py-2">
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand/90 text-primary-foreground"
                  onClick={handleCreate}
                  disabled={!name.trim() || scopes.length === 0 || loading}
                >
                  {loading ? <><Loader2 className="size-3.5 mr-1.5 animate-spin" />Generating...</> : "Generate Key"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
