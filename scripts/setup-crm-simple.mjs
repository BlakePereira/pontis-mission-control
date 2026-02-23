#!/usr/bin/env node

/**
 * Set up CRM tables - Manual SQL for Joe to run
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('📋 CRM SETUP INSTRUCTIONS\n');
console.log('Since we can\'t execute raw SQL remotely, please follow these steps:\n');
console.log('1. Go to https://supabase.com/dashboard/project/lgvvylbohcboyzahhono');
console.log('2. Click "SQL Editor" in the left sidebar');
console.log('3. Click "New Query"');
console.log('4. Copy/paste the SQL below and click "Run"\n');
console.log('=' .repeat(80));
console.log('\n');

const sql = `
-- Create CRM tables for Mission Control

-- Companies table (monument companies, partners, prospects)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  pipeline_status TEXT NOT NULL DEFAULT 'Prospecting',
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  next_action TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_pipeline_status ON companies(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_companies_last_contact_at ON companies(last_contact_at);

-- Contacts table (individual people at companies)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);

-- Interactions table (calls, emails, meetings, etc.)
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  subject TEXT,
  notes TEXT,
  outcome TEXT,
  next_action TEXT,
  created_by TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_company_id ON interactions(company_id);
CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now)
DROP POLICY IF EXISTS "Allow all on companies" ON companies;
CREATE POLICY "Allow all on companies" ON companies FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all on contacts" ON contacts;
CREATE POLICY "Allow all on contacts" ON contacts FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all on interactions" ON interactions;
CREATE POLICY "Allow all on interactions" ON interactions FOR ALL USING (true);
`;

console.log(sql);
console.log('\n' + '='.repeat(80));
console.log('\n✅ After running the SQL, run: node scripts/import-monument-companies.mjs\n');

// Also save to a file Joe can easily access
const sqlPath = path.join(__dirname, '../supabase/migrations/setup-crm.sql');
fs.writeFileSync(sqlPath, sql);
console.log(`📄 SQL also saved to: ${sqlPath}\n`);
