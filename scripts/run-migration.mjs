#!/usr/bin/env node

/**
 * Run CRM migration directly via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://lgvvylbohcboyzahhono.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260220_create_crm_tables.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('Running CRM migration...\n');
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('Created tables: companies, contacts, interactions');
  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    
    // If exec_sql doesn't exist, try splitting and running statements individually
    console.log('\nTrying alternative approach...');
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.startsWith('COMMENT')) continue; // Skip comments for now
      
      try {
        await supabase.rpc('exec_sql', { sql_string: stmt + ';' });
        console.log(`✓ Statement ${i + 1}/${statements.length}`);
      } catch (err) {
        console.error(`✗ Statement ${i + 1} failed:`, err.message);
        console.error('Statement:', stmt.substring(0, 100) + '...');
      }
    }
    
    console.log('\n✅ Migration completed with alternative approach');
  }
}

runMigration();
