# Twitter/X Ingestion Pipeline — Phase 2 Spec
(From Joe's diagram, Feb 17 2026)

## Pipeline (in order):

### 1. FxTwitter API (PRIMARY — free, no auth)
- Endpoint: `https://api.fxtwitter.com/status/{tweet_id}`
- Returns: full tweet text, author, media, quoted tweets
- No API key needed

### 2. X API Direct Lookup (FALLBACK)
- Official Twitter API v2
- Requires Bearer token

### 3. Grok x-search (FALLBACK)
- If both above fail

### 4. Thread Following
- Same-author replies via FxTwitter or TwitterAPI.io
- Walk the full conversation chain
- Collect all tweets in thread order

### 5. Link Detection
- After getting full tweet content, scan for URLs
- If links found → auto-ingest each linked article as a separate knowledge item
- Store `parent_tweet_id` reference on linked items

### 6. Chunk + Embed
- Split content into ~500 token chunks
- Embed each chunk via Jina AI (free, 1M tokens/month)
- Store vectors in Supabase pgvector column

### 7. Store in Knowledge Base
- Full tweet text + metadata
- Thread items linked together
- Linked articles stored separately with back-reference

## Implementation notes:
- FxTwitter tweet ID extraction: `url.match(/\/status\/(\d+)/)`
- FxTwitter endpoint: `https://api.fxtwitter.com/status/{id}`
- Thread: look at `replies` or `conversation_id` in FxTwitter response
- Rate limits: FxTwitter is fairly generous, X API is strict
