export interface IntegrationAdapter {
  /** Display name of the integration */
  name: string;

  /** Category from IntegrationCategory enum */
  category: string;

  /** What config fields the user needs to provide */
  getConfigFields(): ConfigField[];

  /** Test if the credentials / connection settings work */
  testConnection(
    config: Record<string, string>
  ): Promise<{ success: boolean; error?: string }>;

  /** Sync data from the external service into our database */
  sync?(projectId: string, config: Record<string, string>): Promise<void>;
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder: string;
  required: boolean;
}

/** Chat-style completion result from an AI provider adapter */
export interface ChatResult {
  content: string;
  tokensIn: number;
  tokensOut: number;
}

/** Chat configuration */
export interface ChatConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

/** Message format for chat adapters */
export interface ChatMessage {
  role: string;
  content: string;
}
