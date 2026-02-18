#!/usr/bin/env node
/**
 * sync-crons.mjs
 *
 * Reads /tmp/openclaw-crons-snapshot.json and upserts directly to Supabase.
 * Called by the heartbeat or a daily cron job on the Mac mini.
 *
 * Usage:
 *   node /path/to/sync-crons.mjs
 */

import { readFileSync } from "fs";

const SNAPSHOT_PATH = "/tmp/openclaw-crons-snapshot.json";
const SUPABASE_URL = "https://lgvvylbohcboyzahhono.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE";

function toRow(job) {
  return {
    id: job.id,
    name: job.name,
    enabled: job.enabled ?? true,
    schedule_kind: job.schedule?.kind ?? null,
    schedule_expr: job.schedule?.expr ?? null,
    schedule_every_ms: job.schedule?.everyMs ?? null,
    schedule_tz: job.schedule?.tz ?? null,
    payload_kind: job.payload?.kind ?? null,
    session_target: job.sessionTarget ?? null,
    next_run_at: job.state?.nextRunAtMs
      ? new Date(job.state.nextRunAtMs).toISOString()
      : null,
    last_run_at: job.state?.lastRunAtMs
      ? new Date(job.state.lastRunAtMs).toISOString()
      : null,
    last_status: job.state?.lastStatus ?? null,
    last_duration_ms: job.state?.lastDurationMs ?? null,
    raw: job,
    updated_at: new Date().toISOString(),
  };
}

async function main() {
  let jobs;
  try {
    const raw = readFileSync(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw);
    jobs = Array.isArray(parsed) ? parsed : parsed.jobs ?? Object.values(parsed);
  } catch (err) {
    console.error(`[sync-crons] Failed to read snapshot at ${SNAPSHOT_PATH}:`, err.message);
    process.exit(1);
  }

  console.log(`[sync-crons] Syncing ${jobs.length} jobs to Supabase…`);

  const rows = jobs.map(toRow);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/cron_jobs`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (res.ok || res.status === 204) {
    console.log(`[sync-crons] ✅ Synced ${jobs.length} jobs successfully.`);
  } else {
    const text = await res.text();
    console.error(`[sync-crons] ❌ Supabase error (${res.status}):`, text);
    process.exit(1);
  }
}

main();
