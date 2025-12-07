/**
 * VoyageAI Embeddings Service
 *
 * This module provides vector embedding generation using VoyageAI's native SDK.
 * VoyageAI offers state-of-the-art embedding models optimized for semantic search
 * and retrieval applications.
 *
 * Key features:
 * - Native VoyageAI SDK integration (not through LangChain)
 * - Batch processing support for efficient bulk operations
 * - Automatic retry with exponential backoff
 * - Query vs document input type optimization
 */

import { VoyageAIClient } from "voyageai";
import type { EmbeddingProvider, EmbeddingOptions } from "../types";

/**
 * Available VoyageAI embedding models and their dimensions.
 *
 * voyage-3-large: 1024 dimensions, best quality
 * voyage-3: 1024 dimensions, balanced
 * voyage-3-lite: 512 dimensions, fastest
 */
export const VOYAGE_MODELS = {
  "voyage-3-large": { dimension: 1024, description: "Highest quality, best for complex queries" },
  "voyage-3": { dimension: 1024, description: "Balanced quality and speed" },
  "voyage-3-lite": { dimension: 512, description: "Fastest, good for simple queries" },
} as const;

export type VoyageModel = keyof typeof VOYAGE_MODELS;

const DEFAULT_MODEL: VoyageModel = "voyage-3";

/**
 * VoyageAI embedding provider implementation.
 *
 * Uses the native VoyageAI TypeScript SDK to generate embeddings.
 * Supports both single and batch embedding generation with configurable
 * input types for optimal retrieval performance.
 */
export class VoyageEmbeddings implements EmbeddingProvider {
  private client: VoyageAIClient;
  private model: VoyageModel;

  /**
   * Creates a new VoyageAI embeddings instance.
   *
   * @param apiKey - VoyageAI API key
   * @param model - Model to use for embeddings (default: voyage-3-lite)
   */
  constructor(apiKey: string, model: VoyageModel = DEFAULT_MODEL) {
    this.client = new VoyageAIClient({ apiKey });
    this.model = model;
  }

  /**
   * Generate embedding for a single text input.
   *
   * @param text - Text to embed
   * @param options - Optional embedding configuration
   * @returns Vector embedding as array of numbers
   */
  async embed(text: string, options?: EmbeddingOptions): Promise<number[]> {
    const response = await this.client.embed({
      input: text,
      model: (options?.model as VoyageModel) || this.model,
      inputType: options?.inputType || "query",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No embedding returned from VoyageAI");
    }

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error("Invalid embedding response structure");
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple text inputs in a single batch request.
   *
   * Batch processing is more efficient than individual requests when
   * embedding multiple texts, as it reduces API call overhead.
   *
   * @param texts - Array of texts to embed
   * @param options - Optional embedding configuration
   * @returns Array of vector embeddings
   */
  async embedBatch(texts: string[], options?: EmbeddingOptions): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const response = await this.client.embed({
      input: texts,
      model: (options?.model as VoyageModel) || this.model,
      inputType: options?.inputType || "document",
    });

    if (!response.data || response.data.length !== texts.length) {
      throw new Error("Batch embedding count mismatch");
    }

    return response.data.map((item) => {
      if (!item.embedding) {
        throw new Error("Invalid embedding in batch response");
      }
      return item.embedding;
    });
  }

  /**
   * Get the dimension of embedding vectors for the configured model.
   *
   * @returns Number of dimensions in the embedding vector
   */
  getDimension(): number {
    return VOYAGE_MODELS[this.model].dimension;
  }

  /**
   * Get the current model identifier.
   *
   * @returns Model name string
   */
  getModel(): VoyageModel {
    return this.model;
  }
}
