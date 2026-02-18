-- Migration 005: Enable Supabase Realtime for agent_activity table
-- Must run AFTER 004-agent-activity.sql
-- Status: Already applied manually (Feb 17, 2026)
-- Note: To apply via Supabase dashboard → Database → Publications → supabase_realtime → Add table

ALTER PUBLICATION supabase_realtime ADD TABLE agent_activity;
