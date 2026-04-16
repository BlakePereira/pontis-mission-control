-- Fix integer overflow in sessions_log table
-- duration_ms and total_tokens can exceed PostgreSQL integer limit (2,147,483,647)
-- Change to bigint to support larger values

-- Change duration_ms from integer to bigint
ALTER TABLE sessions_log ALTER COLUMN duration_ms TYPE bigint;

-- Change total_tokens from integer to bigint  
ALTER TABLE sessions_log ALTER COLUMN total_tokens TYPE bigint;

-- Add comment explaining the change
COMMENT ON COLUMN sessions_log.duration_ms IS 'Session duration in milliseconds (bigint to support >24.8 day sessions)';
COMMENT ON COLUMN sessions_log.total_tokens IS 'Total tokens used in session (bigint to support large accumulated values)';
