-- Create setup_flow_events table for family onboarding analytics
-- From Sprint 3 (S3-013) setup flow tracking

CREATE TABLE IF NOT EXISTS setup_flow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('step_view', 'step_complete', 'decision', 'error', 'completion')),
  step_name TEXT CHECK (step_name IN ('basics', 'first-memory', 'preview', 'invite-family', 'flowers', 'cleaning')),
  decision TEXT CHECK (decision IN ('flowers_yes', 'flowers_no', 'cleaning_yes', 'cleaning_no', 'invite_yes', 'invite_no')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_setup_events_memorial ON setup_flow_events(memorial_id);
CREATE INDEX IF NOT EXISTS idx_setup_events_type ON setup_flow_events(event_type);
CREATE INDEX IF NOT EXISTS idx_setup_events_created ON setup_flow_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setup_events_step ON setup_flow_events(step_name);

-- Enable Row Level Security (optional, adjust based on your auth requirements)
ALTER TABLE setup_flow_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access" ON setup_flow_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create policy to allow authenticated users to read their own data (optional)
CREATE POLICY "Users can read their memorial events" ON setup_flow_events
  FOR SELECT
  USING (true); -- Adjust based on your auth requirements

-- Add some sample data for testing (remove in production)
-- INSERT INTO setup_flow_events (memorial_id, event_type, step_name, metadata) VALUES
-- (gen_random_uuid(), 'step_view', 'basics', '{"device_type": "mobile"}'::jsonb),
-- (gen_random_uuid(), 'step_complete', 'basics', '{"device_type": "mobile"}'::jsonb);
