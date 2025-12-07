/**
 * Semantic Cache Library
 *
 * A library for implementing semantic caching of LLM queries using:
 * - MongoDB Atlas for vector storage
 * - Atlas Vector Search for similarity matching
 * - VoyageAI for vector embeddings
 * - OpenAI for LLM completions
 * - Zod for structured output schemas
 *
 * @example String response (default)
 * ```typescript
 * import { SemanticCache, loadConfigFromEnv } from "@milosmiric/semantic-cache";
 *
 * const cache = SemanticCache.fromConfig(loadConfigFromEnv());
 *
 * const result = await cache.query("What is the capital of France?");
 * console.log(result.response); // "Paris is the capital of France..."
 * console.log(result.fromCache); // false (first query)
 *
 * // Similar query will hit cache
 * const result2 = await cache.query("Tell me the capital city of France");
 * console.log(result2.fromCache); // true (semantic match!)
 *
 * await cache.close();
 * ```
 *
 * @example Structured output with Zod
 * ```typescript
 * import { SemanticCache, loadConfigFromEnv, z } from "@milosmiric/semantic-cache";
 *
 * const cache = SemanticCache.fromConfig(loadConfigFromEnv());
 *
 * const CapitalSchema = z.object({
 *   city: z.string(),
 *   country: z.string(),
 *   population: z.number().optional(),
 * });
 *
 * const result = await cache.query("What is the capital of France?", {
 *   schema: CapitalSchema,
 * });
 *
 * // result.response is typed as { city: string, country: string, population?: number }
 * console.log(result.response.city); // "Paris"
 *
 * await cache.close();
 * ```
 */

// Re-export Zod for convenience
export { z } from "zod";

// Core cache implementation
export { SemanticCache } from "./cache/semantic-cache";

// Configuration utilities
export { loadConfigFromEnv, validateConfig } from "./config";

// Component implementations (for advanced usage and customization)
export { VoyageEmbeddings, VOYAGE_MODELS, type VoyageModel } from "./embeddings/voyage";
export { MongoDBVectorStore, type MongoDBVectorStoreConfig } from "./storage/mongodb";
export { OpenAILLM } from "./llm/openai";

// Type definitions
export type {
  SemanticCacheConfig,
  CacheEntry,
  SimilaritySearchResult,
  CacheLookupResult,
  QueryResult,
  QueryOptions,
  CacheStats,
  EmbeddingOptions,
  EmbeddingProvider,
  LLMProvider,
  VectorStore,
} from "./types";
