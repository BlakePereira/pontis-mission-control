#!/usr/bin/env node
/**
 * collect-usage.mjs
 *
 * Scans OpenClaw session JSONL transcripts for assistant messages with usage data,
 * upserts them to Supabase usage_logs, and updates watermarks.
 *
 * Usage:
 *   node /Users/claraadkinson/.openclaw/workspace/mission-control/scripts/collect-usage.mjs
 */

import { readFileSync, readdirSync, appendFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const SUPABASE_URL = "https://lgvvylbohcboyzahhono.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE";
const SESSIONS_DIR = "/Users/claraadkinson/.openclaw/agents/main/sessions";
const BACKUP_DIR = join(homedir(), "Library", "Application Support", "openclaw-usage");
const BACKUP_FILE = join(BACKUP_DIR, "usage-log.jsonl");

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

function inferSessionKind(sessionKey) {
  if (!sessionKey) return "unknown";
  if (sessionKey.includes("subagent")) return "subagent";
  if (sessionKey.includes("telegram:group") || sessionKey.includes("telegram:g-")) return "group";
  if (sessionKey === "agent:main:main" || sessionKey.includes(":main:main")) return "main";
  if (sessionKey.includes("cron")) return "cron";
  if (sessionKey.includes("heartbeat")) return "heartbeat";
  return "other";
}

async function getWatermarks() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/usage_collector_state?select=session_id,last_processed_timestamp`,
    { headers: sbHeaders }
  );
  if (!res.ok) {
    console.error("Failed to fetch watermarks:", await res.text());
    return {};
  }
  const rows = await res.json();
  const map = {};
  for (const row of rows) {
    map[row.session_id] = row.last_processed_timestamp;
  }
  return map;
}

async function upsertWatermark(sessionId, timestamp) {
  await fetch(`${SUPABASE_URL}/rest/v1/usage_collector_state`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      session_id: sessionId,
      last_processed_timestamp: timestamp,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function insertUsageLogs(records) {
  if (records.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/usage_logs`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(records),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Failed to insert usage logs:", text);
  }
}

function ensureBackupDir() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

async function main() {
  // Ensure backup directory exists
  ensureBackupDir();

  // Get existing watermarks
  const watermarks = await getWatermarks();

  // Scan session files
  let allFiles;
  try {
    allFiles = readdirSync(SESSIONS_DIR);
  } catch (err) {
    console.error("Cannot read sessions directory:", err.message);
    process.exit(1);
  }

  const jsonlFiles = allFiles.filter((f) => f.endsWith(".jsonl"));
  let totalRecords = 0;
  let sessionsWithData = 0;
  const backupLines = [];

  for (const filename of jsonlFiles) {
    const sessionId = filename.replace(".jsonl", "");
    const lastTimestamp = watermarks[sessionId] || 0;
    const filePath = join(SESSIONS_DIR, filename);

    let lines;
    try {
      lines = readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    } catch {
      continue;
    }

    // Get session_key from the first line (session metadata)
    let sessionKey = null;
    try {
      const firstLine = JSON.parse(lines[0]);
      // Session key may be in 'key' or 'id' fields
      sessionKey = firstLine.key || firstLine.id || sessionId;
    } catch {
      sessionKey = sessionId;
    }

    const records = [];
    let maxTimestamp = lastTimestamp;

    for (const line of lines) {
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }

      // Handle both wrapped (type=message) and bare message formats
      const msg = parsed.type === "message" ? parsed.message : parsed;

      if (!msg || msg.role !== "assistant") continue;
      if (!msg.usage || !msg.usage.cost) continue;
      if (!msg.provider || msg.provider === "openclaw") continue; // skip delivery mirrors

      const ts = msg.timestamp;
      if (typeof ts !== "number" || ts <= lastTimestamp) continue;

      if (ts > maxTimestamp) maxTimestamp = ts;

      const record = {
        session_id: sessionId,
        session_key: sessionKey,
        session_kind: inferSessionKind(sessionKey),
        provider: msg.provider || "unknown",
        model: msg.model || "unknown",
        input_tokens: msg.usage.input || 0,
        output_tokens: msg.usage.output || 0,
        cache_read_tokens: msg.usage.cacheRead || 0,
        cache_write_tokens: msg.usage.cacheWrite || 0,
        total_tokens: msg.usage.totalTokens || 0,
        cost_input: msg.usage.cost.input || 0,
        cost_output: msg.usage.cost.output || 0,
        cost_cache_read: msg.usage.cost.cacheRead || 0,
        cost_cache_write: msg.usage.cost.cacheWrite || 0,
        cost_total: msg.usage.cost.total || 0,
        stop_reason: msg.stopReason || null,
        recorded_at: new Date(ts).toISOString(),
      };

      records.push(record);
      backupLines.push(JSON.stringify(record));
    }

    if (records.length > 0) {
      await insertUsageLogs(records);
      await upsertWatermark(sessionId, maxTimestamp);
      totalRecords += records.length;
      sessionsWithData++;
    } else if (maxTimestamp > lastTimestamp) {
      // Update watermark even if no usage records (to skip processed lines)
      await upsertWatermark(sessionId, maxTimestamp);
    }
  }

  // Write backup
  if (backupLines.length > 0) {
    appendFileSync(BACKUP_FILE, backupLines.join("\n") + "\n", "utf8");
  }

  console.log(
    `Collected ${totalRecords} new usage records from ${sessionsWithData} sessions (${jsonlFiles.length} total files scanned)`
  );
}

main().catch((err) => {
  console.error("collect-usage error:", err);
  process.exit(1);
});
