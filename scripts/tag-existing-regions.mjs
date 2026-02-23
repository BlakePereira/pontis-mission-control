#!/usr/bin/env node

/**
 * Tag existing companies with regions and cities
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lgvvylbohcboyzahhono.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

function getRegion(address) {
  if (!address) return 'Unknown';
  
  const addrLower = address.toLowerCase();
  
  for (const [region, cities] of Object.entries(REGIONS)) {
    if (cities.some(c => addrLower.includes(c.toLowerCase()))) {
      return region;
    }
  }
  
  return 'Other Utah';
}

function extractCity(address) {
  if (!address) return null;
  
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[1].trim().replace(/\sUT\s.*$/, '').trim();
  }
  
  // Try to find city from region matching
  const addrLower = address.toLowerCase();
  for (const cities of Object.values(REGIONS)) {
    for (const city of cities) {
      if (addrLower.includes(city.toLowerCase())) {
        return city;
      }
    }
  }
  
  return null;
}

async function tagRegions() {
  console.log('Fetching existing companies...\n');
  
  const { data: companies, error } = await supabase
    .from('companies')
    .select('*');
  
  if (error) {
    console.error('Error fetching companies:', error);
    process.exit(1);
  }
  
  console.log(`Found ${companies.length} companies\n`);
  
  let updated = 0;
  
  for (const company of companies) {
    const city = extractCity(company.address);
    const region = getRegion(company.address);
    
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        metadata: {
          ...(company.metadata || {}),
          city,
          region
        }
      })
      .eq('id', company.id);
    
    if (updateError) {
      console.error(`✗ Error updating ${company.name}:`, updateError.message);
    } else {
      console.log(`✓ ${company.name} → ${city || '?'} (${region})`);
      updated++;
    }
  }
  
  console.log(`\n✅ Updated ${updated} companies with region data`);
  
  // Show region breakdown
  const regionCounts = {};
  companies.forEach(c => {
    const region = getRegion(c.address);
    regionCounts[region] = (regionCounts[region] || 0) + 1;
  });
  
  console.log('\n=== Current Coverage by Region ===');
  Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([region, count]) => {
      console.log(`${region}: ${count} companies`);
    });
}

tagRegions();
