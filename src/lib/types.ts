/**
 * Core type definitions for the Semantic Cache library.
 *
 * This module defines the interfaces and types used throughout the caching system,
 * ensuring type safety and consistent data structures across all components.
 */

import type { z } from "zod";

/**
 * Configuration options for the semantic cache system.
 */
export interface SemanticCacheConfig {
  /** MongoDB Atlas connection URI */
  mongoUri: string;
  /** Database name for cache storage */
  dbName: string;
  /** Collection name for cached entries */
  collectionName: string;
  /** Field name for storing vector embeddings */
  embeddingsFieldName: string;
  /** VoyageAI API key for generating embeddings */
  voyageApiKey: string;
  /** OpenAI API key for LLM queries */
  openaiApiKey: string;
  /** OpenAI model to use for completions */
  llmModel: string;
  /** Similarity threshold (0-1) for cache hits. Higher = stricter matching */
  similarityThreshold?: number;
  /** Name of the Atlas Vector Search index */
  vectorSearchIndexName?: string;
}

/**
 * Options for query operations.
 */
export interface QueryOptions<T extends z.ZodType = z.ZodString> {
  /** Zod schema for structured output. If omitted, returns raw string. */
  schema?: T;
}

/**
 * Represents a single cached query-response pair with its vector embedding.
 */
export interface CacheEntry {
  /** Unique identifier for the cache entry */
  _id?: string;
  /** Original user query text */
  query: string;
  /** LLM-generated response (string or JSON) */
  response: string;
  /** Vector embedding of the query */
  embedding: number[];
  /** Timestamp when entry was created */
  createdAt: Date;
  /** Number of times this cache entry was retrieved */
  hitCount: number;
  /** Last time this entry was accessed */
  lastAccessedAt: Date;
  /** Hash of the schema used (for structured output) */
  schemaHash?: string;
  /** Additional metadata for the entry */
  metadata?: Record<string, unknown>;
}

/**
 * Result of a semantic similarity search operation.
 */
export interface SimilaritySearchResult {
  /** The matching cache entry */
  entry: CacheEntry;
  /** Similarity score between 0 and 1 */
  score: number;
}

/**
 * Result returned from a cache lookup operation.
 */
export interface CacheLookupResult<T = string> {
  /** Whether a cache hit occurred */
  hit: boolean;
  /** The cached response if hit, undefined otherwise */
  response?: T;
  /** Similarity score for cache hits */
  score?: number;
  /** Query used for the lookup */
  query: string;
  /** Time taken for the lookup in milliseconds */
  lookupTimeMs: number;
}

/**
 * Result returned from a query operation (cache hit or LLM call).
 * Generic type T represents the response type (string or structured object).
 */
export interface QueryResult<T = string> {
  /** The response (string or structured object based on schema) */
  response: T;
  /** Whether response came from cache */
  fromCache: boolean;
  /** Similarity score if from cache */
  similarityScore?: number;
  /** Total time for the operation in milliseconds */
  totalTimeMs: number;
  /** Time saved compared to fresh LLM call (if cache hit) */
  timeSavedMs?: number;
}

/**
 * Statistics about the semantic cache.
 */
export interface CacheStats {
  /** Total number of cached entries */
  totalEntries: number;
  /** Total number of cache hits across all entries */
  totalHits: number;
  /** Average similarity score for cache hits */
  averageSimilarity: number;
  /** Cache size in bytes (approximate) */
  cacheSizeBytes: number;
  /** Oldest entry timestamp */
  oldestEntry?: Date;
  /** Newest entry timestamp */
  newestEntry?: Date;
}

/**
 * Options for embedding generation.
 */
export interface EmbeddingOptions {
  /** Model to use for embeddings */
  model?: string;
  /** Input type hint for the model */
  inputType?: "query" | "document";
}

/**
 * Interface for embedding providers.
 */
export interface EmbeddingProvider {
  /** Generate embedding for a single text input */
  embed(text: string, options?: EmbeddingOptions): Promise<number[]>;
  /** Generate embeddings for multiple text inputs */
  embedBatch(texts: string[], options?: EmbeddingOptions): Promise<number[][]>;
  /** Get the dimension of the embedding vectors */
  getDimension(): number;
}

/**
 * Interface for LLM providers.
 *
 * Implementations must support both unstructured (string) and
 * structured (Zod schema) completions.
 */
export interface LLMProvider {
  /** Generate a completion for the given prompt */
  complete(prompt: string): Promise<string>;
  /** Generate a structured completion using a Zod schema */
  completeStructured<T extends z.ZodType>(prompt: string, schema: T): Promise<z.infer<T>>;
  /** Get the model identifier */
  getModel(): string;
}

/**
 * Interface for vector storage backends.
 */
export interface VectorStore {
  /** Store a cache entry */
  store(entry: Omit<CacheEntry, "_id">): Promise<string>;
  /** Search for similar entries, optionally filtered by schema hash */
  searchSimilar(
    embedding: number[],
    limit?: number,
    schemaHash?: string
  ): Promise<SimilaritySearchResult[]>;
  /** Get cache statistics */
  getStats(): Promise<CacheStats>;
  /** Clear all cache entries */
  clear(): Promise<number>;
  /** Update hit count for an entry */
  recordHit(entryId: string): Promise<void>;
  /** Close the connection */
  close(): Promise<void>;
}
