import type {
  IntegrationAdapter,
  ConfigField,
  ChatResult,
  ChatConfig,
  ChatMessage,
} from "../types";

/**
 * Send a chat completion request to the OpenAI Chat API.
 */
export async function chat(
  apiKey: string,
  messages: ChatMessage[],
  config: ChatConfig
): Promise<ChatResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error (${res.status}): ${body.error?.message || res.statusText}`
    );
  }

  const data = await res.json();

  return {
    content: data.choices?.[0]?.message?.content || "",
    tokensIn: data.usage?.prompt_tokens || 0,
    tokensOut: data.usage?.completion_tokens || 0,
  };
}

export const openaiAdapter: IntegrationAdapter = {
  name: "OpenAI",
  category: "AI",

  getConfigFields(): ConfigField[] {
    return [
      {
        key: "apiKey",
        label: "API Key",
        type: "password",
        placeholder: "sk-...",
        required: true,
      },
    ];
  },

  async testConnection(
    config: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          success: false,
          error: body.error?.message || `OpenAI API returned ${res.status}`,
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
