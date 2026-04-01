import type { IntegrationAdapter, ConfigField } from "../types";

/**
 * Send a message to a Slack channel via an Incoming Webhook URL.
 */
export async function sendMessage(
  webhookUrl: string,
  text: string
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook failed (${res.status}): ${body}`);
  }
}

export const slackAdapter: IntegrationAdapter = {
  name: "Slack",
  category: "COMMUNICATION",

  getConfigFields(): ConfigField[] {
    return [
      {
        key: "webhookUrl",
        label: "Incoming Webhook URL",
        type: "url",
        placeholder: "https://hooks.slack.com/services/T.../B.../xxx",
        required: true,
      },
    ];
  },

  async testConnection(
    config: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Mission Control connected successfully.",
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        return {
          success: false,
          error: `Slack webhook returned ${res.status}: ${body}`,
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: `Connection failed: ${(err as Error).message}`,
      };
    }
  },

  // Slack is outbound-only; no data to sync
};
