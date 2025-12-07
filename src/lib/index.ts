/**
 * Semantic Cache Library
 *
 * A library for implementing semantic caching of LLM queries using:
 * - MongoDB Atlas for vector storage
 * - Atlas Vector Search for similarity matching
 * - VoyageAI for vector embeddings
 * - OpenAI for LLM completions
 *
 * @example
 * ```typescript
 * import { SemanticCache, loadConfigFromEnv } from "@milosmiric/semantic-cache";
 *
 * const config = loadConfigFromEnv();
 * const cache = SemanticCache.fromConfig(config);
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
 */

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
  CacheStats,
  EmbeddingOptions,
  EmbeddingProvider,
  LLMProvider,
  VectorStore,
} from "./types";
