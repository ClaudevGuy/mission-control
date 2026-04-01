"use client";

import { useState } from "react";
import { X, FolderPlus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, description: string) => void;
}

export function NewProjectModal({ open, onOpenChange, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), description.trim());
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#00D4FF]/10 border border-[#00D4FF]/20">
              <FolderPlus className="size-3.5 text-[#00D4FF]" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">New Project</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Project name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My SaaS App"
              maxLength={64}
              className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-sm text-foreground outline-none focus:border-[#00D4FF]/50 placeholder:text-muted-foreground/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Description{" "}
              <span className="text-muted-foreground/40 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you building?"
              rows={2}
              maxLength={200}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none resize-none focus:border-[#00D4FF]/50 placeholder:text-muted-foreground/30 transition-colors"
            />
          </div>

          <p className="text-[11px] text-muted-foreground/50">
            Each project gets its own clean dashboard. Customise the logo and name in Settings after creation.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-border bg-transparent px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-lg bg-[#00D4FF] px-4 py-2 text-xs font-semibold text-black transition-all hover:bg-[#00D4FF]/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
