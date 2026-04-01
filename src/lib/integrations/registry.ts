import type { IntegrationAdapter } from "./types";
import { githubAdapter } from "./adapters/github";
import { slackAdapter } from "./adapters/slack";
import { anthropicAdapter } from "./adapters/anthropic";
import { openaiAdapter } from "./adapters/openai";
import { genericWebhookAdapter } from "./adapters/generic-webhook";

const adapters: Record<string, IntegrationAdapter> = {
  github: githubAdapter,
  slack: slackAdapter,
  anthropic: anthropicAdapter,
  openai: openaiAdapter,
  "generic-webhook": genericWebhookAdapter,
};

/**
 * Look up an adapter by its lowercase name key.
 * Performs a case-insensitive match as a fallback.
 */
export function getAdapter(name: string): IntegrationAdapter | null {
  const key = name.toLowerCase().replace(/\s+/g, "-");
  return adapters[key] ?? null;
}

/**
 * Return every registered adapter.
 */
export function getAllAdapters(): IntegrationAdapter[] {
  return Object.values(adapters);
}

/**
 * Return all adapter entries with their registry keys.
 */
export function getAdapterEntries(): Array<{
  key: string;
  adapter: IntegrationAdapter;
}> {
  return Object.entries(adapters).map(([key, adapter]) => ({
    key,
    adapter,
  }));
}
