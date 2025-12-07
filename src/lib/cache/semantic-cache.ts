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
 * Benefits:
 * - Reduced LLM API costs by avoiding redundant queries
 * - Lower latency for semantically similar queries
 * - Natural handling of query variations (rephrasing, typos, etc.)
 */

import type {
  SemanticCacheConfig,
  QueryResult,
  CacheLookupResult,
  CacheStats,
  EmbeddingProvider,
  LLMProvider,
  VectorStore,
} from "../types";
import { VoyageEmbeddings } from "../embeddings/voyage";
import { MongoDBVectorStore } from "../storage/mongodb";
import { OpenAILLM } from "../llm/openai";

/**
 * Main semantic cache class.
 *
 * Provides a high-level interface for semantic caching of LLM queries.
 * Uses dependency injection for all components, allowing for easy testing
 * and swapping of implementations.
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
   * @param llm - LLM provider for generating responses
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
      vectorSearchIndexName: config.vectorSearchIndexName || "vector_index",
      embeddingDimension: embeddings.getDimension(),
    });
    const llm = new OpenAILLM(config.openaiApiKey, config.llmModel);

    return new SemanticCache(embeddings, storage, llm, config.similarityThreshold || 0.85);
  }

  /**
   * Process a query through the semantic cache.
   *
   * This is the main entry point for querying with caching.
   * The method will:
   * 1. Generate an embedding for the query
   * 2. Search for similar cached queries
   * 3. Return cached response if similarity exceeds threshold
   * 4. Otherwise, call LLM and cache the new response
   *
   * @param query - User query string
   * @returns Query result with response, cache status, and timing
   */
  async query(query: string): Promise<QueryResult> {
    const startTime = performance.now();

    // Generate embedding for the query
    const embedding = await this.embeddings.embed(query, { inputType: "query" });

    // Search for similar cached entries
    const lookupResult = await this.lookup(query, embedding);

    if (lookupResult.hit && lookupResult.response) {
      const totalTimeMs = performance.now() - startTime;
      return {
        response: lookupResult.response,
        fromCache: true,
        similarityScore: lookupResult.score,
        totalTimeMs,
        timeSavedMs: this.lastLLMCallDuration > 0 ? this.lastLLMCallDuration - totalTimeMs : undefined,
      };
    }

    // Cache miss - call LLM
    const llmStartTime = performance.now();
    const response = await this.llm.complete(query);
    this.lastLLMCallDuration = performance.now() - llmStartTime;

    // Store in cache
    await this.storage.store({
      query,
      response,
      embedding,
      createdAt: new Date(),
      hitCount: 0,
      lastAccessedAt: new Date(),
    });

    const totalTimeMs = performance.now() - startTime;
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
   * @param query - Query string to look up
   * @param embedding - Optional pre-computed embedding
   * @returns Lookup result with cache status and timing
   */
  async lookup(query: string, embedding?: number[]): Promise<CacheLookupResult> {
    const startTime = performance.now();

    // Generate embedding if not provided
    const queryEmbedding = embedding || (await this.embeddings.embed(query, { inputType: "query" }));

    // Search for similar entries
    const results = await this.storage.searchSimilar(queryEmbedding, 1);
    const lookupTimeMs = performance.now() - startTime;

    if (results.length === 0) {
      return {
        hit: false,
        query,
        lookupTimeMs,
      };
    }

    const topResult = results[0];
    if (!topResult) {
      return {
        hit: false,
        query,
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
        query,
        lookupTimeMs,
      };
    }

    return {
      hit: false,
      score: topResult.score,
      query,
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
