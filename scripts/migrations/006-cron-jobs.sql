CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  schedule_kind TEXT,
  schedule_expr TEXT,
  schedule_every_ms BIGINT,
  schedule_tz TEXT,
  payload_kind TEXT,
  session_target TEXT,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_status TEXT,
  last_duration_ms INTEGER,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cron_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access" ON cron_jobs USING (true) WITH CHECK (true);
