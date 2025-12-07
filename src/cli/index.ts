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
import { queryCommand } from "./commands/query";
import { statsCommand } from "./commands/stats";
import { clearCommand } from "./commands/clear";

// Package version (would normally import from package.json)
const VERSION = "1.0.0";

program
  .name("semantic-cache")
  .description(
    chalk.cyan("Semantic Cache CLI") +
      chalk.gray(" - Demonstrate semantic caching for LLM queries\n\n") +
      chalk.gray("  Uses MongoDB Atlas Vector Search + VoyageAI embeddings to cache\n") +
      chalk.gray("  semantically similar queries, reducing LLM API calls and latency.")
  )
  .version(VERSION);

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

// Demo command for running a demonstration
program
  .command("demo")
  .description("Run an interactive demonstration of semantic caching")
  .action(async () => {
    console.log(chalk.cyan.bold("\n Semantic Cache Demonstration\n"));
    console.log(chalk.gray("This demo shows how semantic caching works by running"));
    console.log(chalk.gray("similar queries and observing cache behavior.\n"));
    console.log(chalk.gray("─".repeat(50)));

    const queries = [
      "What is the capital of France?",
      "Tell me the capital city of France",
      "Which city is the capital of France?",
      "What is the capital of Germany?",
    ];

    const { SemanticCache, loadConfigFromEnv } = await import("../lib");

    let cache: InstanceType<typeof SemanticCache> | null = null;

    try {
      const config = loadConfigFromEnv();
      cache = SemanticCache.fromConfig(config);

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i]!;
        console.log(chalk.white.bold(`\n[${i + 1}/${queries.length}] Query:`));
        console.log(chalk.yellow(`  "${query}"`));

        const result = await cache.query(query);

        if (result.fromCache) {
          console.log(chalk.green(`  Status: CACHE HIT (${(result.similarityScore! * 100).toFixed(1)}% similar)`));
        } else {
          console.log(chalk.blue("  Status: CACHE MISS (response cached)"));
        }

        console.log(chalk.gray(`  Time: ${result.totalTimeMs.toFixed(0)}ms`));

        // Show truncated response
        const shortResponse = result.response.substring(0, 100).replace(/\n/g, " ");
        console.log(chalk.gray(`  Response: ${shortResponse}...`));

        // Small delay between queries for demonstration
        if (i < queries.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(chalk.gray("\n" + "─".repeat(50)));
      console.log(chalk.cyan.bold("\nDemonstration Complete!"));
      console.log(chalk.gray("Notice how semantically similar queries (1-3) hit the cache,"));
      console.log(chalk.gray("while the different query (4) resulted in a cache miss.\n"));
    } catch (error) {
      console.error(chalk.red("\nError:"), error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      if (cache) {
        await cache.close();
      }
    }
  });

// Parse arguments
program.parse();
