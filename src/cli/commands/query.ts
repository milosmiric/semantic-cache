/**
 * Query Command
 *
 * Handles the 'query' command for the semantic cache CLI.
 * Demonstrates the semantic caching capability by processing user queries
 * and showing cache hit/miss statistics.
 */

import chalk from "chalk";
import { SemanticCache } from "../../lib";
import { loadConfigFromEnv, createCacheFromConfig } from "../config";

/**
 * Execute a query through the semantic cache.
 *
 * @param queryText - The query string to process
 * @param options - Command options
 */
export async function queryCommand(
  queryText: string,
  options: { threshold?: string; verbose?: boolean }
): Promise<void> {
  let cache: SemanticCache | null = null;

  try {
    const config = loadConfigFromEnv();

    if (options.threshold) {
      config.similarityThreshold = parseFloat(options.threshold);
    }

    cache = createCacheFromConfig(config);

    console.log(chalk.gray("\nProcessing query..."));
    console.log(chalk.gray("─".repeat(50)));

    const result = await cache.query(queryText);

    // Display results
    console.log();
    if (result.fromCache) {
      console.log(chalk.green.bold("Cache HIT"));
      console.log(chalk.gray(`Similarity Score: ${(result.similarityScore! * 100).toFixed(1)}%`));
    } else {
      console.log(chalk.yellow.bold("Cache MISS"));
      console.log(chalk.gray("Response cached for future similar queries"));
    }

    console.log(chalk.gray(`Time: ${result.totalTimeMs.toFixed(0)}ms`));

    if (result.timeSavedMs) {
      console.log(chalk.green(`Time saved: ~${result.timeSavedMs.toFixed(0)}ms`));
    }

    console.log();
    console.log(chalk.gray("─".repeat(50)));
    console.log(chalk.white.bold("Response:"));
    console.log();
    console.log(result.response);
    console.log();

    if (options.verbose) {
      console.log(chalk.gray("─".repeat(50)));
      console.log(chalk.gray("Debug Info:"));
      console.log(chalk.gray(`  Model: ${config.llmModel}`));
      console.log(chalk.gray(`  Threshold: ${config.similarityThreshold}`));
      console.log(chalk.gray(`  Collection: ${config.collectionName}`));
    }
  } catch (error) {
    console.error(chalk.red("\nError:"), error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (cache) {
      await cache.close();
    }
  }
}
