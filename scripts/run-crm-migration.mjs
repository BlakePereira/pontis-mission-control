#!/usr/bin/env node

/**
 * Run CRM migration using pg client
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString = 'postgresql://postgres.lgvvylbohcboyzahhono:Clara2026Mission!@aws-0-us-west-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✓ Connected to database\n');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260220_create_crm_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running CRM migration...\n');
    
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  - companies (monument companies & prospects)');
    console.log('  - contacts (individual people at companies)');
    console.log('  - interactions (calls, emails, visits, etc.)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
