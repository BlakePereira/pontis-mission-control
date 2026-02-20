-- Migration 010: Add is_tracked column to crm_partners
-- Purpose: Separate Sales Funnel (all prospects) from Partners page (curated active relationships)

-- Step 1: Add is_tracked column
ALTER TABLE crm_partners 
ADD COLUMN IF NOT EXISTS is_tracked BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Set is_tracked = true for existing partners where:
--   - pipeline_status IN ('demo_scheduled', 'demo_done', 'negotiating', 'active') OR
--   - Has interactions in last 30 days OR
--   - Has pending action items

UPDATE crm_partners 
SET is_tracked = true 
WHERE 
  pipeline_status IN ('demo_scheduled', 'demo_done', 'negotiating', 'active')
  OR id IN (
    SELECT DISTINCT partner_id 
    FROM crm_interactions 
    WHERE interaction_date > NOW() - INTERVAL '30 days'
  )
  OR id IN (
    SELECT DISTINCT partner_id 
    FROM crm_action_items 
    WHERE status = 'pending'
  );
