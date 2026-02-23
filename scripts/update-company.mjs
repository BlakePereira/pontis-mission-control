#!/usr/bin/env node

/**
 * Update a company record in the CRM
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lgvvylbohcboyzahhono.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function updateCompany() {
  const companyName = 'Nu-Art Memorial';
  
  // Find the company
  const { data: company, error: findError } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', '%Nu-Art%')
    .single();
  
  if (findError || !company) {
    console.error('Company not found:', findError);
    process.exit(1);
  }
  
  console.log('Found company:', company.name);
  
  // Update with new intel
  const { error: updateError } = await supabase
    .from('companies')
    .update({
      pipeline_status: 'Qualified',
      notes: `${company.notes || ''}\n\n[Blake update 2/23/26] Bott family company. Does 2,000-3,000 monuments/year - BIG potential client. Will eventually meet with them.`.trim(),
      metadata: {
        ...company.metadata,
        annual_volume: '2000-3000 monuments',
        family_connection: 'Bott family',
        priority: 'high',
        updated_by: 'Blake',
        updated_at: new Date().toISOString()
      },
      last_contact_at: new Date().toISOString()
    })
    .eq('id', company.id);
  
  if (updateError) {
    console.error('Update failed:', updateError);
    process.exit(1);
  }
  
  // Log interaction
  const { error: interactionError } = await supabase
    .from('interactions')
    .insert({
      company_id: company.id,
      type: 'note',
      subject: 'High-value prospect identified',
      notes: 'Bott family company doing 2,000-3,000 monuments/year. Big potential client. Will schedule meeting.',
      created_by: 'Blake',
      metadata: {
        source: 'Sales Funnel chat',
        priority: 'high'
      }
    });
  
  if (interactionError) {
    console.error('Interaction log failed:', interactionError);
  }
  
  console.log('✅ Updated Nu-Art Memorial:');
  console.log('  - Pipeline: Qualified (high priority)');
  console.log('  - Volume: 2,000-3,000 monuments/year');
  console.log('  - Family: Bott family connection');
  console.log('  - Interaction logged');
}

updateCompany();
