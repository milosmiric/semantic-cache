---
description: Semantic Cache - LLM query caching with MongoDB Atlas Vector Search
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: true
---

# Semantic Cache

LLM query caching system using semantic similarity matching. Reduces API costs and latency by returning cached responses for semantically similar queries.

## Project Architecture

```
Query → VoyageAI Embedding → MongoDB Vector Search → Cache Hit? → Return cached / Call LLM
```

### Technology Stack
- **MongoDB Atlas Vector Search** - Stores embeddings, performs cosine similarity search
- **VoyageAI** - Generates 1024-dimensional embeddings (voyage-3 model)
- **OpenAI** - LLM completions for cache misses
- **LangChain** - OpenAI integration wrapper

### Key Components

| File | Purpose |
|------|---------|
| `src/lib/cache/semantic-cache.ts` | Core cache orchestration |
| `src/lib/storage/mongodb.ts` | MongoDB Atlas Vector Store |
| `src/lib/embeddings/voyage.ts` | VoyageAI native SDK integration |
| `src/lib/llm/openai.ts` | LangChain OpenAI wrapper |
| `src/lib/config.ts` | Environment configuration |
| `src/lib/types.ts` | TypeScript type definitions |
| `src/cli/index.ts` | CLI entry point |

### Data Flow
1. User submits query
2. VoyageAI generates 1024-dim embedding vector
3. MongoDB `$vectorSearch` finds similar cached queries
4. If similarity >= threshold (default 0.85), return cached response
5. Otherwise, call OpenAI LLM, cache result, return response

## Configuration

Environment variables (auto-loaded by Bun from `.env`):

| Variable | Description |
|----------|-------------|
| `MONGODB_ATLAS_URI` | MongoDB connection string |
| `MONGODB_ATLAS_DB_NAME` | Database name |
| `MONGODB_ATLAS_COLLECTION_NAME` | Collection for cache entries |
| `MONGODB_ATLAS_EMBEDDINGS_FIELD_NAME` | Field storing vectors (default: `embedding`) |
| `VECTOR_SEARCH_INDEX_NAME` | Atlas index name (default: `default`) |
| `VOYAGEAI_API_KEY` | VoyageAI API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `LLM_MODEL` | OpenAI model (default: `gpt-5-mini`) |
| `SIMILARITY_THRESHOLD` | Cache hit threshold 0-1 (default: `0.85`) |

### MongoDB Atlas Vector Search Index

Required index definition on the collection:
```json
{
  "fields": [{
    "type": "vector",
    "path": "embedding",
    "numDimensions": 1024,
    "similarity": "cosine"
  }]
}
```

## CLI Commands

```bash
bun run demo                    # Interactive demonstration
bun run cli query "question"    # Query with caching
bun run cli stats               # Cache statistics
bun run cli clear               # Clear all cache entries
```

## Library Usage

```typescript
import { SemanticCache, loadConfigFromEnv } from "./src/lib";

const cache = SemanticCache.fromConfig(loadConfigFromEnv());
const result = await cache.query("What is the capital of France?");

console.log(result.response);      // "Paris..."
console.log(result.fromCache);     // true/false
console.log(result.similarityScore); // 0.97 (if cache hit)

await cache.close();
```

---

## Bun Runtime

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

### Bun APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

### Testing

Use `bun test` to run tests.

```ts
import { test, expect } from "bun:test";

test("cache hit returns correct response", async () => {
  // test implementation
});
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
