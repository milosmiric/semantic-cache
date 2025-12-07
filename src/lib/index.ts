/**
 * Semantic Cache Library
 *
 * A library for implementing semantic caching of LLM queries using:
 * - MongoDB Atlas for vector storage
 * - Atlas Vector Search for similarity matching
 * - VoyageAI for vector embeddings
 * - Vercel AI SDK for LLM completions (supports OpenAI, Anthropic, Google, and more)
 * - Zod for structured output schemas
 *
 * @example Basic usage with default OpenAI
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
 * @example Using different LLM providers
 * ```typescript
 * import { SemanticCache, loadConfigFromEnv } from "@milosmiric/semantic-cache";
 * import { anthropic } from "@ai-sdk/anthropic";
 * import { google } from "@ai-sdk/google";
 *
 * const config = loadConfigFromEnv();
 *
 * // Use Claude
 * const claudeCache = SemanticCache.fromConfig(config, anthropic("claude-sonnet-4-20250514"));
 *
 * // Use Gemini
 * const geminiCache = SemanticCache.fromConfig(config, google("gemini-2.0-flash"));
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
export { VercelAILLM } from "./llm/vercel-ai";

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
