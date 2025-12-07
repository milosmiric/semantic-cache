/**
 * Demo Structured Command
 *
 * Handles the 'demo-structured' command for the semantic cache CLI.
 * Demonstrates structured output with Zod schemas.
 */

import chalk from "chalk";
import { SemanticCache, z } from "@/lib";
import { loadConfigFromEnv, createCacheFromConfig } from "@/cli/config";

/**
 * Small delay helper to allow vector search index to update.
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Demonstrate structured output with Zod schemas.
 */
export async function demoStructuredCommand(): Promise<void> {
  console.log(chalk.cyan.bold("\n Structured Output Demonstration\n"));
  console.log(chalk.gray("This demo shows how to use Zod schemas for typed responses."));
  console.log(chalk.gray("The same query with different schemas creates separate cache entries.\n"));
  console.log(chalk.gray("─".repeat(50)));

  // Define schemas
  const SimpleAnswerSchema = z.object({
    answer: z.string().describe("The direct answer to the question"),
  });

  const DetailedAnswerSchema = z.object({
    answer: z.string().describe("The direct answer"),
    explanation: z.string().describe("Brief explanation"),
    confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
  });

  let cache: SemanticCache | null = null;

  try {
    const config = loadConfigFromEnv();
    cache = createCacheFromConfig(config);

    const query = "What is the largest planet in our solar system?";

    // Test 1: Simple schema
    console.log(chalk.white.bold("\n[1/4] Simple Schema Query:"));
    console.log(chalk.yellow(`  "${query}"`));
    console.log(chalk.gray("  Schema: { answer: string }"));

    const simple1 = await cache.query(query, { schema: SimpleAnswerSchema });

    if (simple1.fromCache) {
      console.log(
        chalk.green(`  Status: CACHE HIT (${(simple1.similarityScore! * 100).toFixed(1)}% similar)`)
      );
    } else {
      console.log(chalk.blue("  Status: CACHE MISS (response cached)"));
    }
    console.log(chalk.gray(`  Time: ${simple1.totalTimeMs.toFixed(0)}ms`));
    console.log(chalk.white(`  Response: ${JSON.stringify(simple1.response)}`));

    // Small delay to allow vector search index to update
    await delay(500);

    // Test 2: Same query, same schema (should hit cache)
    console.log(chalk.white.bold("\n[2/4] Same Query, Same Schema:"));
    console.log(chalk.yellow(`  "Tell me the biggest planet in the solar system"`));
    console.log(chalk.gray("  Schema: { answer: string }"));

    const simple2 = await cache.query("Tell me the biggest planet in the solar system", {
      schema: SimpleAnswerSchema,
    });

    if (simple2.fromCache) {
      console.log(
        chalk.green(`  Status: CACHE HIT (${(simple2.similarityScore! * 100).toFixed(1)}% similar)`)
      );
    } else {
      console.log(chalk.blue("  Status: CACHE MISS (response cached)"));
    }
    console.log(chalk.gray(`  Time: ${simple2.totalTimeMs.toFixed(0)}ms`));
    console.log(chalk.white(`  Response: ${JSON.stringify(simple2.response)}`));

    await delay(500);

    // Test 3: Same query, different schema (should miss cache)
    console.log(chalk.white.bold("\n[3/4] Same Query, Different Schema:"));
    console.log(chalk.yellow(`  "${query}"`));
    console.log(chalk.gray("  Schema: { answer, explanation, confidence }"));

    const detailed1 = await cache.query(query, { schema: DetailedAnswerSchema });

    if (detailed1.fromCache) {
      console.log(
        chalk.green(`  Status: CACHE HIT (${(detailed1.similarityScore! * 100).toFixed(1)}% similar)`)
      );
    } else {
      console.log(chalk.blue("  Status: CACHE MISS (different schema = new cache entry)"));
    }
    console.log(chalk.gray(`  Time: ${detailed1.totalTimeMs.toFixed(0)}ms`));
    console.log(chalk.white(`  Response:`));
    console.log(chalk.white(`    answer: "${detailed1.response.answer}"`));
    console.log(chalk.white(`    explanation: "${detailed1.response.explanation}"`));
    console.log(chalk.white(`    confidence: ${detailed1.response.confidence}`));

    await delay(500);

    // Test 4: Similar query, detailed schema (should hit cache)
    console.log(chalk.white.bold("\n[4/4] Similar Query, Same Detailed Schema:"));
    console.log(chalk.yellow(`  "Which planet is the largest?"`));
    console.log(chalk.gray("  Schema: { answer, explanation, confidence }"));

    const detailed2 = await cache.query("Which planet is the largest?", {
      schema: DetailedAnswerSchema,
    });

    if (detailed2.fromCache) {
      console.log(
        chalk.green(`  Status: CACHE HIT (${(detailed2.similarityScore! * 100).toFixed(1)}% similar)`)
      );
    } else {
      console.log(chalk.blue("  Status: CACHE MISS (response cached)"));
    }
    console.log(chalk.gray(`  Time: ${detailed2.totalTimeMs.toFixed(0)}ms`));
    console.log(chalk.white(`  Response:`));
    console.log(chalk.white(`    answer: "${detailed2.response.answer}"`));
    console.log(chalk.white(`    explanation: "${detailed2.response.explanation}"`));
    console.log(chalk.white(`    confidence: ${detailed2.response.confidence}`));

    console.log(chalk.gray("\n" + "─".repeat(50)));
    console.log(chalk.cyan.bold("\nDemonstration Complete!"));
    console.log(chalk.gray("Key observations:"));
    console.log(chalk.gray("  - Query 2 hit cache (same schema as Query 1)"));
    console.log(chalk.gray("  - Query 3 missed cache (different schema)"));
    console.log(chalk.gray("  - Query 4 hit cache (same schema as Query 3)"));
    console.log(chalk.gray("\nStructured output enables type-safe caching with Zod schemas.\n"));
  } catch (error) {
    console.error(chalk.red("\nError:"), error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    if (cache) {
      await cache.close();
    }
  }
}
