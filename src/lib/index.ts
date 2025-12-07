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
 * @example Basic usage
 * ```typescript
 * import { SemanticCache, VoyageEmbeddings, MongoDBVectorStore, VercelAILLM } from "@milosmiric/semantic-cache";
 * import { openai } from "@ai-sdk/openai";
 *
 * const cache = new SemanticCache(
 *   new VoyageEmbeddings("your-voyage-api-key"), // Uses voyage-3.5 by default
 *   new MongoDBVectorStore({
 *     uri: process.env.MONGODB_URI!,
 *     dbName: "myapp",
 *     collectionName: "llm-cache",
 *     embeddingFieldName: "embedding",
 *     vectorSearchIndexName: "default",
 *     embeddingDimension: 1024,
 *   }),
 *   new VercelAILLM(openai("gpt-5-mini"))
 * );
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
 * import { SemanticCache, VoyageEmbeddings, MongoDBVectorStore, VercelAILLM } from "@milosmiric/semantic-cache";
 * import { anthropic } from "@ai-sdk/anthropic";
 *
 * const cache = new SemanticCache(
 *   new VoyageEmbeddings("voyage-key"),
 *   new MongoDBVectorStore({ ... }),
 *   new VercelAILLM(anthropic("claude-sonnet-4-20250514"))
 * );
 * ```
 *
 * @example Structured output with Zod
 * ```typescript
 * import { SemanticCache, z } from "@milosmiric/semantic-cache";
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
 * ```
 */

// Re-export Zod for convenience
export { z } from "zod";

// Core cache implementation
export { SemanticCache } from "./cache/semantic-cache";

// Component implementations (for building cache instances)
export { VoyageEmbeddings, VOYAGE_MODELS, type VoyageModel } from "./embeddings/voyage";
export { MongoDBVectorStore, type MongoDBVectorStoreConfig } from "./storage/mongodb";
export { VercelAILLM } from "./llm/vercel-ai";

// Type definitions
export type {
  SemanticCacheOptions,
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
