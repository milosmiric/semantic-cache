/**
 * Test mocks for external services.
 *
 * These mocks allow testing the semantic cache components without
 * requiring actual API keys or database connections.
 */

import type {
  EmbeddingProvider,
  LLMProvider,
  VectorStore,
  CacheEntry,
  SimilaritySearchResult,
  CacheStats,
  EmbeddingOptions,
} from "@/lib/types";
import type { z } from "zod";

/**
 * Mock embedding provider that generates deterministic embeddings.
 *
 * Uses a simple hash-based approach to generate consistent embeddings
 * for the same input text, enabling predictable test behavior.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  private dimension: number;
  public embedCalls: string[] = [];

  constructor(dimension: number = 1024) {
    this.dimension = dimension;
  }

  /**
   * Generate a deterministic embedding from text.
   * Similar texts will produce similar embeddings.
   */
  async embed(text: string, _options?: EmbeddingOptions): Promise<number[]> {
    this.embedCalls.push(text);
    return this.generateEmbedding(text);
  }

  async embedBatch(texts: string[], _options?: EmbeddingOptions): Promise<number[][]> {
    this.embedCalls.push(...texts);
    return texts.map((text) => this.generateEmbedding(text));
  }

  getDimension(): number {
    return this.dimension;
  }

  /**
   * Generate a deterministic embedding based on text content.
   * Uses character codes to create reproducible vectors.
   */
  private generateEmbedding(text: string): number[] {
    const embedding = new Array(this.dimension).fill(0);
    const normalizedText = text.toLowerCase();

    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i);
      const index = (charCode * (i + 1)) % this.dimension;
      embedding[index] += charCode / 1000;
    }

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  reset(): void {
    this.embedCalls = [];
  }
}

/**
 * Mock LLM provider that returns predictable responses.
 */
export class MockLLMProvider implements LLMProvider {
  public completeCalls: string[] = [];
  public structuredCalls: Array<{ prompt: string; schema: z.ZodType }> = [];
  private responseMap: Map<string, string> = new Map();
  private defaultResponse: string = "This is a mock LLM response.";

  /**
   * Set a specific response for a prompt pattern.
   */
  setResponse(pattern: string, response: string): void {
    this.responseMap.set(pattern.toLowerCase(), response);
  }

  setDefaultResponse(response: string): void {
    this.defaultResponse = response;
  }

  async complete(prompt: string): Promise<string> {
    this.completeCalls.push(prompt);

    // Check for matching pattern
    for (const [pattern, response] of this.responseMap) {
      if (prompt.toLowerCase().includes(pattern)) {
        return response;
      }
    }

    return this.defaultResponse;
  }

  async completeStructured<T extends z.ZodType>(prompt: string, schema: T): Promise<z.infer<T>> {
    this.structuredCalls.push({ prompt, schema });

    // Return a mock object that matches common schema patterns
    const mockResponse: Record<string, unknown> = {
      answer: "Mock answer",
      explanation: "Mock explanation",
      confidence: 0.95,
      city: "Mock City",
      country: "Mock Country",
    };

    // Parse through schema to validate (will throw if invalid)
    return schema.parse(mockResponse) as z.infer<T>;
  }

  getModel(): string {
    return "mock-model";
  }

  reset(): void {
    this.completeCalls = [];
    this.structuredCalls = [];
    this.responseMap.clear();
  }
}

/**
 * Mock vector store that stores entries in memory.
 */
export class MockVectorStore implements VectorStore {
  private entries: Map<string, CacheEntry> = new Map();
  private idCounter: number = 0;
  public storeCalls: Array<Omit<CacheEntry, "_id">> = [];
  public searchCalls: Array<{ embedding: number[]; limit: number; schemaHash?: string }> = [];

  async store(entry: Omit<CacheEntry, "_id">): Promise<string> {
    this.storeCalls.push(entry);
    const id = `mock_id_${++this.idCounter}`;
    this.entries.set(id, { ...entry, _id: id });
    return id;
  }

  async searchSimilar(
    embedding: number[],
    limit: number = 5,
    schemaHash?: string
  ): Promise<SimilaritySearchResult[]> {
    this.searchCalls.push({ embedding, limit, schemaHash });

    const results: SimilaritySearchResult[] = [];

    for (const [_id, entry] of this.entries) {
      // Filter by schemaHash if provided
      if (schemaHash !== undefined && entry.schemaHash !== schemaHash) {
        continue;
      }

      const score = this.cosineSimilarity(embedding, entry.embedding);
      results.push({ entry, score });
    }

    // Sort by score descending and limit
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async getStats(): Promise<CacheStats> {
    let totalHits = 0;
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;

    for (const entry of this.entries.values()) {
      totalHits += entry.hitCount;
      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      if (!newestEntry || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    }

    return {
      totalEntries: this.entries.size,
      totalHits,
      averageSimilarity: 0.9,
      cacheSizeBytes: JSON.stringify([...this.entries.values()]).length,
      oldestEntry,
      newestEntry,
    };
  }

  async clear(): Promise<number> {
    const count = this.entries.size;
    this.entries.clear();
    return count;
  }

  async recordHit(entryId: string): Promise<void> {
    const entry = this.entries.get(entryId);
    if (entry) {
      entry.hitCount++;
      entry.lastAccessedAt = new Date();
    }
  }

  async close(): Promise<void> {
    // No-op for mock
  }

  /**
   * Calculate cosine similarity between two vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!;
      magnitudeA += a[i]! * a[i]!;
      magnitudeB += b[i]! * b[i]!;
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Helper to add a pre-existing entry for testing.
   */
  addEntry(entry: CacheEntry): void {
    const id = entry._id || `mock_id_${++this.idCounter}`;
    this.entries.set(id, { ...entry, _id: id });
  }

  reset(): void {
    this.entries.clear();
    this.storeCalls = [];
    this.searchCalls = [];
    this.idCounter = 0;
  }
}

/**
 * Helper to create a mock cache entry.
 */
export function createMockCacheEntry(overrides: Partial<CacheEntry> = {}): CacheEntry {
  return {
    _id: "test_id_1",
    query: "What is the capital of France?",
    response: "Paris is the capital of France.",
    embedding: new Array(1024).fill(0.1),
    createdAt: new Date(),
    hitCount: 0,
    lastAccessedAt: new Date(),
    ...overrides,
  };
}
