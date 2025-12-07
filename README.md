# Semantic Cache

A demonstration of semantic caching for LLM queries using MongoDB Atlas Vector Search, VoyageAI embeddings, and Vercel AI SDK (supporting OpenAI, Anthropic, Google, and more).

## Overview

Semantic caching improves LLM application performance by caching responses based on the semantic meaning of queries rather than exact text matches. This allows cache hits for paraphrased or similarly-worded questions.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Query                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VoyageAI Embeddings                           │
│              Generate vector representation                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                MongoDB Atlas Vector Search                       │
│              Find semantically similar queries                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              Cache HIT           Cache MISS
                    │                   │
                    ▼                   ▼
           Return cached         ┌─────────────┐
             response            │  LLM (via   │
                                 │ Vercel AI)  │
                                 └─────────────┘
                                        │
                                        ▼
                                 Cache response
                                 for future use
```

## Prerequisites

1. **MongoDB Atlas Cluster** (M10+ tier for Vector Search)
2. **VoyageAI API Key** - [Get one here](https://www.voyageai.com/)
3. **OpenAI API Key** - [Get one here](https://platform.openai.com/)
4. **Bun** - [Install Bun](https://bun.sh/)

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Create a `.env` file with the following:

```env
MONGODB_ATLAS_URI="mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority"
MONGODB_ATLAS_DB_NAME="semantic-cache-db"
MONGODB_ATLAS_COLLECTION_NAME="semantic-cache-store"
MONGODB_ATLAS_EMBEDDINGS_FIELD_NAME="embedding"
VOYAGEAI_API_KEY="your-voyageai-key"
OPENAI_API_KEY="your-openai-key"
LLM_MODEL="gpt-5-mini"
SIMILARITY_THRESHOLD="0.85"
VECTOR_SEARCH_INDEX_NAME="default"
```

### 3. Create Atlas Vector Search Index

In the MongoDB Atlas UI, navigate to your cluster and create a Vector Search Index on your collection with this definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    }
  ]
}
```

**Important:**
- The `numDimensions` must match VoyageAI model output (1024 for `voyage-3`, 512 for `voyage-3-lite`)
- The `path` must match `MONGODB_ATLAS_EMBEDDINGS_FIELD_NAME` in your `.env`
- Index name must match `VECTOR_SEARCH_INDEX_NAME` (default: `default`)

## CLI Usage

### Query Command

Send a query through the semantic cache:

```bash
# Basic query
bun run cli query "What is the capital of France?"

# With custom similarity threshold
bun run cli query "What is the capital of France?" --threshold 0.9

# With verbose output
bun run cli query "What is the capital of France?" --verbose
```

### Stats Command

View cache statistics:

```bash
bun run cli stats
```

### Clear Command

Clear all cached entries:

```bash
# With confirmation prompt
bun run cli clear

# Skip confirmation
bun run cli clear --force
```

### Demo Commands

Run interactive demonstrations:

```bash
# Basic semantic caching demo
bun run demo

# Structured output demo with Zod schemas
bun run cli demo-structured
```

## Library Usage

Use the semantic cache library in your own code:

```typescript
import {
  SemanticCache,
  VoyageEmbeddings,
  MongoDBVectorStore,
  VercelAILLM,
} from "@milosmiric/semantic-cache";
import { openai } from "@ai-sdk/openai";

// Create the cache with your own configured components
const cache = new SemanticCache(
  new VoyageEmbeddings("your-voyage-api-key"),
  new MongoDBVectorStore({
    uri: "mongodb+srv://...",
    dbName: "my-app",
    collectionName: "llm-cache",
    embeddingFieldName: "embedding",
    vectorSearchIndexName: "default",
    embeddingDimension: 1024,
  }),
  new VercelAILLM(openai("gpt-5-mini"))
);

// Query with automatic caching
const result = await cache.query("What is the capital of France?");

console.log(result.response);      // "Paris is the capital..."
console.log(result.fromCache);     // false (first query)
console.log(result.totalTimeMs);   // 1234

// Similar query will hit cache
const result2 = await cache.query("Tell me the capital of France");

console.log(result2.fromCache);        // true
console.log(result2.similarityScore);  // 0.94

// Clean up
await cache.close();
```

### Using Different LLM Providers

The library uses Vercel AI SDK, supporting any LLM provider:

```typescript
import { SemanticCache, VoyageEmbeddings, MongoDBVectorStore, VercelAILLM } from "@milosmiric/semantic-cache";
import { openai } from "@ai-sdk/openai";       // bun add @ai-sdk/openai
import { anthropic } from "@ai-sdk/anthropic"; // bun add @ai-sdk/anthropic
import { google } from "@ai-sdk/google";       // bun add @ai-sdk/google

// Create shared components
const embeddings = new VoyageEmbeddings("your-voyage-api-key");
const storage = new MongoDBVectorStore({ /* config */ });

// Use OpenAI GPT-5
const openaiCache = new SemanticCache(
  embeddings,
  storage,
  new VercelAILLM(openai("gpt-5-mini"))
);

// Use Anthropic Claude
const claudeCache = new SemanticCache(
  embeddings,
  storage,
  new VercelAILLM(anthropic("claude-sonnet-4-20250514"))
);

// Use Google Gemini
const geminiCache = new SemanticCache(
  embeddings,
  storage,
  new VercelAILLM(google("gemini-2.0-flash"))
);

// All caches work the same way
const result = await claudeCache.query("Explain quantum computing");
```

Available providers (install separately):
| Provider | Package | Example Model |
|----------|---------|---------------|
| OpenAI | `@ai-sdk/openai` | `openai("gpt-5-mini")` |
| Anthropic | `@ai-sdk/anthropic` | `anthropic("claude-sonnet-4-20250514")` |
| Google | `@ai-sdk/google` | `google("gemini-2.0-flash")` |
| Mistral | `@ai-sdk/mistral` | `mistral("mistral-large-latest")` |
| AWS Bedrock | `@ai-sdk/amazon-bedrock` | Various models |
| Azure | `@ai-sdk/azure` | Azure-hosted models |

### Structured Output with Zod

Get type-safe responses using Zod schemas:

```typescript
import { SemanticCache, VoyageEmbeddings, MongoDBVectorStore, VercelAILLM, z } from "@milosmiric/semantic-cache";
import { openai } from "@ai-sdk/openai";

const cache = new SemanticCache(
  new VoyageEmbeddings("your-voyage-api-key"),
  new MongoDBVectorStore({ /* config */ }),
  new VercelAILLM(openai("gpt-5-mini"))
);

// Define a schema for structured responses
const CapitalSchema = z.object({
  city: z.string().describe("The capital city name"),
  country: z.string().describe("The country name"),
  population: z.number().optional().describe("Population if known"),
});

// Query with schema - response is typed!
const result = await cache.query("What is the capital of France?", {
  schema: CapitalSchema,
});

// TypeScript knows the shape of result.response
console.log(result.response.city);       // "Paris"
console.log(result.response.country);    // "France"
console.log(result.response.population); // 2161000

// Same query without schema returns string
const stringResult = await cache.query("What is the capital of France?");
console.log(stringResult.response); // "The capital of France is Paris..."

await cache.close();
```

Schema-aware caching ensures that the same query with different schemas creates separate cache entries, preventing type mismatches.

### Configuration Options

Pass options to customize cache behavior:

```typescript
const cache = new SemanticCache(
  embeddings,
  storage,
  llm,
  {
    similarityThreshold: 0.9, // Higher = stricter matching (default: 0.85)
  }
);

// Or update threshold at runtime
cache.setThreshold(0.8);
```

### Using in Next.js

Example of using the semantic cache in a Next.js API route:

```typescript
// app/api/chat/route.ts
import { SemanticCache, VoyageEmbeddings, MongoDBVectorStore, VercelAILLM } from "@milosmiric/semantic-cache";
import { openai } from "@ai-sdk/openai";

// Create cache instance (consider connection pooling in production)
const cache = new SemanticCache(
  new VoyageEmbeddings(process.env.VOYAGE_API_KEY!),
  new MongoDBVectorStore({
    uri: process.env.MONGODB_URI!,
    dbName: "myapp",
    collectionName: "llm-cache",
    embeddingFieldName: "embedding",
    vectorSearchIndexName: "default",
    embeddingDimension: 1024,
  }),
  new VercelAILLM(openai("gpt-5-mini"))
);

export async function POST(request: Request) {
  const { query } = await request.json();
  const result = await cache.query(query);

  return Response.json({
    response: result.response,
    fromCache: result.fromCache,
    timeMs: result.totalTimeMs,
  });
}
```

This abstraction enables:
- Switching between LLM providers without changing cache logic
- Using your existing API keys (no new accounts needed)
- Testing with mock LLM implementations
- Supporting multiple LLM backends in the same application

## Project Structure

```
src/
├── lib/                    # Reusable library components
│   ├── cache/
│   │   └── semantic-cache.ts    # Core semantic cache implementation
│   ├── embeddings/
│   │   └── voyage.ts            # VoyageAI embeddings service
│   ├── storage/
│   │   └── mongodb.ts           # MongoDB Atlas Vector Store
│   ├── llm/
│   │   └── vercel-ai.ts         # Vercel AI SDK LLM adapter
│   ├── types.ts                 # TypeScript type definitions
│   └── index.ts                 # Library exports
└── cli/                    # Command-line interface
    ├── commands/
    │   ├── query.ts             # Query command
    │   ├── stats.ts             # Stats command
    │   └── clear.ts             # Clear command
    ├── config.ts                # CLI configuration (env vars)
    └── index.ts                 # CLI entry point
```

## Testing

The project includes comprehensive unit and integration tests using Bun's built-in test runner.

### Running Tests

```bash
# Run all tests
bun test

# Run tests with coverage report
bun test --coverage

# Run specific test file
bun test src/__tests__/semantic-cache.test.ts
```

### Test Coverage

The test suite includes:
- **Unit tests** for all components (SemanticCache, VoyageEmbeddings, VercelAILLM, MongoDBVectorStore)
- **Integration tests** verifying end-to-end caching workflows
- **Mock implementations** for external services (embedding provider, LLM, vector store)

Note: External service providers (VoyageAI, OpenAI, MongoDB) have lower coverage because actual API calls require valid credentials. The core `SemanticCache` class has >90% line coverage.

### Test Structure

```
src/__tests__/
├── mocks.ts               # Mock implementations for testing
├── semantic-cache.test.ts # Core cache functionality tests
├── voyage.test.ts         # VoyageAI embeddings tests
├── vercel-ai.test.ts      # Vercel AI SDK LLM tests
├── mongodb.test.ts        # MongoDB Vector Store tests
├── config.test.ts         # CLI configuration tests
└── integration.test.ts    # End-to-end integration tests
```

## How Semantic Caching Works

1. **Embedding Generation**: When a query arrives, VoyageAI converts it to a dense vector representation (embedding) that captures semantic meaning.

2. **Similarity Search**: MongoDB Atlas Vector Search performs approximate nearest neighbor (ANN) search to find cached queries with similar embeddings.

3. **Threshold Check**: If the similarity score exceeds the configured threshold (default 0.85), the cached response is returned.

4. **Cache Miss Handling**: For cache misses, the query is sent to the configured LLM, and both the query embedding and response are stored for future use.

### Why Cosine Similarity?

Cosine similarity measures the angle between two vectors, making it ideal for comparing semantic meaning regardless of vector magnitude. A score of 1.0 means identical direction (semantically equivalent), while 0.0 means orthogonal (completely different).

## CLI Configuration

The CLI uses environment variables for configuration. When using the library directly, you configure each component with your own values.

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `MONGODB_ATLAS_URI` | MongoDB connection string | Required |
| `MONGODB_ATLAS_DB_NAME` | Database name | Required |
| `MONGODB_ATLAS_COLLECTION_NAME` | Collection name | Required |
| `MONGODB_ATLAS_EMBEDDINGS_FIELD_NAME` | Field for embeddings | `embedding` |
| `VOYAGEAI_API_KEY` | VoyageAI API key | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `LLM_MODEL` | LLM model identifier | `gpt-5-mini` |
| `SIMILARITY_THRESHOLD` | Cache hit threshold (0-1) | `0.85` |
| `VECTOR_SEARCH_INDEX_NAME` | Atlas index name | `default` |

## Performance Considerations

- **Embedding Model**: `voyage-3-lite` (512 dims) is faster and cheaper than `voyage-3` (1024 dims)
- **Similarity Threshold**: Higher values = fewer false positives, lower values = more cache hits
- **Index Configuration**: Ensure proper `numCandidates` for accurate results

## License

MIT
