-- ============================================================
-- 010-partner-type.sql
-- Add partner_type to crm_partners for monument vs fulfillment segmentation
-- ============================================================

ALTER TABLE crm_partners
  ADD COLUMN IF NOT EXISTS partner_type TEXT NOT NULL DEFAULT 'monument_company';

ALTER TABLE crm_partners
  DROP CONSTRAINT IF EXISTS crm_partners_partner_type_check;

ALTER TABLE crm_partners
  ADD CONSTRAINT crm_partners_partner_type_check
  CHECK (partner_type IN ('monument_company', 'fulfillment_partner'));

CREATE INDEX IF NOT EXISTS idx_crm_partners_partner_type ON crm_partners(partner_type);
