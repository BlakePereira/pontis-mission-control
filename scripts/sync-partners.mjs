#!/usr/bin/env node
/**
 * sync-partners.mjs
 *
 * Syncs partner records from the Pontis Supabase (crm_partners table)
 * into Mission Control via the /api/partners/ingest endpoint.
 *
 * Usage:
 *   node mission-control/scripts/sync-partners.mjs
 *
 * Environment (optional overrides):
 *   PONTIS_SUPABASE_URL       — defaults to hardcoded Pontis Supabase URL
 *   PONTIS_SUPABASE_KEY       — defaults to hardcoded service role key
 *   MC_URL                    — Mission Control base URL (default: http://localhost:3000)
 *   MC_USERNAME               — Basic auth username (default: pontis)
 *   MC_PASSWORD               — Basic auth password
 *
 * Note: fulfillment_partners does not exist in the current Supabase schema.
 *       The actual table is crm_partners. This script reads from crm_partners.
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const PONTIS_SUPABASE_URL =
  process.env.PONTIS_SUPABASE_URL ||
  "https://lgvvylbohcboyzahhono.supabase.co";

const PONTIS_SUPABASE_KEY =
  process.env.PONTIS_SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE";

const MC_URL =
  process.env.MC_URL || "http://localhost:3000";

const MC_USERNAME = process.env.MC_USERNAME || "pontis";
const MC_PASSWORD = process.env.MC_PASSWORD || "missioncontrol2026";

const BATCH_SIZE = 50; // Records per POST to avoid large payloads

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[sync-partners] ${new Date().toISOString()} — ${msg}`);
}

function logError(msg) {
  console.error(`[sync-partners] ERROR ${new Date().toISOString()} — ${msg}`);
}

const mcAuthHeader = `Basic ${Buffer.from(`${MC_USERNAME}:${MC_PASSWORD}`).toString("base64")}`;

// ─── Step 1: Fetch all partners from Pontis Supabase ─────────────────────────

async function fetchPartnersFromPontis() {
  log("Fetching partners from Pontis Supabase (crm_partners)...");

  const headers = {
    apikey: PONTIS_SUPABASE_KEY,
    Authorization: `Bearer ${PONTIS_SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  let allRecords = [];
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const url = `${PONTIS_SUPABASE_URL}/rest/v1/crm_partners?select=*&limit=${pageSize}&offset=${offset}&order=created_at.asc`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to fetch from Supabase: ${res.status} ${text}`);
    }

    const page = await res.json();

    if (!Array.isArray(page) || page.length === 0) break;

    allRecords = allRecords.concat(page);
    log(`  Fetched ${allRecords.length} records so far...`);

    if (page.length < pageSize) break; // Last page
    offset += pageSize;
  }

  log(`Fetched ${allRecords.length} total partner records.`);
  return allRecords;
}

// ─── Step 2: POST partners to Mission Control ingest endpoint ─────────────────

async function ingestBatch(batch, batchNum, totalBatches) {
  const res = await fetch(`${MC_URL}/api/partners/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: mcAuthHeader,
    },
    body: JSON.stringify(batch),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ingest batch ${batchNum}/${totalBatches} failed: ${res.status} ${text}`);
  }

  const result = await res.json();
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log("=== Partner Sync Starting ===");
  log(`Source: ${PONTIS_SUPABASE_URL}/rest/v1/crm_partners`);
  log(`Target: ${MC_URL}/api/partners/ingest`);

  // Fetch
  let partners;
  try {
    partners = await fetchPartnersFromPontis();
  } catch (err) {
    logError(`Failed to fetch partners: ${err.message}`);
    process.exit(1);
  }

  if (partners.length === 0) {
    log("No partners found — nothing to sync.");
    process.exit(0);
  }

  // Batch and POST
  const batches = [];
  for (let i = 0; i < partners.length; i += BATCH_SIZE) {
    batches.push(partners.slice(i, i + BATCH_SIZE));
  }

  log(`Syncing ${partners.length} records in ${batches.length} batch(es) of up to ${BATCH_SIZE}...`);

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const allErrors = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const result = await ingestBatch(batch, i + 1, batches.length);
      totalInserted += result.inserted ?? 0;
      totalUpdated += result.updated ?? 0;
      totalSkipped += result.skipped ?? 0;
      if (result.errors?.length > 0) {
        allErrors.push(...result.errors);
      }
      log(`  Batch ${i + 1}/${batches.length}: inserted=${result.inserted}, updated=${result.updated}, skipped=${result.skipped}`);
    } catch (err) {
      logError(err.message);
      allErrors.push({ batch: i + 1, error: err.message });
    }
  }

  // Summary
  log("=== Sync Complete ===");
  log(`Total records: ${partners.length}`);
  log(`  Inserted: ${totalInserted}`);
  log(`  Updated:  ${totalUpdated}`);
  log(`  Skipped:  ${totalSkipped}`);
  log(`  Errors:   ${allErrors.length}`);

  if (allErrors.length > 0) {
    logError("Errors encountered during sync:");
    for (const e of allErrors) {
      logError(`  ${JSON.stringify(e)}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  logError(`Unhandled error: ${err.message}`);
  process.exit(1);
});
