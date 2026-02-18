-- Migration 004: Agent Activity table for War Room live status
-- Status: Already applied manually (Feb 17, 2026)

CREATE TABLE IF NOT EXISTS agent_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'available',
  current_task text,
  updated_at timestamptz DEFAULT now()
);

-- Required for Supabase Realtime to send full row data on changes
ALTER TABLE agent_activity REPLICA IDENTITY FULL;

-- Seed initial agent rows
INSERT INTO agent_activity (agent_name, status, current_task) VALUES
  ('Clara', 'online', 'Orchestrating agent network'),
  ('Opus', 'on-demand', 'On standby — ready to engage'),
  ('Codex', 'available', 'Waiting for next task'),
  ('Gemini', 'available', 'Waiting for next task'),
  ('Sales Scout', 'available', 'Waiting for next task'),
  ('Content Creator', 'available', 'Waiting for next task'),
  ('Analyst', 'available', 'Waiting for next task')
ON CONFLICT (agent_name) DO NOTHING;
