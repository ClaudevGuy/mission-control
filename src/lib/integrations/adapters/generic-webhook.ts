import crypto from "crypto";
import type { IntegrationAdapter, ConfigField } from "../types";

/**
 * Deliver a payload to a webhook URL with optional HMAC-SHA256 signing.
 */
export async function deliverWebhook(
  url: string,
  payload: Record<string, unknown>,
  secret?: string
): Promise<void> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (secret) {
    const signature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    headers["X-Signature-256"] = `sha256=${signature}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!res.ok) {
    throw new Error(`Webhook delivery failed (${res.status}): ${await res.text()}`);
  }
}

export const genericWebhookAdapter: IntegrationAdapter = {
  name: "Generic Webhook",
  category: "AUTOMATION",

  getConfigFields(): ConfigField[] {
    return [
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
    ];
  },

  async testConnection(
    config: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const body = JSON.stringify({
        event: "ping",
        timestamp: new Date().toISOString(),
        source: "mission-control",
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (config.secret) {
        const signature = crypto
          .createHmac("sha256", config.secret)
          .update(body)
          .digest("hex");
        headers["X-Signature-256"] = `sha256=${signature}`;
      }

      const res = await fetch(config.url, {
        method: "POST",
        headers,
        body,
      });

      if (!res.ok) {
        return {
          success: false,
          error: `Webhook returned ${res.status}`,
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

  // Webhooks are outbound-only; no data to sync
};
