#!/usr/bin/env node

/**
 * Merge Utah monument research with existing CRM data
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://lgvvylbohcboyzahhono.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Geographic regions with cities
const REGIONS = {
  'Wasatch Front North': ['Logan', 'Brigham City', 'Ogden', 'Wellsville', 'Smithfield'],
  'Salt Lake County': ['Salt Lake City', 'Murray', 'Sandy', 'West Jordan', 'South Jordan', 'Taylorsville', 'West Valley City'],
  'Utah County': ['Provo', 'Orem', 'Springville', 'Spanish Fork', 'Payson', 'American Fork', 'Lehi', 'Pleasant Grove', 'Lindon', 'Mapleton'],
  'Wasatch Front South': ['Draper', 'Riverton', 'Herriman', 'Bluffdale', 'Alpine', 'Highland'],
  'Davis/Weber County': ['Layton', 'Bountiful', 'Farmington', 'Kaysville', 'Clearfield'],
  'Central Utah': ['Richfield', 'Price', 'Nephi', 'Delta', 'Manti', 'Ephraim', 'Aurora'],
  'Southern Utah': ['St. George', 'Cedar City', 'Hurricane', 'Washington', 'Ivins', 'Santa Clara'],
  'Eastern Utah': ['Vernal', 'Roosevelt', 'Duchesne'],
  'Wasatch Back': ['Park City', 'Heber City', 'Midway', 'Kamas'],
  'Southwest Utah': ['Beaver', 'Parowan', 'Panguitch', 'Kanab'],
  'Southeast Utah': ['Moab', 'Monticello', 'Blanding']
};

function getRegion(city) {
  if (!city) return 'Unknown';
  
  const cityLower = city.toLowerCase().trim();
  
  for (const [region, cities] of Object.entries(REGIONS)) {
    if (cities.some(c => cityLower.includes(c.toLowerCase()))) {
      return region;
    }
  }
  
  return 'Other Utah';
}

function extractCity(address) {
  if (!address) return null;
  
  // Try to extract city from address
  // Format is usually: "Street, City, UT ZIP"
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[1].trim().replace(/\sUT\s.*$/, '').trim();
  }
  
  return null;
}

async function mergeResearch() {
  const researchPath = '/Users/claraadkinson/.openclaw/workspace/mission-control/data/utah-monuments-research.json';
  
  if (!fs.existsSync(researchPath)) {
    console.log('⏳ Waiting for research data...');
    console.log(`Expected at: ${researchPath}`);
    process.exit(0);
  }
  
  const researchData = JSON.parse(fs.readFileSync(researchPath, 'utf8'));
  console.log(`Found ${researchData.length} companies in research data\n`);
  
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };
  
  for (const company of researchData) {
    try {
      const name = company.name.trim();
      
      // Check if already exists
      const { data: existing } = await supabase
        .from('companies')
        .select('id, metadata')
        .eq('name', name)
        .maybeSingle();
      
      const city = company.city || extractCity(company.address);
      const region = getRegion(city);
      
      const companyData = {
        name,
        email: company.email || null,
        phone: company.phone || null,
        website: company.website || null,
        address: company.address || null,
        pipeline_status: existing ? undefined : 'Prospecting', // Don't override existing status
        metadata: {
          ...(existing?.metadata || {}),
          city,
          region,
          business_type: company.business_type || 'Unknown',
          estimated_annual_volume: company.estimated_annual_volume || null,
          volume_signals: company.volume_signals || null,
          research_date: new Date().toISOString(),
          research_source: 'Utah Monument Research 2/23/26'
        }
      };
      
      if (existing) {
        // Update
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', existing.id);
        
        if (error) throw error;
        
        console.log(`✓ Updated: ${name} (${region})`);
        results.updated++;
      } else {
        // Create
        const { error } = await supabase
          .from('companies')
          .insert(companyData);
        
        if (error) throw error;
        
        console.log(`✓ Created: ${name} (${region})`);
        results.created++;
      }
    } catch (error) {
      console.error(`✗ Error: ${company.name} - ${error.message}`);
      results.errors.push({ company: company.name, error: error.message });
      results.skipped++;
    }
  }
  
  console.log('\n=== Merge Summary ===');
  console.log(`Created: ${results.created}`);
  console.log(`Updated: ${results.updated}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e.company}: ${e.error}`));
  }
  
  // Get total count by region
  const { data: allCompanies } = await supabase
    .from('companies')
    .select('metadata');
  
  const regionCounts = {};
  allCompanies?.forEach(c => {
    const region = c.metadata?.region || 'Unknown';
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  });
  
  console.log('\n=== Utah Coverage by Region ===');
  Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([region, count]) => {
      console.log(`${region}: ${count} companies`);
    });
  
  console.log(`\n✅ Total companies in CRM: ${allCompanies?.length || 0}`);
}

mergeResearch();
