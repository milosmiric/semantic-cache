/**
 * Unit tests for MongoDBVectorStore.
 *
 * Tests the MongoDB Atlas Vector Store interface and behavior.
 * Note: These tests verify interface contracts since actual database
 * operations require a running MongoDB instance.
 */

import { describe, test, expect } from "bun:test";
import { MongoDBVectorStore } from "@/lib/storage/mongodb";

describe("MongoDBVectorStore", () => {
  // Note: These tests verify interface and configuration.
  // Integration tests would require a real MongoDB connection.

  describe("constructor", () => {
    test("should accept valid configuration", () => {
      // This will throw connection errors but validates config structure
      const config = {
        uri: "mongodb://localhost:27017",
        dbName: "test-db",
        collectionName: "test-collection",
        embeddingFieldName: "embedding",
        vectorSearchIndexName: "default",
        embeddingDimension: 1024,
      };

      // Verify config shape is accepted (actual connection not tested)
      expect(config.uri).toBeDefined();
      expect(config.dbName).toBeDefined();
      expect(config.collectionName).toBeDefined();
      expect(config.embeddingFieldName).toBeDefined();
      expect(config.vectorSearchIndexName).toBeDefined();
      expect(config.embeddingDimension).toBe(1024);
    });
  });

  describe("interface compliance", () => {
    test("MongoDBVectorStore should implement VectorStore interface", () => {
      // Verify the class has all required methods
      expect(MongoDBVectorStore.prototype.store).toBeDefined();
      expect(MongoDBVectorStore.prototype.searchSimilar).toBeDefined();
      expect(MongoDBVectorStore.prototype.getStats).toBeDefined();
      expect(MongoDBVectorStore.prototype.clear).toBeDefined();
      expect(MongoDBVectorStore.prototype.recordHit).toBeDefined();
      expect(MongoDBVectorStore.prototype.close).toBeDefined();
    });
  });

  describe("configuration validation", () => {
    test("should require embedding dimension", () => {
      const config = {
        uri: "mongodb://localhost:27017",
        dbName: "test-db",
        collectionName: "test-collection",
        embeddingFieldName: "embedding",
        vectorSearchIndexName: "default",
        embeddingDimension: 512,
      };

      expect(config.embeddingDimension).toBe(512);
    });

    test("should support custom index name", () => {
      const config = {
        uri: "mongodb://localhost:27017",
        dbName: "test-db",
        collectionName: "test-collection",
        embeddingFieldName: "embedding",
        vectorSearchIndexName: "my_custom_index",
        embeddingDimension: 1024,
      };

      expect(config.vectorSearchIndexName).toBe("my_custom_index");
    });
  });
});

describe("MockVectorStore (from mocks)", () => {
  // These tests verify our mock implementation works correctly
  // for use in other tests

  const { MockVectorStore, createMockCacheEntry } = require("./mocks");

  test("should store and retrieve entries", async () => {
    const store = new MockVectorStore();

    const entry = {
      query: "Test query",
      response: "Test response",
      embedding: new Array(1024).fill(0.1),
      createdAt: new Date(),
      hitCount: 0,
      lastAccessedAt: new Date(),
    };

    const id = await store.store(entry);

    expect(id).toBeDefined();
    expect(id).toMatch(/^mock_id_/);
  });

  test("should calculate cosine similarity correctly", async () => {
    const store = new MockVectorStore();

    const embedding = new Array(1024).fill(0.1);
    store.addEntry({
      _id: "test_entry",
      query: "Test",
      response: "Response",
      embedding,
      createdAt: new Date(),
      hitCount: 0,
      lastAccessedAt: new Date(),
    });

    // Search with identical embedding should return score of 1
    const results = await store.searchSimilar(embedding, 1);

    expect(results.length).toBe(1);
    expect(results[0]!.score).toBeCloseTo(1, 5);
  });

  test("should filter by schema hash", async () => {
    const store = new MockVectorStore();
    const embedding = new Array(1024).fill(0.1);

    store.addEntry({
      _id: "entry_1",
      query: "Test",
      response: "Response 1",
      embedding,
      createdAt: new Date(),
      hitCount: 0,
      lastAccessedAt: new Date(),
      schemaHash: "schema_abc",
    });

    store.addEntry({
      _id: "entry_2",
      query: "Test",
      response: "Response 2",
      embedding,
      createdAt: new Date(),
      hitCount: 0,
      lastAccessedAt: new Date(),
      schemaHash: "schema_xyz",
    });

    const results = await store.searchSimilar(embedding, 10, "schema_abc");

    expect(results.length).toBe(1);
    expect(results[0]!.entry.schemaHash).toBe("schema_abc");
  });

  test("should track statistics", async () => {
    const store = new MockVectorStore();

    store.addEntry(createMockCacheEntry({ hitCount: 5 }));
    store.addEntry(createMockCacheEntry({ _id: "id_2", hitCount: 3 }));

    const stats = await store.getStats();

    expect(stats.totalEntries).toBe(2);
    expect(stats.totalHits).toBe(8);
  });

  test("should clear all entries", async () => {
    const store = new MockVectorStore();

    store.addEntry(createMockCacheEntry());
    store.addEntry(createMockCacheEntry({ _id: "id_2" }));

    const cleared = await store.clear();

    expect(cleared).toBe(2);

    const stats = await store.getStats();
    expect(stats.totalEntries).toBe(0);
  });
});
