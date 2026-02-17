-- Migration 002: Create match_knowledge_items RPC function for semantic search
-- Run this AFTER 001-pgvector.sql
-- Run in Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql

CREATE OR REPLACE FUNCTION match_knowledge_items(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  url text,
  title text,
  type text,
  summary text,
  author text,
  tags text[],
  entities jsonb,
  added_by text,
  added_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ki.id,
    ki.url,
    ki.title,
    ki.type,
    ki.summary,
    ki.author,
    ki.tags,
    ki.entities,
    ki.added_by,
    ki.added_at,
    1 - (ki.embedding <=> query_embedding) AS similarity
  FROM knowledge_items ki
  WHERE ki.embedding IS NOT NULL
    AND 1 - (ki.embedding <=> query_embedding) > match_threshold
  ORDER BY ki.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
