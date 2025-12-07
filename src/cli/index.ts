#!/usr/bin/env bun
/**
 * Semantic Cache CLI
 *
 * A command-line tool for demonstrating semantic caching of LLM queries.
 * Uses MongoDB Atlas Vector Search for similarity matching and VoyageAI
 * for embedding generation.
 *
 * Usage:
 *   semantic-cache query "What is the capital of France?"
 *   semantic-cache stats
 *   semantic-cache clear
 *   semantic-cache demo
 *   semantic-cache demo-structured
 *
 * Environment Variables Required:
 *   MONGODB_ATLAS_URI          - MongoDB Atlas connection string
 *   MONGODB_ATLAS_DB_NAME      - Database name
 *   MONGODB_ATLAS_COLLECTION_NAME - Collection name
 *   VOYAGEAI_API_KEY           - VoyageAI API key
 *   OPENAI_API_KEY             - OpenAI API key
 *
 * Optional:
 *   LLM_MODEL                  - OpenAI model (default: "gpt-5-mini")
 *   SIMILARITY_THRESHOLD       - Cache hit threshold (default: 0.85)
 */

import { program } from "commander";
import chalk from "chalk";
import { queryCommand } from "@/cli/commands/query";
import { statsCommand } from "@/cli/commands/stats";
import { clearCommand } from "@/cli/commands/clear";
import { demoCommand } from "@/cli/commands/demo";
import { demoStructuredCommand } from "@/cli/commands/demo-structured";
import packageJson from "../../package.json";

program
  .name("semantic-cache")
  .description(
    chalk.cyan("Semantic Cache CLI") +
      chalk.gray(" - Demonstrate semantic caching for LLM queries\n\n") +
      chalk.gray("  Uses MongoDB Atlas Vector Search + VoyageAI embeddings to cache\n") +
      chalk.gray("  semantically similar queries, reducing LLM API calls and latency.")
  )
  .version(packageJson.version);

// Query command
program
  .command("query")
  .description("Send a query through the semantic cache")
  .argument("<query>", "The query to process")
  .option("-t, --threshold <number>", "Similarity threshold for cache hits (0-1)")
  .option("-v, --verbose", "Show detailed debug information")
  .action(queryCommand);

// Stats command
program
  .command("stats")
  .description("Display cache statistics")
  .action(statsCommand);

// Clear command
program
  .command("clear")
  .description("Clear all cached entries")
  .option("-f, --force", "Skip confirmation prompt")
  .action(clearCommand);

// Demo command
program
  .command("demo")
  .description("Run an interactive demonstration of semantic caching")
  .action(demoCommand);

// Demo structured command
program
  .command("demo-structured")
  .description("Demonstrate structured output with Zod schemas")
  .action(demoStructuredCommand);

// Show help if no arguments provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

// Parse arguments
program.parse();
