/**
 * Unit tests for CLI configuration management.
 *
 * Tests environment variable loading and configuration validation.
 * Note: This tests the CLI-specific config helper, not the library itself.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";

describe("loadConfigFromEnv (CLI)", () => {
  // Store original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set up test environment variables
    process.env.MONGODB_ATLAS_URI = "mongodb+srv://test:test@cluster.mongodb.net";
    process.env.MONGODB_ATLAS_DB_NAME = "test-db";
    process.env.MONGODB_ATLAS_COLLECTION_NAME = "test-collection";
    process.env.MONGODB_ATLAS_EMBEDDINGS_FIELD_NAME = "embedding";
    process.env.VOYAGEAI_API_KEY = "voyage-test-key";
    process.env.OPENAI_API_KEY = "openai-test-key";
    process.env.LLM_MODEL = "gpt-5-mini";
    process.env.SIMILARITY_THRESHOLD = "0.9";
    process.env.VECTOR_SEARCH_INDEX_NAME = "custom_index";
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  test("should load all configuration values", async () => {
    const { loadConfigFromEnv } = await import("../cli/config");

    const config = loadConfigFromEnv();

    expect(config.mongoUri).toBe("mongodb+srv://test:test@cluster.mongodb.net");
    expect(config.dbName).toBe("test-db");
    expect(config.collectionName).toBe("test-collection");
    expect(config.embeddingsFieldName).toBe("embedding");
    expect(config.voyageApiKey).toBe("voyage-test-key");
    expect(config.openaiApiKey).toBe("openai-test-key");
    expect(config.llmModel).toBe("gpt-5-mini");
    expect(config.similarityThreshold).toBe(0.9);
    expect(config.vectorSearchIndexName).toBe("custom_index");
  });

  test("should use default values when optionals are missing", async () => {
    delete process.env.LLM_MODEL;
    delete process.env.SIMILARITY_THRESHOLD;
    delete process.env.VECTOR_SEARCH_INDEX_NAME;
    delete process.env.MONGODB_ATLAS_EMBEDDINGS_FIELD_NAME;

    // Need to re-import to pick up new env values
    // Clear module cache
    delete require.cache[require.resolve("../cli/config")];

    const { loadConfigFromEnv } = await import("../cli/config");
    const config = loadConfigFromEnv();

    expect(config.llmModel).toBe("gpt-5-mini");
    expect(config.similarityThreshold).toBe(0.85);
    expect(config.vectorSearchIndexName).toBe("default");
    expect(config.embeddingsFieldName).toBe("embedding");
  });

  test("should throw when required values are missing", async () => {
    delete process.env.MONGODB_ATLAS_URI;

    // Clear module cache
    delete require.cache[require.resolve("../cli/config")];

    const { loadConfigFromEnv } = await import("../cli/config");

    expect(() => loadConfigFromEnv()).toThrow();
  });

  test("should parse similarity threshold as number", async () => {
    process.env.SIMILARITY_THRESHOLD = "0.75";

    delete require.cache[require.resolve("../cli/config")];

    const { loadConfigFromEnv } = await import("../cli/config");
    const config = loadConfigFromEnv();

    expect(typeof config.similarityThreshold).toBe("number");
    expect(config.similarityThreshold).toBe(0.75);
  });
});

describe("CLIConfig type", () => {
  test("should have all required fields", async () => {
    const { loadConfigFromEnv } = await import("../cli/config");

    // Set up required env vars
    process.env.MONGODB_ATLAS_URI = "mongodb://test";
    process.env.MONGODB_ATLAS_DB_NAME = "db";
    process.env.MONGODB_ATLAS_COLLECTION_NAME = "col";
    process.env.VOYAGEAI_API_KEY = "voyage-key";
    process.env.OPENAI_API_KEY = "openai-key";

    const config = loadConfigFromEnv();

    // Verify required fields exist
    expect(config).toHaveProperty("mongoUri");
    expect(config).toHaveProperty("dbName");
    expect(config).toHaveProperty("collectionName");
    expect(config).toHaveProperty("embeddingsFieldName");
    expect(config).toHaveProperty("voyageApiKey");
    expect(config).toHaveProperty("openaiApiKey");
    expect(config).toHaveProperty("llmModel");
  });
});
