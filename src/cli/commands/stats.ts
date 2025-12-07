/**
 * Stats Command
 *
 * Handles the 'stats' command for the semantic cache CLI.
 * Displays cache statistics including entry count, hit rates, and storage usage.
 */

import chalk from "chalk";
import { SemanticCache, loadConfigFromEnv } from "../../lib";

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format date to readable string.
 */
function formatDate(date: Date | undefined): string {
  if (!date) return "N/A";
  return date.toLocaleString();
}

/**
 * Display cache statistics.
 */
export async function statsCommand(): Promise<void> {
  let cache: SemanticCache | null = null;

  try {
    const config = loadConfigFromEnv();
    cache = SemanticCache.fromConfig(config);

    console.log(chalk.cyan.bold("\nSemantic Cache Statistics"));
    console.log(chalk.gray("═".repeat(50)));

    const stats = await cache.getStats();

    console.log();
    console.log(chalk.white("  Total Entries:     ") + chalk.yellow(stats.totalEntries));
    console.log(chalk.white("  Total Cache Hits:  ") + chalk.green(stats.totalHits));
    console.log(chalk.white("  Cache Size:        ") + chalk.blue(formatBytes(stats.cacheSizeBytes)));
    console.log();
    console.log(chalk.white("  Oldest Entry:      ") + chalk.gray(formatDate(stats.oldestEntry)));
    console.log(chalk.white("  Newest Entry:      ") + chalk.gray(formatDate(stats.newestEntry)));
    console.log();

    console.log(chalk.gray("─".repeat(50)));
    console.log(chalk.gray("Configuration:"));
    console.log(chalk.gray(`  Database:   ${config.dbName}`));
    console.log(chalk.gray(`  Collection: ${config.collectionName}`));
    console.log(chalk.gray(`  Threshold:  ${config.similarityThreshold}`));
    console.log(chalk.gray(`  LLM Model:  ${config.llmModel}`));
    console.log();
  } catch (error) {
    console.error(chalk.red("\nError:"), error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (cache) {
      await cache.close();
    }
  }
}
