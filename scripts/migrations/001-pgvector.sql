-- Migration 001: Enable pgvector + add embedding/entities columns
-- Run this in the Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (768 dimensions = Jina AI jina-embeddings-v2-base-en)
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Add entities column for extracted entities (companies, people, concepts)
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS entities jsonb DEFAULT '{}';

-- Create IVFFlat index for fast cosine similarity search
-- NOTE: You need at least ~1000 rows before this index helps much.
-- For small datasets it still works but won't be faster than seq scan.
CREATE INDEX IF NOT EXISTS knowledge_items_embedding_idx
ON knowledge_items USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
