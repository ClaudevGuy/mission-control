import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(1, "Description is required").max(2000),
  model: z.enum(["CLAUDE", "GPT4", "GEMINI", "CUSTOM"]),
  systemPrompt: z.string().min(1, "System prompt is required").max(10000),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().min(1).max(200000).optional().default(4096),
  tags: z.array(z.string().max(50)).optional().default([]),
  tools: z
    .array(
      z.object({
        name: z.string().min(1),
        enabled: z.boolean().optional().default(true),
      })
    )
    .optional()
    .default([]),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(2000).optional(),
  model: z.enum(["CLAUDE", "GPT4", "GEMINI", "CUSTOM"]).optional(),
  status: z.enum(["RUNNING", "IDLE", "PAUSED", "ERROR", "DEPLOYING"]).optional(),
  systemPrompt: z.string().min(1).max(10000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

export const createRunSchema = z.object({
  input: z.string().optional().default(""),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreateRunInput = z.infer<typeof createRunSchema>;
