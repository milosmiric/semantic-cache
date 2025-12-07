/**
 * CLI Configuration
 *
 * Handles loading configuration from environment variables for the CLI.
 * This is CLI-specific and not part of the library exports.
 */

import { VoyageEmbeddings } from "../lib/embeddings/voyage";
import { MongoDBVectorStore } from "../lib/storage/mongodb";
import { VercelAILLM } from "../lib/llm/vercel-ai";
import { SemanticCache } from "../lib/cache/semantic-cache";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * CLI configuration from environment variables.
 */
export interface CLIConfig {
  mongoUri: string;
  dbName: string;
  collectionName: string;
  embeddingsFieldName: string;
  voyageApiKey: string;
  openaiApiKey: string;
  llmModel: string;
  similarityThreshold: number;
  vectorSearchIndexName: string;
}

/**
 * Default configuration values for CLI.
 */
const DEFAULTS = {
  similarityThreshold: 0.85,
  vectorSearchIndexName: "default",
  embeddingsFieldName: "embedding",
  llmModel: "gpt-5-mini",
} as const;

/**
 * Load CLI configuration from environment variables.
 * Bun automatically loads .env files.
 *
 * @returns CLI configuration object
 * @throws Error if required environment variables are missing
 */
export function loadConfigFromEnv(): CLIConfig {
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
 * Create a SemanticCache instance from CLI configuration.
 *
 * @param config - CLI configuration
 * @returns Configured SemanticCache instance
 */
export function createCacheFromConfig(config: CLIConfig): SemanticCache {
  const embeddings = new VoyageEmbeddings(config.voyageApiKey);

  const storage = new MongoDBVectorStore({
    uri: config.mongoUri,
    dbName: config.dbName,
    collectionName: config.collectionName,
    embeddingFieldName: config.embeddingsFieldName,
    vectorSearchIndexName: config.vectorSearchIndexName,
    embeddingDimension: embeddings.getDimension(),
  });

  const openai = createOpenAI({ apiKey: config.openaiApiKey });
  const llm = new VercelAILLM(openai(config.llmModel));

  return new SemanticCache(embeddings, storage, llm, {
    similarityThreshold: config.similarityThreshold,
  });
}
