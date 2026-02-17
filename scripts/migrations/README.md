# Knowledge Base Migrations

## How to Run

1. Go to the [Supabase SQL Editor](https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql)
2. Run each migration file **in order** by pasting the contents and clicking **Run**

## Migrations

### 001-pgvector.sql
- Enables the `vector` extension
- Adds `embedding vector(768)` column to `knowledge_items`
- Adds `entities jsonb` column to `knowledge_items`
- Creates an IVFFlat index for cosine similarity search

### 002-match-function.sql
- Creates the `match_knowledge_items()` RPC function used by semantic search
- Must be run **after** 001-pgvector.sql

## Notes
- Run 001 first, then 002
- After running, new items ingested will automatically get embeddings (requires `JINA_API_KEY` env var in Vercel)
- Old items won't have embeddings until re-ingested; semantic search falls back to text search for those
