-- ============================================================
-- 009-partner-crm.sql
-- Partner/Monument Company CRM tables
-- ============================================================

-- ─── crm_partners ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_partners (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  address                 TEXT,
  city                    TEXT,
  state                   TEXT,
  zip                     TEXT,
  territory               TEXT,
  website                 TEXT,
  phone                   TEXT,
  email                   TEXT,
  pipeline_status         TEXT NOT NULL DEFAULT 'prospect'
                            CHECK (pipeline_status IN (
                              'prospect','warm','demo_scheduled','demo_done',
                              'negotiating','active','inactive','lost'
                            )),
  lead_source             TEXT
                            CHECK (lead_source IN (
                              'cold_outreach','referral','inbound','event','research'
                            ) OR lead_source IS NULL),
  total_medallions_ordered INTEGER NOT NULL DEFAULT 0,
  mrr                     NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_contact_at         TIMESTAMPTZ,
  next_action             TEXT,
  next_action_due         TIMESTAMPTZ,
  next_action_assignee    TEXT,
  health_score            INTEGER NOT NULL DEFAULT 100,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── crm_contacts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_contacts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id               UUID NOT NULL REFERENCES crm_partners(id) ON DELETE CASCADE,
  name                     TEXT NOT NULL,
  role                     TEXT,
  phone                    TEXT,
  email                    TEXT,
  preferred_contact_method TEXT NOT NULL DEFAULT 'email',
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── crm_interactions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_interactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       UUID NOT NULL REFERENCES crm_partners(id) ON DELETE CASCADE,
  contact_id       UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  type             TEXT NOT NULL
                     CHECK (type IN ('email','call','text','meeting','demo','site_visit','note')),
  direction        TEXT CHECK (direction IN ('inbound','outbound') OR direction IS NULL),
  summary          TEXT NOT NULL,
  outcome          TEXT CHECK (outcome IN ('positive','neutral','negative') OR outcome IS NULL),
  logged_by        TEXT,
  raw_note         TEXT,
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── crm_action_items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_action_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id   UUID NOT NULL REFERENCES crm_partners(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  due_date     TIMESTAMPTZ,
  priority     TEXT NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('low','medium','high','urgent')),
  assignee     TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','completed','overdue')),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_partners_pipeline_status ON crm_partners(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_crm_partners_last_contact_at ON crm_partners(last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_partners_health_score    ON crm_partners(health_score);
CREATE INDEX IF NOT EXISTS idx_crm_action_items_status      ON crm_action_items(status);
CREATE INDEX IF NOT EXISTS idx_crm_action_items_due_date    ON crm_action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_partner_id  ON crm_interactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_date        ON crm_interactions(interaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_partner_id      ON crm_contacts(partner_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE crm_partners      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_action_items  ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
DO $$
BEGIN
  -- crm_partners
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_partners' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON crm_partners
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- crm_contacts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_contacts' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON crm_contacts
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- crm_interactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_interactions' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON crm_interactions
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  -- crm_action_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_action_items' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON crm_action_items
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION crm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_crm_partners_updated_at ON crm_partners;
CREATE TRIGGER set_crm_partners_updated_at
  BEFORE UPDATE ON crm_partners
  FOR EACH ROW EXECUTE FUNCTION crm_update_updated_at();
