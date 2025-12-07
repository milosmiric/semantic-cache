/**
 * Configuration management for the Semantic Cache library.
 *
 * Handles loading configuration from environment variables and provides
 * sensible defaults where applicable.
 */

import type { SemanticCacheConfig } from "./types";

/**
 * Default configuration values.
 */
const DEFAULTS = {
  similarityThreshold: 0.85,
  vectorSearchIndexName: "default",
  embeddingsFieldName: "embedding",
  llmModel: "gpt-5-mini",
} as const;

/**
 * Loads configuration from environment variables.
 * Bun automatically loads .env files, so no additional setup is required.
 *
 * @returns Complete configuration object with environment values and defaults
 * @throws Error if required environment variables are missing
 */
export function loadConfigFromEnv(): SemanticCacheConfig {
  const required = [
    "MONGODB_ATLAS_URI",
    "MONGODB_ATLAS_DB_NAME",
    "MONGODB_ATLAS_COLLECTION_NAME",
    "VOYAGEAI_API_KEY",
    "OPENAI_API_KEY",
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        "Please ensure these are set in your .env file or environment."
    );
  }

  return {
    mongoUri: process.env.MONGODB_ATLAS_URI!,
    dbName: process.env.MONGODB_ATLAS_DB_NAME!,
    collectionName: process.env.MONGODB_ATLAS_COLLECTION_NAME!,
    embeddingsFieldName:
      process.env.MONGODB_ATLAS_EMBEDDINGS_FIELD_NAME || DEFAULTS.embeddingsFieldName,
    voyageApiKey: process.env.VOYAGEAI_API_KEY!,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    llmModel: process.env.LLM_MODEL || DEFAULTS.llmModel,
    similarityThreshold: parseFloat(
      process.env.SIMILARITY_THRESHOLD || String(DEFAULTS.similarityThreshold)
    ),
    vectorSearchIndexName:
      process.env.VECTOR_SEARCH_INDEX_NAME || DEFAULTS.vectorSearchIndexName,
  };
}

/**
 * Validates a configuration object for completeness and correctness.
 *
 * @param config - Configuration object to validate
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: SemanticCacheConfig): void {
  if (!config.mongoUri.startsWith("mongodb")) {
    throw new Error("Invalid MongoDB URI format");
  }

  if (config.similarityThreshold !== undefined) {
    if (config.similarityThreshold < 0 || config.similarityThreshold > 1) {
      throw new Error("Similarity threshold must be between 0 and 1");
    }
  }

  if (!config.voyageApiKey || config.voyageApiKey.length < 10) {
    throw new Error("Invalid VoyageAI API key");
  }

  if (!config.openaiApiKey || config.openaiApiKey.length < 10) {
    throw new Error("Invalid OpenAI API key");
  }
}
