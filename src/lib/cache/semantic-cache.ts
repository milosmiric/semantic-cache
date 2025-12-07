/**
 * Semantic Cache Implementation
 *
 * This is the core component that orchestrates semantic caching for LLM queries.
 * It combines vector embeddings, similarity search, and LLM completion to provide
 * intelligent query caching based on semantic similarity rather than exact matching.
 *
 * How Semantic Caching Works:
 * 1. When a query arrives, it's converted to a vector embedding using VoyageAI
 * 2. The embedding is compared against cached query embeddings using Atlas Vector Search
 * 3. If a similar query exists above the similarity threshold, the cached response is returned
 * 4. Otherwise, the query is sent to the LLM, and the response is cached for future use
 *
 * Structured Output Support:
 * - Pass a Zod schema to get typed responses
 * - Schema-aware caching ensures different schemas don't collide
 * - Backward compatible with string responses
 *
 * Benefits:
 * - Reduced LLM API costs by avoiding redundant queries
 * - Lower latency for semantically similar queries
 * - Natural handling of query variations (rephrasing, typos, etc.)
 * - Type-safe structured responses with Zod schemas
 */

import { createHash } from "crypto";
import { z } from "zod";
import type {
  SemanticCacheConfig,
  QueryResult,
  CacheLookupResult,
  CacheStats,
  EmbeddingProvider,
  LLMProvider,
  VectorStore,
  QueryOptions,
} from "../types";
import { VoyageEmbeddings } from "../embeddings/voyage";
import { MongoDBVectorStore } from "../storage/mongodb";
import { OpenAILLM } from "../llm/openai";

/**
 * Compute a hash of a Zod schema for cache differentiation.
 *
 * Uses SHA-256 to create a consistent hash from the schema's internal
 * definition. This ensures different schemas produce different cache
 * entries even for semantically similar queries.
 *
 * @param schema - Zod schema to hash
 * @returns Hex string prefixed with "schema_"
 */
function computeSchemaHash(schema: z.ZodType): string {
  const hash = createHash("sha256")
    .update(JSON.stringify(schema._def))
    .digest("hex")
    .slice(0, 16);
  return `schema_${hash}`;
}

/**
 * Main semantic cache class.
 *
 * Provides a high-level interface for semantic caching of LLM queries.
 * Uses dependency injection for all components, allowing for easy testing
 * and swapping of implementations.
 *
 * Supports both string responses and structured output via Zod schemas.
 */
export class SemanticCache {
  private embeddings: EmbeddingProvider;
  private storage: VectorStore;
  private llm: LLMProvider;
  private similarityThreshold: number;
  private lastLLMCallDuration: number = 0;

  /**
   * Creates a new SemanticCache instance with the provided components.
   *
   * @param embeddings - Embedding provider for vector generation
   * @param storage - Vector storage backend
   * @param llm - LLM provider for generating responses (must implement LLMProvider)
   * @param similarityThreshold - Minimum similarity score for cache hits (0-1)
   */
  constructor(
    embeddings: EmbeddingProvider,
    storage: VectorStore,
    llm: LLMProvider,
    similarityThreshold: number = 0.85
  ) {
    this.embeddings = embeddings;
    this.storage = storage;
    this.llm = llm;
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Factory method to create a SemanticCache from configuration.
   *
   * This is the recommended way to instantiate the cache for production use.
   * It handles all component initialization and wiring.
   *
   * @param config - Complete configuration object
   * @returns Configured SemanticCache instance
   */
  static fromConfig(config: SemanticCacheConfig): SemanticCache {
    const embeddings = new VoyageEmbeddings(config.voyageApiKey);
    const storage = new MongoDBVectorStore({
      uri: config.mongoUri,
      dbName: config.dbName,
      collectionName: config.collectionName,
      embeddingFieldName: config.embeddingsFieldName,
      vectorSearchIndexName: config.vectorSearchIndexName || "default",
      embeddingDimension: embeddings.getDimension(),
    });
    const llm = new OpenAILLM(config.openaiApiKey, config.llmModel);

    return new SemanticCache(embeddings, storage, llm, config.similarityThreshold || 0.85);
  }

  /**
   * Process a query through the semantic cache (string response).
   *
   * @param queryText - User query string
   * @returns Query result with string response
   */
  async query(queryText: string): Promise<QueryResult<string>>;

  /**
   * Process a query through the semantic cache (structured response).
   *
   * @param queryText - User query string
   * @param options - Query options including Zod schema
   * @returns Query result with typed response matching the schema
   */
  async query<T extends z.ZodType>(
    queryText: string,
    options: QueryOptions<T>
  ): Promise<QueryResult<z.infer<T>>>;

  /**
   * Process a query through the semantic cache.
   *
   * This is the main entry point for querying with caching.
   * The method will:
   * 1. Generate an embedding for the query
   * 2. Search for similar cached queries (filtered by schema if provided)
   * 3. Return cached response if similarity exceeds threshold
   * 4. Otherwise, call LLM and cache the new response
   *
   * @param queryText - User query string
   * @param options - Optional query options with Zod schema
   * @returns Query result with response, cache status, and timing
   */
  async query<T extends z.ZodType>(
    queryText: string,
    options?: QueryOptions<T>
  ): Promise<QueryResult<string> | QueryResult<z.infer<T>>> {
    const startTime = performance.now();
    const schema = options?.schema;
    const schemaHash = schema ? computeSchemaHash(schema) : undefined;

    // Generate embedding for the query
    const embedding = await this.embeddings.embed(queryText, { inputType: "query" });

    // Search for similar cached entries (filtered by schema hash)
    const results = await this.storage.searchSimilar(embedding, 1, schemaHash);

    // Check for cache hit
    if (results.length > 0) {
      const topResult = results[0];
      if (topResult && topResult.score >= this.similarityThreshold) {
        // Record the hit
        if (topResult.entry._id) {
          await this.storage.recordHit(topResult.entry._id);
        }

        const totalTimeMs = performance.now() - startTime;

        // Parse response based on whether schema was provided
        if (schema) {
          const parsedResponse = JSON.parse(topResult.entry.response) as z.infer<T>;
          return {
            response: parsedResponse,
            fromCache: true,
            similarityScore: topResult.score,
            totalTimeMs,
            timeSavedMs:
              this.lastLLMCallDuration > 0 ? this.lastLLMCallDuration - totalTimeMs : undefined,
          };
        }

        return {
          response: topResult.entry.response,
          fromCache: true,
          similarityScore: topResult.score,
          totalTimeMs,
          timeSavedMs:
            this.lastLLMCallDuration > 0 ? this.lastLLMCallDuration - totalTimeMs : undefined,
        };
      }
    }

    // Cache miss - call LLM
    const llmStartTime = performance.now();

    let response: string;
    let parsedResponse: z.infer<T> | undefined;

    if (schema) {
      // Structured output
      parsedResponse = await this.llm.completeStructured(queryText, schema);
      response = JSON.stringify(parsedResponse);
    } else {
      // String output
      response = await this.llm.complete(queryText);
    }

    this.lastLLMCallDuration = performance.now() - llmStartTime;

    // Store in cache
    await this.storage.store({
      query: queryText,
      response,
      embedding,
      createdAt: new Date(),
      hitCount: 0,
      lastAccessedAt: new Date(),
      schemaHash,
    });

    const totalTimeMs = performance.now() - startTime;

    if (schema && parsedResponse !== undefined) {
      return {
        response: parsedResponse,
        fromCache: false,
        totalTimeMs,
      };
    }

    return {
      response,
      fromCache: false,
      totalTimeMs,
    };
  }

  /**
   * Look up a query in the cache without calling the LLM.
   *
   * Useful for checking cache status without triggering a full query.
   *
   * @param queryText - Query string to look up
   * @param embedding - Optional pre-computed embedding
   * @param schemaHash - Optional schema hash for filtering
   * @returns Lookup result with cache status and timing
   */
  async lookup(
    queryText: string,
    embedding?: number[],
    schemaHash?: string
  ): Promise<CacheLookupResult> {
    const startTime = performance.now();

    // Generate embedding if not provided
    const queryEmbedding =
      embedding || (await this.embeddings.embed(queryText, { inputType: "query" }));

    // Search for similar entries
    const results = await this.storage.searchSimilar(queryEmbedding, 1, schemaHash);
    const lookupTimeMs = performance.now() - startTime;

    if (results.length === 0) {
      return {
        hit: false,
        query: queryText,
        lookupTimeMs,
      };
    }

    const topResult = results[0];
    if (!topResult) {
      return {
        hit: false,
        query: queryText,
        lookupTimeMs,
      };
    }

    // Check if similarity meets threshold
    if (topResult.score >= this.similarityThreshold) {
      // Record the hit
      if (topResult.entry._id) {
        await this.storage.recordHit(topResult.entry._id);
      }

      return {
        hit: true,
        response: topResult.entry.response,
        score: topResult.score,
        query: queryText,
        lookupTimeMs,
      };
    }

    return {
      hit: false,
      score: topResult.score,
      query: queryText,
      lookupTimeMs,
    };
  }

  /**
   * Get cache statistics.
   *
   * @returns Statistics about cache usage and size
   */
  async getStats(): Promise<CacheStats> {
    return this.storage.getStats();
  }

  /**
   * Clear all entries from the cache.
   *
   * @returns Number of entries cleared
   */
  async clear(): Promise<number> {
    return this.storage.clear();
  }

  /**
   * Close all connections and clean up resources.
   *
   * Should be called when the cache is no longer needed.
   */
  async close(): Promise<void> {
    await this.storage.close();
  }

  /**
   * Get the current similarity threshold.
   *
   * @returns Threshold value between 0 and 1
   */
  getThreshold(): number {
    return this.similarityThreshold;
  }

  /**
   * Set the similarity threshold.
   *
   * @param threshold - New threshold value (0-1)
   */
  setThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error("Threshold must be between 0 and 1");
    }
    this.similarityThreshold = threshold;
  }
}
