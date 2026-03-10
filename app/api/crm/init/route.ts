import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Check if tables exist by attempting a query
async function tableExists(table: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  return res.ok;
}

export async function POST() {
  const results: Record<string, string> = {};
  
  // Check crm_activities
  const hasActivities = await tableExists('crm_activities');
  results.crm_activities = hasActivities ? 'exists' : 'MISSING - run migration SQL';

  // Check crm_contacts  
  const hasContacts = await tableExists('crm_contacts');
  results.crm_contacts = hasContacts ? 'exists' : 'MISSING - run migration SQL';

  // Check crm_partners
  const hasPartners = await tableExists('crm_partners');
  results.crm_partners = hasPartners ? 'exists' : 'MISSING';

  const allReady = hasActivities && hasContacts && hasPartners;

  return NextResponse.json({
    ready: allReady,
    tables: results,
    migrationSql: !allReady ? '/scripts/crm-migration.sql' : null,
    message: allReady 
      ? 'All CRM tables ready' 
      : 'Missing tables. Run the migration SQL in Supabase SQL Editor.',
  });
}
