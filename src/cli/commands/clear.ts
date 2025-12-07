/**
 * Clear Command
 *
 * Handles the 'clear' command for the semantic cache CLI.
 * Removes all cached entries from the database.
 */

import chalk from "chalk";
import { SemanticCache } from "../../lib";
import { loadConfigFromEnv, createCacheFromConfig } from "../config";

/**
 * Clear all cache entries.
 *
 * @param options - Command options
 */
export async function clearCommand(options: { force?: boolean }): Promise<void> {
  let cache: SemanticCache | null = null;

  try {
    const config = loadConfigFromEnv();
    cache = createCacheFromConfig(config);

    // Get current stats before clearing
    const statsBefore = await cache.getStats();

    if (statsBefore.totalEntries === 0) {
      console.log(chalk.yellow("\nCache is already empty."));
      return;
    }

    if (!options.force) {
      console.log(chalk.yellow(`\nWarning: This will delete ${statsBefore.totalEntries} cache entries.`));
      console.log(chalk.gray("Use --force to skip this confirmation.\n"));

      // Simple confirmation using Bun's prompt
      const response = prompt("Are you sure? (yes/no): ");

      if (response?.toLowerCase() !== "yes" && response?.toLowerCase() !== "y") {
        console.log(chalk.gray("\nOperation cancelled."));
        return;
      }
    }

    console.log(chalk.gray("\nClearing cache..."));

    const deletedCount = await cache.clear();

    console.log(chalk.green(`\nCleared ${deletedCount} cache entries.`));
  } catch (error) {
    console.error(chalk.red("\nError:"), error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (cache) {
      await cache.close();
    }
  }
}
