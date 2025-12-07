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
 * Current generation models (recommended):
 * - voyage-3.5: Latest general-purpose model, 1024 dimensions
 * - voyage-3.5-lite: Optimized for latency/cost, 1024 dimensions
 * - voyage-3-large: High quality general-purpose, 1024 dimensions
 * - voyage-code-3: Code retrieval optimized, 1024 dimensions
 *
 * Domain-specific models:
 * - voyage-finance-2: Finance retrieval, 1024 dimensions
 * - voyage-law-2: Legal retrieval, 1024 dimensions
 *
 * Legacy models (still supported):
 * - voyage-3, voyage-3-lite, voyage-code-2
 */
export const VOYAGE_MODELS = {
  // Current generation
  "voyage-3.5": { dimension: 1024, description: "Latest general-purpose, best quality" },
  "voyage-3.5-lite": { dimension: 1024, description: "Optimized for latency and cost" },
  "voyage-3-large": { dimension: 1024, description: "High quality general-purpose" },
  "voyage-code-3": { dimension: 1024, description: "Optimized for code retrieval" },
  // Domain-specific
  "voyage-finance-2": { dimension: 1024, description: "Finance domain optimized" },
  "voyage-law-2": { dimension: 1024, description: "Legal domain optimized" },
  // Legacy (still supported)
  "voyage-3": { dimension: 1024, description: "Previous generation, balanced" },
  "voyage-3-lite": { dimension: 512, description: "Previous generation, fast" },
  "voyage-code-2": { dimension: 1536, description: "Previous code model" },
} as const;

export type VoyageModel = keyof typeof VOYAGE_MODELS;

const DEFAULT_MODEL: VoyageModel = "voyage-3.5";

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
   * @param model - Model to use for embeddings (default: voyage-3.5)
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
