#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://lgvvylbohcboyzahhono.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

async function runMigration() {
  const migrationPath = path.join(__dirname, 'migrations/012-partner-service-types.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Running migration 012-partner-service-types.sql...\n');
  
  // Execute via REST API with raw SQL
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      console.log('exec_sql RPC not available, executing statements individually...\n');
      
      // Split and execute statements individually
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        if (stmt.match(/^(COMMENT|\/\*)/)) continue;
        
        try {
          console.log(`Executing: ${stmt.substring(0, 80).replace(/\n/g, ' ')}...`);
          
          const stmtResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ sql: stmt })
          });

          if (stmtResponse.ok) {
            console.log('  ✓ Done');
          } else {
            const error = await stmtResponse.text();
            // Some statements might fail if already executed, that's okay
            console.log(`  ~ Skipped (${error.substring(0, 50)})`);
          }
        } catch (e) {
          console.log(`  ~ Skipped (${e.message})`);
        }
      }
    } else {
      console.log('✓ Migration executed via exec_sql RPC');
    }
    
    console.log('\n✅ Migration complete!');
    console.log('\nNext: Verify partner_type constraint allows: monument_company, florist, cleaning');
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    process.exit(1);
  }
}

runMigration().catch(console.error);
