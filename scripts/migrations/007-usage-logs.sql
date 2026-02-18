-- Migration 007: Usage Logs
-- Tracks AI API usage (tokens + cost) per call, collected from OpenClaw session transcripts

CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT,
  session_key TEXT,
  session_kind TEXT DEFAULT 'unknown', -- main, subagent, group, cron, heartbeat
  provider TEXT NOT NULL, -- anthropic, openai, google, xai
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cache_read_tokens INTEGER DEFAULT 0,
  cache_write_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_input NUMERIC(10,6) DEFAULT 0,
  cost_output NUMERIC(10,6) DEFAULT 0,
  cost_cache_read NUMERIC(10,6) DEFAULT 0,
  cost_cache_write NUMERIC(10,6) DEFAULT 0,
  cost_total NUMERIC(10,8) DEFAULT 0,
  stop_reason TEXT,
  recorded_at TIMESTAMPTZ NOT NULL, -- from message timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_recorded_at ON usage_logs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_provider ON usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_usage_logs_model ON usage_logs(model);
CREATE INDEX IF NOT EXISTS idx_usage_logs_session_key ON usage_logs(session_key);

ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access" ON usage_logs
  USING (true)
  WITH CHECK (true);

-- Watermark table to track last-processed timestamps per session file
CREATE TABLE IF NOT EXISTS usage_collector_state (
  session_id TEXT PRIMARY KEY,
  last_processed_timestamp BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usage_collector_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access" ON usage_collector_state
  USING (true)
  WITH CHECK (true);
