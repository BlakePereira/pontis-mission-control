#!/usr/bin/env node

/**
 * Import monument companies from Google Sheet CSV to Mission Control CRM
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://lgvvylbohcboyzahhono.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CSV data from Google Sheet
const csvData = `Company,Email,EMAIL ALT,ALT 2 EMAIL,Website,Phone,Address,DATE EMAILED,DATE CALLED,VISTED DATE,NOTES,CALL NOTES,Have Preposed the new Idea
Heritage Memorials,ON WEBSITE,,,https://www.heritagememorials-utah.com/,18017982769,"1200 US-89, Mapleton, UT 84664",11/11/25,,,has been talking want me to email candis it info@heritagememorials-utah.com jared,$199 4 or 5 in the last few months depends on the age group more for younger people that have past away,
Memorial Art Co. Monuments,memorialart1@gmail.com,,,https://www.memorialartmonument.com/,18014896440,"190 N Main St, Springville, UT 84663",11/11/25,,,,people stopped buying it. its the older gen thing so its not too interesting for them. talked cheri,
Beesley Monument & Vault Co,beesleymonument@gmail.com,,,https://beesleymonument.com/,14352285110,"725 S State St, Provo, UT 84606",11/11/25,,,"Went and visited them months ago, didnt respond to the email",the have not been pushing the QR codes so thats probably why they havent sold too much. usually older folks so they dont look at the QR codes becasue they dont have a display. paula stop by after 1,
Utah Valley Monuments,,,,,18012252131,"500 N State St, Orem, UT 84057",,,,,logan he said they dont sell anything with QR codes need to call back and get the information for the decision maker info@bergmortuary.com,
Walker Monument,walkermonument@gmail.com,,,https://walkermonument.com/,18012241181,"737 N 1200 W, Orem, UT 84057",11/11/25,,,,"Derrell - owner. 7065670989 - not currently. several companies offering that. biggest challenge. so many companies come adn go - when they go out of business. main drawback. little curiosity, less than 5%, QR companies closing : not sure if there is a model for recurring model to it. one and done - possibly. part of the challenge is the price point. whats the cost. by the time we incorporate that into it, there's no profit in it for them. interessting thoughts/take on it - biggest concern would be there would be certain number of people that could be put off by that. hard to say how many would be ok with that. where they're at in the grieving process. opt in or out. possibly come and visit. wants to buy out partner . bought dixie granite company. wholesale manufacturer. potentially valuable for dixie. do sandblasting ready to install. if we get it figured out. write up business model and send to Derrell - df@dixiegranite.com",
Dalton's Memorial Engraving,info@daltonsmemorial.com,PAYSON: kevinandmegan@daltonsmemorial.com,MORONI: claire@daltonsmemorial.com,http://www.daltonsmemorial.com/,18017568817,"318 S 860 E St, American Fork, UT 84003",11/11/25 11/14/25,,,Responded and is talking with me | Claire responded and told me to talk with Ben in AF,audiobiography 1 out of 20 get audiobiography 125 talked with Lizzie ,Just sent an email to ben asking about qhite labeling.
Rocky Mountain Monument,info@rockymountainvault.com,,,http://www.rockymountainmonument.com/,18015712831,"1950 Dimple Dell Rd, Sandy, UT 84092",11/11/25,,,email does not work,mark they are worries about making this a long term thing selected independed funeral homes Lane 140 years metal pcitures because everything breaks in procilain ,
Utah Headstone Design,utahheadstonedesign@gmail.com,,,https://www.utahheadstonedesign.com/,18012902354,"850 E 5600 S, Murray, UT 84107","11/11/25, 11/14/25",,,Ned Responded and asked more about what we are offering,,
"Hans Monuments, Inc.",hansmonuments@gmail.com,,,http://www.hansmonuments.com/,18014841594,"1555 E 3300 S, Salt Lake City, UT 84106",11/11/25,,,Has been talking and is skeptical but emaili back often,,
Nu-Art Memorial,Contact@NuArtMemorial.com,,,http://www.nuartmemorial.com/,18014861691,"1863 State St, Salt Lake City, UT 84115",11/11/25,,,,,
Salt Lake Monument LLC,slmonument@gmail.com,,,https://www.saltlakemonument.com/,18013644025,"186 North N Street (corner of 4th ave and, 186 N St E, Salt Lake City, UT 84103",11/11/25,,,,,
Bountiful Memorial Art Co Inc,bottjosh@netscape.net,,,https://bountifulmemorialart.com/,18012952751,"2010 S Main St, Bountiful, UT 84010",11/11/25,,,said we can go and visit anytime next week,,
Utah Headstone Design,utahheadstones@gmail.com,,,https://www.utahheadstones.com/,18017714749,"3137 N Fairfield Rd, Layton, UT 84041",11/11/25,,,,,
Wasatch Headstones,,,,,14353153684,"260 N Main St, Heber City, UT 84032",,,,,,
Mark H. Bott Burial Vault and Memorial Plant,info@mhbott.com,,,http://www.markhbottco.com/,18013938087,,11/11/25,,,,,
Stone Supply & Monument,stonesupplyp@aol.com,,,http://stonesupplymonument.net/,18017826434,,11/11/25,,,,,
Bott & Sons Monument LLC,bottandsons@gmail.com,,,https://www.bottandsons.com/,14357233128,"528 S Main St, Brigham City, UT 84302",11/11/25,,,Answered and asked about acid,,
Rocky Mountain Blasting & Monuments,rmblasting@yahoo.com,,,https://www.rmblasting.com/,14357702948,"2794 UT-101, Wellsville, UT 84339",11/11/25,,,,,
Cache Valley Monuments,website,,,http://cachevalleymonuments.com/?utm_source=google&utm_medium=local&utm_campaign=gbp,14357524949,"44 E Center St, Logan, UT 84321",11/11/25,,,,,
Brown Monument,website,,,https://www.brownmonument.com/,14357523415,"791 S 100 W, Smithfield, UT 84335",11/11/25,,,,,
Hallows Monument,contact@hallowsmonument.com,,,http://hallowsmonument.com/,14355294129,"324 W 100 S, Aurora, UT 84620",11/11/25,,,email doesnt work,,
Richfield Monuments Headstones Utah,richfieldmonuments@gmail.com,,,http://www.richfieldmonuments.com/?utm_source=googlemaps,14358964031,"197 N Main St, Richfield, UT 84701",11/11/25,,,Responded and werent interested,,
"Marietti Monuments, Inc",designs@mariettimonuments.com,,,https://www.mariettimonuments.com/,14356374400,"45 W 100 N, Price, UT 84501",11/11/25,,,,,
Taylor Made Monuments,taylormadewooden@gmail.com,,,https://taylormademonuments.com/,435-678-2523,"107 North HWY 191 Blanding, Utah 84511",11/11/25,,,They want to get back to us in 2026,,
Hidden Meadows Monuments,hiddenmeadowsmonuments@gmail.com,,,https://hiddenmeadowsmonuments.com/,14358902563,"1949 N Mahogany Cir, Cedar City, UT 84721",11/11/25,,,,,
Kenworthy Cedar Memorials,office@cedarmemorials.com,office@kmonuments.com,,https://kenworthymonuments.com/,14355864514,"929 N Main St, Cedar City, UT 84721",11/11/25,,,,,
The DuCrest Monument Company,monuments@fxindustries.net,,,https://ducrestmonument.com/,14359622879,"293 N 2260 W, Hurricane, UT 84737",11/11/25,,,,,
"Kenworthy Monuments, Sandblasting & Signs",mailto:office@kmonuments.com,,,http://kenworthymonuments.com/,14356283335,"3738 S River Rd Suite 3, St. George, UT 84790",11/11/25,,,,,
Utah Monument Co.,UtahMonument@gmail.com,,,http://www.utahmonumentcompany.com/,14356732716,"510 E Tabernacle St, St. George, UT 84770",11/11/25,,,Clint responded and we are in the talks | sending him samples,,`;

function parseCSV(csv) {
  const lines = csv.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const companies = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || !line.includes(',')) continue;
    
    // Parse CSV handling quotes
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length < 3) continue; // Skip incomplete rows
    
    const company = {};
    headers.forEach((header, idx) => {
      company[header] = values[idx] || '';
    });
    
    // Only include rows with actual company name
    if (company.Company && company.Company.trim() && !company.Company.includes('Locations to start') && !company.Company.includes('This week')) {
      companies.push(company);
    }
  }
  
  return companies;
}

function determinePipelineStage(company) {
  const notes = (company.NOTES || '').toLowerCase();
  const callNotes = (company['CALL NOTES'] || '').toLowerCase();
  const allNotes = notes + ' ' + callNotes;
  
  // Check for clear signals
  if (allNotes.includes('sending him samples') || allNotes.includes('in the talks')) {
    return 'Negotiating';
  }
  if (allNotes.includes('not interested') || allNotes.includes('werent interested')) {
    return 'Lost';
  }
  if (allNotes.includes('responded') || allNotes.includes('talking')) {
    return 'Qualified';
  }
  if (company['DATE CALLED'] || company['VISTED DATE']) {
    return 'Contacted';
  }
  if (company['DATE EMAILED']) {
    return 'Contacted';
  }
  
  return 'Prospecting';
}

function extractContactInfo(company) {
  const contacts = [];
  const notes = company.NOTES || '';
  const callNotes = company['CALL NOTES'] || '';
  
  // Extract from notes (e.g., "Derrell - owner. 7065670989")
  const nameMatches = [...notes.matchAll(/([A-Z][a-z]+)\s*-\s*(owner|manager|contact)/gi)];
  nameMatches.forEach(match => {
    contacts.push({ name: match[1], role: match[2] });
  });
  
  // Also check call notes
  const callNameMatches = [...callNotes.matchAll(/(talked|talked with|spoke with)\s+([A-Z][a-z]+)/gi)];
  callNameMatches.forEach(match => {
    contacts.push({ name: match[2], role: 'contact' });
  });
  
  return contacts;
}

async function importCompanies() {
  const companies = parseCSV(csvData);
  
  console.log(`Parsed ${companies.length} companies from CSV\n`);
  
  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };
  
  for (const company of companies) {
    try {
      const name = company.Company.trim();
      const email = company.Email !== 'ON WEBSITE' && company.Email !== 'website' ? company.Email : null;
      const altEmail = company['EMAIL ALT'] || null;
      const altEmail2 = company['ALT 2 EMAIL'] || null;
      const website = company.Website || null;
      const phone = company.Phone || null;
      const address = company.Address || null;
      
      const pipelineStage = determinePipelineStage(company);
      const contacts = extractContactInfo(company);
      
      // Combine all notes
      const allNotes = [];
      if (company.NOTES) allNotes.push(`Notes: ${company.NOTES}`);
      if (company['CALL NOTES']) allNotes.push(`Call notes: ${company['CALL NOTES']}`);
      if (company['Have Preposed the new Idea']) allNotes.push(`Proposed new idea: ${company['Have Preposed the new Idea']}`);
      
      const combinedNotes = allNotes.join('\n\n');
      
      // Check if company already exists
      const { data: existing, error: checkError } = await supabase
        .from('companies')
        .select('id')
        .eq('name', name)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      const companyData = {
        name,
        email,
        phone,
        website,
        address,
        pipeline_status: pipelineStage,
        notes: combinedNotes,
        metadata: {
          email_alt: altEmail,
          email_alt2: altEmail2,
          date_emailed: company['DATE EMAILED'] || null,
          date_called: company['DATE CALLED'] || null,
          visited_date: company['VISTED DATE'] || null,
          contacts: contacts.length > 0 ? contacts : null,
          source: 'Google Sheet Import',
          imported_at: new Date().toISOString()
        }
      };
      
      if (existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', existing.id);
        
        if (updateError) throw updateError;
        
        console.log(`✓ Updated: ${name} (${pipelineStage})`);
        results.updated++;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('companies')
          .insert(companyData);
        
        if (insertError) throw insertError;
        
        console.log(`✓ Created: ${name} (${pipelineStage})`);
        results.created++;
      }
    } catch (error) {
      console.error(`✗ Error processing ${company.Company}: ${error.message}`);
      results.errors.push({ company: company.Company, error: error.message });
      results.skipped++;
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log(`Created: ${results.created}`);
  console.log(`Updated: ${results.updated}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  - ${e.company}: ${e.error}`));
  }
  
  return results;
}

// Run import
importCompanies()
  .then(results => {
    console.log('\n✅ Import complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
