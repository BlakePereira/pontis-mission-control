import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const migrations = [
    // Companies table
    `CREATE TABLE IF NOT EXISTS companies (
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
    )`,
    
    `CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)`,
    `CREATE INDEX IF NOT EXISTS idx_companies_pipeline_status ON companies(pipeline_status)`,
    `CREATE INDEX IF NOT EXISTS idx_companies_last_contact_at ON companies(last_contact_at)`,
    
    // Contacts table
    `CREATE TABLE IF NOT EXISTS contacts (
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
    )`,
    
    `CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name)`,
    
    // Interactions table
    `CREATE TABLE IF NOT EXISTS interactions (
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
    )`,
    
    `CREATE INDEX IF NOT EXISTS idx_interactions_company_id ON interactions(company_id)`,
    `CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions(contact_id)`,
    `CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(type)`,
    `CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC)`,
    
    // Update trigger function
    `CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql'`,
    
    `DROP TRIGGER IF EXISTS update_companies_updated_at ON companies`,
    `CREATE TRIGGER update_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()`,
    
    `DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts`,
    `CREATE TRIGGER update_contacts_updated_at
      BEFORE UPDATE ON contacts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()`,
  ];

  const results = [];
  const errors = [];

  for (const sql of migrations) {
    try {
      // Execute raw SQL - note: this requires service role key
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql_string: sql })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      results.push({ success: true, sql: sql.substring(0, 50) + '...' });
    } catch (error: any) {
      errors.push({ 
        success: false, 
        sql: sql.substring(0, 50) + '...', 
        error: error.message 
      });
    }
  }

  // Enable RLS (if not already enabled)
  try {
    await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ 
        sql_string: `
          ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
          ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
          ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
        `
      })
    });
  } catch (e) {
    // RLS might already be enabled, ignore errors
  }

  return res.status(200).json({
    success: errors.length === 0,
    results,
    errors,
    message: errors.length === 0 
      ? 'CRM tables created successfully!' 
      : 'Some migrations failed - check errors array'
  });
}
