# Semantic Cache

A demonstration of semantic caching for LLM queries using MongoDB Atlas Vector Search, VoyageAI embeddings, and OpenAI.

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
             response            │   OpenAI    │
                                 │     LLM     │
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

### Demo Command

Run an interactive demonstration:

```bash
bun run demo
```

## Library Usage

Use the semantic cache library in your own code:

```typescript
import { SemanticCache, loadConfigFromEnv } from "@milosmiric/semantic-cache";

// Load configuration from environment
const config = loadConfigFromEnv();

// Create cache instance
const cache = SemanticCache.fromConfig(config);

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

### Advanced Usage

For more control, you can use the individual components:

```typescript
import {
  VoyageEmbeddings,
  MongoDBVectorStore,
  OpenAILLM,
  SemanticCache
} from "@milosmiric/semantic-cache";

// Create custom embeddings instance
const embeddings = new VoyageEmbeddings(VOYAGE_API_KEY, "voyage-3");

// Create custom storage
const storage = new MongoDBVectorStore({
  uri: MONGO_URI,
  dbName: "my-db",
  collectionName: "my-cache",
  embeddingFieldName: "embedding",
  vectorSearchIndexName: "default",
  embeddingDimension: 1024,
});

// Create custom LLM
const llm = new OpenAILLM(OPENAI_API_KEY, "gpt-5-mini");

// Assemble cache
const cache = new SemanticCache(embeddings, storage, llm, 0.85);
```

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
│   │   └── openai.ts            # OpenAI LLM wrapper
│   ├── config.ts                # Configuration management
│   ├── types.ts                 # TypeScript type definitions
│   └── index.ts                 # Library exports
└── cli/                    # Command-line interface
    ├── commands/
    │   ├── query.ts             # Query command
    │   ├── stats.ts             # Stats command
    │   └── clear.ts             # Clear command
    └── index.ts                 # CLI entry point
```

## How Semantic Caching Works

1. **Embedding Generation**: When a query arrives, VoyageAI converts it to a dense vector representation (embedding) that captures semantic meaning.

2. **Similarity Search**: MongoDB Atlas Vector Search performs approximate nearest neighbor (ANN) search to find cached queries with similar embeddings.

3. **Threshold Check**: If the similarity score exceeds the configured threshold (default 0.85), the cached response is returned.

4. **Cache Miss Handling**: For cache misses, the query is sent to OpenAI, and both the query embedding and response are stored for future use.

### Why Cosine Similarity?

Cosine similarity measures the angle between two vectors, making it ideal for comparing semantic meaning regardless of vector magnitude. A score of 1.0 means identical direction (semantically equivalent), while 0.0 means orthogonal (completely different).

## Configuration Options

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `MONGODB_ATLAS_URI` | MongoDB connection string | Required |
| `MONGODB_ATLAS_DB_NAME` | Database name | Required |
| `MONGODB_ATLAS_COLLECTION_NAME` | Collection name | Required |
| `MONGODB_ATLAS_EMBEDDINGS_FIELD_NAME` | Field for embeddings | `embedding` |
| `VOYAGEAI_API_KEY` | VoyageAI API key | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `LLM_MODEL` | OpenAI model identifier | `gpt-5-mini` |
| `SIMILARITY_THRESHOLD` | Cache hit threshold (0-1) | `0.85` |
| `VECTOR_SEARCH_INDEX_NAME` | Atlas index name | `default` |

## Performance Considerations

- **Embedding Model**: `voyage-3-lite` (512 dims) is faster and cheaper than `voyage-3` (1024 dims)
- **Similarity Threshold**: Higher values = fewer false positives, lower values = more cache hits
- **Index Configuration**: Ensure proper `numCandidates` for accurate results

## License

MIT
