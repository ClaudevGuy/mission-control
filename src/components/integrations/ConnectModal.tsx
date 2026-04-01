"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface ConfigFieldDef {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder: string;
  required: boolean;
}

// Known adapter config fields (matches server-side adapters)
const ADAPTER_FIELDS: Record<string, ConfigFieldDef[]> = {
  github: [
    {
      key: "token",
      label: "Personal Access Token",
      type: "password",
      placeholder: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      required: true,
    },
  ],
  slack: [
    {
      key: "webhookUrl",
      label: "Incoming Webhook URL",
      type: "url",
      placeholder: "https://hooks.slack.com/services/T.../B.../xxx",
      required: true,
    },
  ],
  anthropic: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "sk-ant-api03-...",
      required: true,
    },
  ],
  openai: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "sk-...",
      required: true,
    },
  ],
  "generic-webhook": [
    {
      key: "url",
      label: "Webhook URL",
      type: "url",
      placeholder: "https://example.com/webhook",
      required: true,
    },
    {
      key: "secret",
      label: "HMAC Secret",
      type: "password",
      placeholder: "Optional signing secret",
      required: false,
    },
  ],
};

// Map display names and icons to adapter keys
const NAME_TO_KEY: Record<string, string> = {
  github: "github",
  slack: "slack",
  anthropic: "anthropic",
  openai: "openai",
  "generic webhook": "generic-webhook",
  "generic-webhook": "generic-webhook",
};

// Category mapping for known integrations
const NAME_TO_CATEGORY: Record<string, string> = {
  github: "SOURCE_CONTROL",
  slack: "COMMUNICATION",
  anthropic: "AI",
  openai: "AI",
  "generic-webhook": "AUTOMATION",
};

interface ConnectModalProps {
  integrationName: string;
  integrationIcon?: string;
  isOpen: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export function ConnectModal({
  integrationName,
  integrationIcon,
  isOpen,
  onClose,
  onConnected,
}: ConnectModalProps) {
  const adapterKey =
    NAME_TO_KEY[integrationName.toLowerCase()] ||
    integrationName.toLowerCase().replace(/\s+/g, "-");
  const fields = ADAPTER_FIELDS[adapterKey] || [];

  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setValues({});
      setError(null);
      setSuccess(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate required fields
    for (const field of fields) {
      if (field.required && !values[field.key]?.trim()) {
        setError(`${field.label} is required`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const category =
        NAME_TO_CATEGORY[adapterKey] || "AUTOMATION";

      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: integrationName,
          description: `${integrationName} integration`,
          icon: integrationIcon || adapterKey,
          category,
          config: values,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Failed to connect (${res.status})`);
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onConnected();
        onClose();
      }, 1200);
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {integrationName}</DialogTitle>
          <DialogDescription>
            Enter your credentials to connect {integrationName} to Mission
            Control.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="size-10 text-green-400" />
            <p className="text-sm font-medium text-green-400">
              Connected successfully
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No configuration needed for this integration.
              </p>
            ) : (
              fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label
                    htmlFor={field.key}
                    className="text-xs font-medium text-foreground"
                  >
                    {field.label}
                    {field.required && (
                      <span className="text-red-400 ml-0.5">*</span>
                    )}
                  </label>
                  <Input
                    id={field.key}
                    type={field.type === "password" ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={values[field.key] || ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="font-mono text-xs"
                  />
                </div>
              ))
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <XCircle className="size-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#00D4FF] text-primary-foreground hover:bg-[#00D4FF]/80"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Testing...
                  </>
                ) : (
                  "Connect"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
