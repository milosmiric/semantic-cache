/**
 * MongoDB Atlas Vector Storage
 *
 * This module provides vector storage and similarity search capabilities
 * using MongoDB Atlas Vector Search. It uses the native MongoDB Node.js driver
 * for database operations and leverages Atlas Vector Search for efficient
 * approximate nearest neighbor (ANN) queries.
 *
 * Key features:
 * - Native MongoDB driver integration
 * - Atlas Vector Search for similarity queries
 * - Schema-aware caching (different schemas = different cache entries)
 * - Automatic connection management
 * - Cache statistics and hit tracking
 *
 * Prerequisites:
 * - MongoDB Atlas cluster (M10+ for Vector Search)
 * - Atlas Vector Search index configured on the collection
 */

import { MongoClient, type Collection, type Db, ObjectId } from "mongodb";
import type { VectorStore, CacheEntry, SimilaritySearchResult, CacheStats } from "../types";

/**
 * Configuration for MongoDB vector storage.
 */
export interface MongoDBVectorStoreConfig {
  /** MongoDB connection URI */
  uri: string;
  /** Database name */
  dbName: string;
  /** Collection name for cache entries */
  collectionName: string;
  /** Field name for embedding vectors */
  embeddingFieldName: string;
  /** Atlas Vector Search index name */
  vectorSearchIndexName: string;
  /** Number of dimensions in embedding vectors */
  embeddingDimension: number;
}

/**
 * MongoDB document structure for cache entries.
 */
interface CacheDocument {
  _id: ObjectId;
  query: string;
  response: string;
  embedding: number[];
  createdAt: Date;
  hitCount: number;
  lastAccessedAt: Date;
  schemaHash?: string;
  metadata?: Record<string, unknown>;
}

/**
 * MongoDB Atlas Vector Store implementation.
 *
 * Provides vector storage and similarity search using MongoDB Atlas.
 * Requires an Atlas Vector Search index to be configured on the collection.
 *
 * Vector Search Index Definition (create in Atlas UI or via API):
 * ```json
 * {
 *   "fields": [{
 *     "type": "vector",
 *     "path": "embedding",
 *     "numDimensions": 1024,
 *     "similarity": "cosine"
 *   }]
 * }
 * ```
 */
export class MongoDBVectorStore implements VectorStore {
  private client: MongoClient;
  private db: Db;
  private collection: Collection<CacheDocument>;
  private config: MongoDBVectorStoreConfig;
  private isConnected: boolean = false;

  /**
   * Creates a new MongoDB vector store instance.
   *
   * @param config - MongoDB configuration options
   */
  constructor(config: MongoDBVectorStoreConfig) {
    this.config = config;
    this.client = new MongoClient(config.uri);
    this.db = this.client.db(config.dbName);
    this.collection = this.db.collection<CacheDocument>(config.collectionName);
  }

  /**
   * Establishes connection to MongoDB Atlas.
   * Called automatically on first operation if not connected.
   */
  async connect(): Promise<void> {
    if (this.isConnected) return;

    await this.client.connect();
    this.isConnected = true;

    // Ensure indexes for efficient querying
    await this.collection.createIndex({ query: 1 }, { unique: false });
    await this.collection.createIndex({ schemaHash: 1 }, { unique: false });
  }

  /**
   * Store a cache entry in the database.
   *
   * @param entry - Cache entry to store (without _id)
   * @returns The generated document ID
   */
  async store(entry: Omit<CacheEntry, "_id">): Promise<string> {
    await this.connect();

    const doc: Omit<CacheDocument, "_id"> = {
      query: entry.query,
      response: entry.response,
      embedding: entry.embedding,
      createdAt: entry.createdAt,
      hitCount: entry.hitCount,
      lastAccessedAt: entry.lastAccessedAt,
      schemaHash: entry.schemaHash,
      metadata: entry.metadata,
    };

    const result = await this.collection.insertOne(doc as CacheDocument);
    return result.insertedId.toString();
  }

  /**
   * Search for semantically similar cache entries using Atlas Vector Search.
   *
   * Uses the $vectorSearch aggregation stage to perform approximate
   * nearest neighbor search on the embedding vectors. When a schemaHash
   * is provided, results are filtered to only include entries with
   * matching schemas.
   *
   * @param embedding - Query embedding vector
   * @param limit - Maximum number of results to return
   * @param schemaHash - Optional schema hash to filter results
   * @returns Array of matching entries with similarity scores
   */
  async searchSimilar(
    embedding: number[],
    limit: number = 5,
    schemaHash?: string
  ): Promise<SimilaritySearchResult[]> {
    await this.connect();

    // Build the aggregation pipeline
    const pipeline: object[] = [
      {
        $vectorSearch: {
          index: this.config.vectorSearchIndexName,
          path: this.config.embeddingFieldName,
          queryVector: embedding,
          numCandidates: limit * 20, // Increase candidates when filtering by schema
          limit: schemaHash ? limit * 5 : limit, // Fetch more if we'll filter
        },
      },
      {
        $project: {
          _id: 1,
          query: 1,
          response: 1,
          embedding: 1,
          createdAt: 1,
          hitCount: 1,
          lastAccessedAt: 1,
          schemaHash: 1,
          metadata: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ];

    // Filter by schema hash if provided
    if (schemaHash !== undefined) {
      pipeline.push({
        $match: {
          $or: [
            { schemaHash: schemaHash },
            { schemaHash: { $exists: false } }, // Include entries without schema (backward compat)
          ],
        },
      });
      pipeline.push({ $limit: limit });
    }

    const results = await this.collection.aggregate(pipeline).toArray();

    return results.map((doc) => ({
      entry: {
        _id: doc._id.toString(),
        query: doc.query,
        response: doc.response,
        embedding: doc.embedding,
        createdAt: doc.createdAt,
        hitCount: doc.hitCount,
        lastAccessedAt: doc.lastAccessedAt,
        schemaHash: doc.schemaHash,
        metadata: doc.metadata,
      },
      score: doc.score as number,
    }));
  }

  /**
   * Get statistics about the cache.
   *
   * @returns Cache statistics including entry count, hit totals, and size
   */
  async getStats(): Promise<CacheStats> {
    await this.connect();

    const pipeline = [
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          totalHits: { $sum: "$hitCount" },
          oldestEntry: { $min: "$createdAt" },
          newestEntry: { $max: "$createdAt" },
        },
      },
    ];

    const [stats] = await this.collection.aggregate(pipeline).toArray();

    // Get collection stats for size estimate
    const collStats = await this.db.command({ collStats: this.config.collectionName });

    if (!stats) {
      return {
        totalEntries: 0,
        totalHits: 0,
        averageSimilarity: 0,
        cacheSizeBytes: 0,
      };
    }

    return {
      totalEntries: stats.totalEntries || 0,
      totalHits: stats.totalHits || 0,
      averageSimilarity: 0, // Would need to track this separately
      cacheSizeBytes: collStats.size || 0,
      oldestEntry: stats.oldestEntry,
      newestEntry: stats.newestEntry,
    };
  }

  /**
   * Clear all entries from the cache.
   *
   * @returns Number of entries deleted
   */
  async clear(): Promise<number> {
    await this.connect();
    const result = await this.collection.deleteMany({});
    return result.deletedCount;
  }

  /**
   * Record a cache hit by incrementing the hit count and updating access time.
   *
   * @param entryId - ID of the cache entry
   */
  async recordHit(entryId: string): Promise<void> {
    await this.connect();
    await this.collection.updateOne(
      { _id: new ObjectId(entryId) },
      {
        $inc: { hitCount: 1 },
        $set: { lastAccessedAt: new Date() },
      }
    );
  }

  /**
   * Close the MongoDB connection.
   */
  async close(): Promise<void> {
    if (this.isConnected) {
      await this.client.close();
      this.isConnected = false;
    }
  }

  /**
   * Get the collection for direct operations if needed.
   * Primarily for testing and advanced use cases.
   */
  getCollection(): Collection<CacheDocument> {
    return this.collection;
  }
}
