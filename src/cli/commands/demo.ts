/**
 * Demo Command
 *
 * Handles the 'demo' command for the semantic cache CLI.
 * Runs an interactive demonstration of semantic caching.
 */

import chalk from "chalk";
import { SemanticCache } from "@/lib";
import { loadConfigFromEnv, createCacheFromConfig } from "@/cli/config";

/**
 * Small delay helper to allow vector search index to update.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run an interactive demonstration of semantic caching.
 */
export async function demoCommand(): Promise<void> {
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

  let cache: SemanticCache | null = null;

  try {
    const config = loadConfigFromEnv();
    cache = createCacheFromConfig(config);

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]!;
      console.log(chalk.white.bold(`\n[${i + 1}/${queries.length}] Query:`));
      console.log(chalk.yellow(`  "${query}"`));

      const result = await cache.query(query);

      if (result.fromCache) {
        console.log(
          chalk.green(`  Status: CACHE HIT (${(result.similarityScore! * 100).toFixed(1)}% similar)`)
        );
      } else {
        console.log(chalk.blue("  Status: CACHE MISS (response cached)"));
      }

      console.log(chalk.gray(`  Time: ${result.totalTimeMs.toFixed(0)}ms`));

      // Show truncated response
      const shortResponse = result.response.substring(0, 100).replace(/\n/g, " ");
      console.log(chalk.gray(`  Response: ${shortResponse}...`));

      // Small delay between queries to allow vector search index to update
      if (i < queries.length - 1) {
        await delay(500);
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
}
