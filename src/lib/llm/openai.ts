/**
 * OpenAI LLM Integration
 *
 * This module provides a wrapper around OpenAI's chat completion API
 * using LangChain for simplified interaction. It handles prompt formatting,
 * API calls, and response extraction.
 *
 * Key features:
 * - LangChain integration for consistent LLM interface
 * - Structured output support via Zod schemas
 * - Configurable model selection
 * - Timing metrics for performance analysis
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import type { z } from "zod";
import type { LLMProvider } from "../types";

/**
 * OpenAI LLM provider implementation.
 *
 * Uses LangChain's ChatOpenAI wrapper to interact with OpenAI's API.
 * This provides a consistent interface and handles retries, rate limiting,
 * and error handling automatically.
 *
 * Supports both unstructured (string) and structured (Zod schema) outputs.
 */
export class OpenAILLM implements LLMProvider {
  private llm: ChatOpenAI;
  private model: string;

  /**
   * Creates a new OpenAI LLM instance.
   *
   * @param apiKey - OpenAI API key
   * @param model - Model identifier (e.g., "gpt-5-mini", "gpt-5")
   */
  constructor(apiKey: string, model: string = "gpt-5-mini") {
    this.model = model;
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
    });
  }

  /**
   * Generate a completion for the given prompt.
   *
   * @param prompt - User prompt to send to the LLM
   * @returns Generated response text
   */
  async complete(prompt: string): Promise<string> {
    const response = await this.llm.invoke([new HumanMessage(prompt)]);

    // Extract text content from the response
    const content = response.content;

    if (typeof content === "string") {
      return content;
    }

    // Handle complex content (array of content blocks)
    if (Array.isArray(content)) {
      return content
        .map((block) => {
          if (typeof block === "string") return block;
          if ("text" in block) return block.text;
          return "";
        })
        .join("");
    }

    throw new Error("Unexpected response format from OpenAI");
  }

  /**
   * Generate a structured completion using a Zod schema.
   *
   * Uses LangChain's withStructuredOutput to ensure the response
   * matches the provided schema. The LLM is instructed to return
   * data in the exact format specified.
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
    const structuredLLM = this.llm.withStructuredOutput(schema);
    const response = await structuredLLM.invoke([new HumanMessage(prompt)]);
    return response as z.infer<T>;
  }

  /**
   * Get the model identifier.
   *
   * @returns Model name string
   */
  getModel(): string {
    return this.model;
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
