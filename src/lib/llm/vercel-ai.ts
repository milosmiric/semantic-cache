/**
 * Generic LLM adapter using Vercel AI SDK
 *
 * This module provides a universal LLM adapter that works with ANY provider
 * supported by Vercel AI SDK. Instead of creating separate adapters for
 * OpenAI, Anthropic, Google, etc., this single adapter accepts any
 * Vercel AI SDK LanguageModel.
 *
 * Supported providers (install separately):
 * - @ai-sdk/openai (OpenAI, GPT-4, GPT-5)
 * - @ai-sdk/anthropic (Anthropic, Claude)
 * - @ai-sdk/google (Google, Gemini)
 * - @ai-sdk/mistral (Mistral)
 * - @ai-sdk/amazon-bedrock (AWS Bedrock)
 * - @ai-sdk/azure (Azure OpenAI)
 * - And many more...
 *
 * @example
 * ```typescript
 * import { openai } from "@ai-sdk/openai";
 * import { anthropic } from "@ai-sdk/anthropic";
 * import { VercelAILLM } from "./vercel-ai";
 *
 * // Use OpenAI
 * const openaiLLM = new VercelAILLM(openai("gpt-5-mini"));
 *
 * // Use Anthropic Claude
 * const claudeLLM = new VercelAILLM(anthropic("claude-sonnet-4-20250514"));
 *
 * // Use with SemanticCache
 * const cache = new SemanticCache(embeddings, storage, claudeLLM, 0.85);
 * ```
 */

import { generateText, generateObject } from "ai";
import type { LanguageModel } from "ai";
import type { z } from "zod";
import type { LLMProvider } from "../types";

/**
 * Universal LLM provider using Vercel AI SDK.
 *
 * Accepts any LanguageModel from Vercel AI SDK providers, enabling
 * seamless switching between OpenAI, Anthropic, Google, Mistral,
 * and other supported providers.
 *
 * @example
 * ```typescript
 * import { openai } from "@ai-sdk/openai";
 *
 * const llm = new VercelAILLM(openai("gpt-5-mini"));
 * const response = await llm.complete("What is the capital of France?");
 * ```
 */
export class VercelAILLM implements LLMProvider {
  private model: LanguageModel;
  private modelId: string;

  /**
   * Creates a new Vercel AI LLM instance.
   *
   * @param model - Any Vercel AI SDK LanguageModel
   * @param modelId - Optional model identifier (auto-detected if not provided)
   *
   * @example
   * ```typescript
   * import { openai } from "@ai-sdk/openai";
   * import { anthropic } from "@ai-sdk/anthropic";
   * import { google } from "@ai-sdk/google";
   *
   * new VercelAILLM(openai("gpt-5-mini"));
   * new VercelAILLM(anthropic("claude-sonnet-4-20250514"));
   * new VercelAILLM(google("gemini-2.0-flash"));
   * ```
   */
  constructor(model: LanguageModel, modelId?: string) {
    this.model = model;
    // Try to extract modelId from the model object, fall back to provided or "unknown"
    this.modelId = modelId ?? (model as any).modelId ?? "unknown";
  }

  /**
   * Generate a completion for the given prompt.
   *
   * @param prompt - User prompt to send to the LLM
   * @returns Generated response text
   */
  async complete(prompt: string): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      prompt,
    });

    return text;
  }

  /**
   * Generate a structured completion using a Zod schema.
   *
   * Uses Vercel AI SDK's generateObject to ensure the response
   * matches the provided schema.
   *
   * @param prompt - User prompt to send to the LLM
   * @param schema - Zod schema defining the expected output structure
   * @returns Parsed and validated response matching the schema
   *
   * @example
   * ```typescript
   * const schema = z.object({
   *   answer: z.string(),
   *   confidence: z.number().min(0).max(1),
   * });
   *
   * const result = await llm.completeStructured("What is 2+2?", schema);
   * // result: { answer: "4", confidence: 0.99 }
   * ```
   */
  async completeStructured<T extends z.ZodType>(
    prompt: string,
    schema: T
  ): Promise<z.infer<T>> {
    const { object } = await generateObject({
      model: this.model,
      prompt,
      schema,
    });

    return object as z.infer<T>;
  }

  /**
   * Get the model identifier.
   *
   * @returns Model ID string from the underlying provider
   */
  getModel(): string {
    return this.modelId;
  }

  /**
   * Generate a completion with timing information.
   *
   * Useful for comparing cache vs fresh query performance.
   *
   * @param prompt - User prompt to send to the LLM
   * @returns Object containing response and timing metrics
   */
  async completeWithTiming(prompt: string): Promise<{ response: string; durationMs: number }> {
    const startTime = performance.now();
    const response = await this.complete(prompt);
    const durationMs = performance.now() - startTime;

    return { response, durationMs };
  }
}
