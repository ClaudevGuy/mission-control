import type {
  IntegrationAdapter,
  ConfigField,
  ChatResult,
  ChatConfig,
  ChatMessage,
} from "../types";

/**
 * Send a chat completion request to the Anthropic Messages API.
 */
export async function chat(
  apiKey: string,
  messages: ChatMessage[],
  config: ChatConfig
): Promise<ChatResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: messages.map((m) => ({
        role: m.role === "system" ? "user" : m.role,
        content: m.content,
      })),
      ...(messages.some((m) => m.role === "system")
        ? { system: messages.find((m) => m.role === "system")?.content }
        : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `Anthropic API error (${res.status}): ${body.error?.message || res.statusText}`
    );
  }

  const data = await res.json();
  const textBlock = data.content?.find(
    (b: { type: string }) => b.type === "text"
  );

  return {
    content: textBlock?.text || "",
    tokensIn: data.usage?.input_tokens || 0,
    tokensOut: data.usage?.output_tokens || 0,
  };
}

export const anthropicAdapter: IntegrationAdapter = {
  name: "Anthropic",
  category: "AI",

  getConfigFields(): ConfigField[] {
    return [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "sk-ant-api03-...",
        required: true,
      },
    ];
  },

  async testConnection(
    config: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify the key by sending a minimal completion request
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          success: false,
          error:
            body.error?.message || `Anthropic API returned ${res.status}`,
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

  // No sync needed for AI provider
};
