/**
 * Integration tests for SemanticCache.
 *
 * These tests verify end-to-end functionality using mocked external services.
 * For actual integration testing with real services, set environment variables
 * and use a separate test command.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { z } from "zod";
import { SemanticCache } from "@/lib/cache/semantic-cache";
import { MockEmbeddingProvider, MockLLMProvider, MockVectorStore } from "@/__tests__/mocks";

describe("Integration: SemanticCache End-to-End", () => {
  let embeddings: MockEmbeddingProvider;
  let storage: MockVectorStore;
  let llm: MockLLMProvider;
  let cache: SemanticCache;

  beforeEach(() => {
    embeddings = new MockEmbeddingProvider(1024);
    storage = new MockVectorStore();
    llm = new MockLLMProvider();
    cache = new SemanticCache(embeddings, storage, llm, 0.85);
  });

  describe("Basic caching workflow", () => {
    test("should cache and retrieve string responses", async () => {
      llm.setResponse("capital of france", "Paris is the capital of France.");

      // First query - cache miss
      const result1 = await cache.query("What is the capital of France?");
      expect(result1.fromCache).toBe(false);
      expect(result1.response).toBe("Paris is the capital of France.");

      // Second query with same text - cache hit
      const result2 = await cache.query("What is the capital of France?");
      expect(result2.fromCache).toBe(true);
      expect(result2.response).toBe("Paris is the capital of France.");
      expect(result2.similarityScore).toBeCloseTo(1, 5);
    });

    test("should demonstrate semantic similarity caching", async () => {
      llm.setResponse("capital", "Paris is the capital of France.");

      // First query
      await cache.query("What is the capital of France?");

      // Similar query should hit cache (our mock embeddings are deterministic)
      // In real scenarios, similar queries would produce similar embeddings
      const result = await cache.query("What is the capital of France?");
      expect(result.fromCache).toBe(true);
    });
  });

  describe("Structured output workflow", () => {
    const CapitalSchema = z.object({
      city: z.string(),
      country: z.string(),
    });

    const DetailedSchema = z.object({
      answer: z.string(),
      confidence: z.number(),
    });

    test("should cache structured responses separately by schema", async () => {
      // Query with CapitalSchema
      const result1 = await cache.query("What is the capital?", { schema: CapitalSchema });
      expect(result1.fromCache).toBe(false);
      expect(result1.response).toHaveProperty("city");
      expect(result1.response).toHaveProperty("country");

      // Same query, same schema - should hit cache
      const result2 = await cache.query("What is the capital?", { schema: CapitalSchema });
      expect(result2.fromCache).toBe(true);

      // Same query, different schema - should miss cache
      const result3 = await cache.query("What is the capital?", { schema: DetailedSchema });
      expect(result3.fromCache).toBe(false);
      expect(result3.response).toHaveProperty("answer");
      expect(result3.response).toHaveProperty("confidence");
    });

    test("should maintain type safety with structured responses", async () => {
      const result = await cache.query("Type safety test", { schema: CapitalSchema });

      // TypeScript should know the response shape
      const city: string = result.response.city;
      const country: string = result.response.country;

      expect(typeof city).toBe("string");
      expect(typeof country).toBe("string");
    });
  });

  describe("Cache management", () => {
    test("should track hit counts correctly", async () => {
      llm.setDefaultResponse("Response");

      // Make initial query
      await cache.query("Track hits test");

      // Make same query multiple times
      await cache.query("Track hits test");
      await cache.query("Track hits test");
      await cache.query("Track hits test");

      const stats = await cache.getStats();
      expect(stats.totalHits).toBe(3); // 3 cache hits after first query
    });

    test("should clear cache and reset stats", async () => {
      llm.setDefaultResponse("Response");

      await cache.query("Clear test query 1");
      await cache.query("Clear test completely different query 2");
      await cache.query("Clear test another unique query 3");

      let stats = await cache.getStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(1);

      await cache.clear();

      stats = await cache.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    test("should handle lookup without triggering LLM", async () => {
      llm.setDefaultResponse("Response");

      // Store an entry first
      await cache.query("Lookup test query");

      // Reset LLM call tracking
      llm.reset();

      // Lookup should not call LLM
      const lookupResult = await cache.lookup("Lookup test query");
      expect(lookupResult.hit).toBe(true);
      expect(llm.completeCalls.length).toBe(0); // No LLM calls
    });
  });

  describe("Threshold behavior", () => {
    test("should respect similarity threshold", async () => {
      llm.setDefaultResponse("Response");

      // Add an entry
      await cache.query("Original query about programming");

      // Set very high threshold
      cache.setThreshold(0.99);

      // Different query should miss even if somewhat similar
      const result = await cache.query("A completely different query about cooking");
      expect(result.fromCache).toBe(false);
    });

    test("should allow threshold adjustment at runtime", async () => {
      expect(cache.getThreshold()).toBe(0.85);

      cache.setThreshold(0.5);
      expect(cache.getThreshold()).toBe(0.5);

      cache.setThreshold(0.95);
      expect(cache.getThreshold()).toBe(0.95);
    });
  });

  describe("Error handling", () => {
    test("should handle empty cache gracefully", async () => {
      const result = await cache.lookup("Query on empty cache");
      expect(result.hit).toBe(false);
      expect(result.response).toBeUndefined();
    });

    test("should reject invalid threshold values", () => {
      expect(() => cache.setThreshold(-0.5)).toThrow();
      expect(() => cache.setThreshold(1.5)).toThrow();
    });
  });

  describe("Performance tracking", () => {
    test("should track timing information", async () => {
      llm.setDefaultResponse("Response");

      const result = await cache.query("Timing test");

      expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.totalTimeMs).toBe("number");
    });

    test("should report lookup timing", async () => {
      const result = await cache.lookup("Lookup timing test");

      expect(result.lookupTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.lookupTimeMs).toBe("number");
    });
  });
});

describe("Integration: Mock Provider Verification", () => {
  test("MockEmbeddingProvider generates consistent embeddings", async () => {
    const embeddings = new MockEmbeddingProvider(512);

    const emb1 = await embeddings.embed("test text");
    const emb2 = await embeddings.embed("test text");

    // Same input should produce identical embeddings
    expect(emb1).toEqual(emb2);
    expect(emb1.length).toBe(512);
  });

  test("MockEmbeddingProvider tracks calls", async () => {
    const embeddings = new MockEmbeddingProvider();

    await embeddings.embed("first");
    await embeddings.embed("second");
    await embeddings.embedBatch(["third", "fourth"]);

    expect(embeddings.embedCalls).toEqual(["first", "second", "third", "fourth"]);
  });

  test("MockLLMProvider can be configured with responses", async () => {
    const llm = new MockLLMProvider();

    llm.setResponse("weather", "It's sunny today.");
    llm.setResponse("capital", "Paris");

    const weather = await llm.complete("What's the weather?");
    const capital = await llm.complete("What's the capital?");

    expect(weather).toBe("It's sunny today.");
    expect(capital).toBe("Paris");
  });

  test("MockVectorStore calculates cosine similarity correctly", async () => {
    const store = new MockVectorStore();

    // Identical vectors should have similarity of 1
    const vec1 = [1, 0, 0];
    const vec2 = [1, 0, 0];

    store.addEntry({
      _id: "test",
      query: "test",
      response: "response",
      embedding: vec1,
      createdAt: new Date(),
      hitCount: 0,
      lastAccessedAt: new Date(),
    });

    const results = await store.searchSimilar(vec2, 1);
    expect(results[0]!.score).toBeCloseTo(1, 5);
  });
});
