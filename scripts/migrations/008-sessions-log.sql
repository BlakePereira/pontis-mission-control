-- Migration 008: sessions_log table
-- Track per-session summaries for the Sessions page in Mission Control

CREATE TABLE IF NOT EXISTS sessions_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE,
  session_id TEXT,
  label TEXT,
  kind TEXT DEFAULT 'other',
  display_name TEXT,
  channel TEXT,
  model TEXT,
  total_tokens INTEGER DEFAULT 0,
  last_message TEXT,
  last_role TEXT,
  status TEXT DEFAULT 'idle',
  started_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  duration_ms INTEGER,
  cost_total NUMERIC(10,6) DEFAULT 0,
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_log_last_active ON sessions_log(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_log_kind ON sessions_log(kind);
CREATE INDEX IF NOT EXISTS idx_sessions_log_status ON sessions_log(status);

ALTER TABLE sessions_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'sessions_log' AND policyname = 'service role full access'
  ) THEN
    CREATE POLICY "service role full access" ON sessions_log USING (true) WITH CHECK (true);
  END IF;
END $$;
