-- Migration 000: Knowledge Items table with full-text search
-- Run this FIRST before all other migrations
-- Status: Already applied manually (Feb 17, 2026)

CREATE TABLE IF NOT EXISTS knowledge_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url text UNIQUE NOT NULL,
  title text,
  type text DEFAULT 'article',
  summary text,
  content text,
  author text,
  tags text[] DEFAULT '{}',
  added_by text,
  added_at timestamptz DEFAULT now(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(summary, '') || ' ' ||
      coalesce(content, '')
    )
  ) STORED
);

CREATE INDEX IF NOT EXISTS knowledge_items_search_idx
  ON knowledge_items USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS knowledge_items_type_idx
  ON knowledge_items(type);

CREATE INDEX IF NOT EXISTS knowledge_items_added_at_idx
  ON knowledge_items(added_at DESC);
