-- ============================================================
-- 012-partner-service-types.sql
-- Extend partner_type to support florist and cleaning partners
-- for S4-014 Map Layer Visualization
-- ============================================================

-- Update partner_type constraint to include florist and cleaning
ALTER TABLE crm_partners
  DROP CONSTRAINT IF EXISTS crm_partners_partner_type_check;

ALTER TABLE crm_partners
  ADD CONSTRAINT crm_partners_partner_type_check
  CHECK (partner_type IN ('monument_company', 'fulfillment_partner', 'florist', 'cleaning'));

-- Add delivery_radius_miles if it doesn't exist (for coverage calculation)
ALTER TABLE crm_partners
  ADD COLUMN IF NOT EXISTS delivery_radius_miles NUMERIC(5,1) DEFAULT NULL;

-- Add latitude/longitude if they don't exist (for map display)
ALTER TABLE crm_partners
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,7) DEFAULT NULL;

ALTER TABLE crm_partners
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,7) DEFAULT NULL;

-- Add is_tracked flag if it doesn't exist (to filter active partners from prospects)
ALTER TABLE crm_partners
  ADD COLUMN IF NOT EXISTS is_tracked BOOLEAN DEFAULT TRUE;

-- Create indexes for map queries
CREATE INDEX IF NOT EXISTS idx_crm_partners_latitude ON crm_partners(latitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_partners_longitude ON crm_partners(longitude) WHERE longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_partners_is_tracked ON crm_partners(is_tracked);

COMMENT ON COLUMN crm_partners.partner_type IS 'Partner category: monument_company, fulfillment_partner (legacy), florist, cleaning';
COMMENT ON COLUMN crm_partners.delivery_radius_miles IS 'Service coverage radius in miles (for florist and cleaning partners)';
COMMENT ON COLUMN crm_partners.is_tracked IS 'Whether this partner is actively tracked (vs sales prospect)';
