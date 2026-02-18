#!/usr/bin/env node
/**
 * sync-crons.mjs
 *
 * Reads /tmp/openclaw-crons-snapshot.json and pushes it to Mission Control.
 * Called by the heartbeat or a daily cron job on the Mac mini.
 *
 * Usage:
 *   node /path/to/sync-crons.mjs
 *
 * The OpenClaw heartbeat should write the snapshot first:
 *   Write current cron state to /tmp/openclaw-crons-snapshot.json
 */

import { readFileSync } from "fs";

const SNAPSHOT_PATH = "/tmp/openclaw-crons-snapshot.json";
const SYNC_URL = "https://pontis-mission-control.vercel.app/api/crons/sync";
const SYNC_SECRET = "pontis-cron-sync-2026";

async function main() {
  // Read snapshot
  let jobs;
  try {
    const raw = readFileSync(SNAPSHOT_PATH, "utf8");
    jobs = JSON.parse(raw);
    if (!Array.isArray(jobs)) {
      jobs = jobs.jobs ?? Object.values(jobs);
    }
  } catch (err) {
    console.error(`[sync-crons] Failed to read snapshot at ${SNAPSHOT_PATH}:`, err.message);
    process.exit(1);
  }

  console.log(`[sync-crons] Syncing ${jobs.length} jobs to Mission Control…`);

  // POST to sync endpoint
  const basicAuth = "Basic " + Buffer.from("pontis:missioncontrol2026").toString("base64");
  let res;
  try {
    res = await fetch(SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sync-secret": SYNC_SECRET,
        "Authorization": basicAuth,
      },
      body: JSON.stringify({ jobs }),
    });
  } catch (err) {
    console.error("[sync-crons] Network error:", err.message);
    process.exit(1);
  }

  const data = await res.json().catch(() => ({}));

  if (res.ok && data.ok) {
    console.log(`[sync-crons] ✅ Synced ${data.upserted} jobs successfully.`);
  } else {
    console.error(`[sync-crons] ❌ Sync failed (${res.status}):`, data.error ?? JSON.stringify(data));
    process.exit(1);
  }
}

main();
