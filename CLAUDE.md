# Semantic Cache

LLM query caching using semantic similarity. Reduces API costs by returning cached responses for similar queries.

## Architecture

```
Query → VoyageAI Embedding → MongoDB Vector Search → Cache Hit? → Return cached / Call LLM
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/cache/semantic-cache.ts` | Core cache orchestration |
| `src/lib/storage/mongodb.ts` | MongoDB Atlas Vector Store |
| `src/lib/embeddings/voyage.ts` | VoyageAI embeddings (voyage-3.5) |
| `src/lib/llm/vercel-ai.ts` | Vercel AI SDK adapter (any provider) |
| `src/lib/types.ts` | TypeScript interfaces |
| `src/cli/config.ts` | CLI env var configuration |

## Stack

- **MongoDB Atlas Vector Search** - Vector storage + cosine similarity
- **VoyageAI** - Embeddings (voyage-3.5, 1024 dims)
- **Vercel AI SDK** - LLM completions (OpenAI, Anthropic, Google, etc.)
- **Zod** - Structured output schemas

## CLI vs Library

- **CLI**: Uses env vars via `src/cli/config.ts`
- **Library**: Components configured directly (no env vars required)

## Development Notes

- **Path aliases**: Use `@/` for imports (e.g., `@/lib/types`, `@/cli/config`)
- **Build**: `bun run build` uses tsdown, outputs to `dist/`
- **Tests**: Mocks in `src/__tests__/mocks.ts` for testing without external services
- **Pluggable**: `EmbeddingProvider`, `VectorStore`, `LLMProvider` interfaces in `types.ts`
- **Schema-aware caching**: Same query + different Zod schema = separate cache entries

---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.
