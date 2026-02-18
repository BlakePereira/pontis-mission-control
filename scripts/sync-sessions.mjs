#!/usr/bin/env node
/**
 * sync-sessions.mjs
 *
 * Scans OpenClaw session JSONL transcripts, builds per-session summaries,
 * and upserts them to Supabase sessions_log.
 *
 * Usage:
 *   node /Users/claraadkinson/.openclaw/workspace/mission-control/scripts/sync-sessions.mjs
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SUPABASE_URL = "https://lgvvylbohcboyzahhono.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE";
const SESSIONS_DIR = "/Users/claraadkinson/.openclaw/agents/main/sessions";

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

function inferKindFromContent(parsedLines) {
  // Strategy: scan message content for structural clues OpenClaw embeds
  // 1. Group sessions: user messages start with "[Telegram <GroupName>"
  // 2. Main sessions: contain a delivery-mirror model message ("New session started")
  // 3. Sub-agent/cron sessions: no delivery-mirror, no group prefix messages

  let hasDeliveryMirror = false;
  let hasGroupMessage = false;
  let hasCronLabel = false;

  for (const item of parsedLines) {
    const msg = item.type === "message" ? item.message : item;
    if (!msg) continue;

    // Detect delivery-mirror (marks main or group sessions)
    if (msg.model === "delivery-mirror" || msg.provider === "openclaw") {
      hasDeliveryMirror = true;
    }

    // Detect group sessions: user messages have format "[Telegram <Name> id:-<negativeId> ..."
    // Telegram group IDs are negative; DM IDs are positive.
    if (msg.role === "user") {
      const content = Array.isArray(msg.content)
        ? (msg.content.find((c) => c.type === "text")?.text || "")
        : (typeof msg.content === "string" ? msg.content : "");
      if (/^\[Telegram .+ id:-[0-9]/.test(content)) {
        hasGroupMessage = true;
      }
    }

    // Detect cron label in message metadata
    const label = item.label || msg.label;
    if (label && (label.toLowerCase().includes("cron") || label.toLowerCase().startsWith("cron:"))) {
      hasCronLabel = true;
    }
  }

  if (hasGroupMessage) return "group";
  if (hasDeliveryMirror && !hasGroupMessage) return "main";
  if (hasCronLabel) return "other"; // cron sessions → "other"
  return "subagent"; // no delivery-mirror = sub-agent (spawned task)
}

function inferKindFromSessionMetadata(firstLine) {
  if (!firstLine) return null;
  // The JSONL first line rarely has a key, but check anyway
  const key = (firstLine.key || "").toLowerCase();
  if (key.includes("subagent")) return "subagent";
  if (key === "agent:main:main" || key.includes(":main:main")) return "main";
  if (key.includes("telegram:group") || key.includes("telegram:g-")) return "group";
  if (key.includes("cron")) return "other";
  return null; // unknown — fall through to content-based detection
}

function extractTextFromContent(content) {
  if (!content) return null;
  if (typeof content === "string") return content.trim().slice(0, 300);
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item && item.type === "text" && item.text) {
        return item.text.trim().slice(0, 300);
      }
    }
  }
  return null;
}

async function upsertSessions(rows) {
  if (rows.length === 0) return { ok: true, count: 0 };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions_log?on_conflict=session_key`, {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    // If table doesn't exist, surface a clear error
    if (text.includes("relation") && text.includes("does not exist")) {
      console.error(
        "\n⚠️  sessions_log table does not exist in Supabase.\n" +
          "   Please apply migration 008-sessions-log.sql via the Supabase SQL editor:\n" +
          "   https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql\n"
      );
      process.exit(1);
    }
    console.error("Upsert failed:", text.slice(0, 200));
    return { ok: false };
  }
  return { ok: true, count: rows.length };
}

async function main() {
  let allFiles;
  try {
    allFiles = readdirSync(SESSIONS_DIR);
  } catch (err) {
    console.error("Cannot read sessions directory:", err.message);
    process.exit(1);
  }

  const jsonlFiles = allFiles.filter(
    (f) => f.endsWith(".jsonl") && !f.includes(".deleted.")
  );

  const now = Date.now();
  const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

  const rows = [];

  for (const filename of jsonlFiles) {
    const sessionId = filename.replace(".jsonl", "");
    const filePath = join(SESSIONS_DIR, filename);

    let lines;
    try {
      lines = readFileSync(filePath, "utf8").split("\n").filter(Boolean);
    } catch {
      continue;
    }

    if (lines.length === 0) continue;

    // Parse all lines
    const parsed = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }

    if (parsed.length === 0) continue;

    // First line is session metadata
    const sessionMeta = parsed[0];

    // Determine kind: first try session metadata key, then content-based detection
    let kind = inferKindFromSessionMetadata(sessionMeta);
    if (!kind) {
      kind = inferKindFromContent(parsed);
    }

    // Extract all timestamps
    const timestamps = [];
    let startedAt = null;
    let lastActiveAt = null;

    // Session start time from first line
    if (sessionMeta.timestamp) {
      const ts = new Date(sessionMeta.timestamp).getTime();
      if (!isNaN(ts)) {
        startedAt = new Date(sessionMeta.timestamp);
        timestamps.push(ts);
      }
    }

    // Scan messages for timestamps and data
    let totalTokens = 0;
    let costTotal = 0;
    let lastAssistantMessage = null;
    let lastModel = null;
    let sessionLabel = null;
    let displayName = null;
    let channel = null;

    for (const item of parsed) {
      // Get message (may be wrapped in type=message or bare)
      const msg = item.type === "message" ? item.message : item;
      const itemTs = item.timestamp || (msg && msg.timestamp);

      if (itemTs) {
        const tsNum =
          typeof itemTs === "number" ? itemTs : new Date(itemTs).getTime();
        if (!isNaN(tsNum)) {
          timestamps.push(tsNum);
        }
      }

      // Look for label/displayName in message metadata
      if (item.label && !sessionLabel) sessionLabel = item.label;
      if (item.displayName && !displayName) displayName = item.displayName;
      if (item.data?.label && !sessionLabel) sessionLabel = item.data.label;

      if (!msg) continue;

      // Skip non-assistant messages for usage data
      if (msg.role !== "assistant") continue;
      if (!msg.usage || !msg.usage.cost) continue;
      if (!msg.provider || msg.provider === "openclaw") continue;

      // Accumulate tokens and cost
      totalTokens += msg.usage.totalTokens || 0;
      costTotal += msg.usage.cost.total || 0;

      // Track last model
      if (msg.model) lastModel = msg.model;

      // Track last assistant text message
      const text = extractTextFromContent(msg.content);
      if (text) {
        lastAssistantMessage = text;
      }

      // Look for channel info
      if (msg.deliveryContext?.channel && !channel) {
        channel = msg.deliveryContext.channel;
      }
    }

    if (timestamps.length === 0) continue;

    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);

    startedAt = new Date(minTs);
    lastActiveAt = new Date(maxTs);

    const durationMs = timestamps.length > 1 ? maxTs - minTs : null;
    const status = now - maxTs < ACTIVE_THRESHOLD_MS ? "active" : "completed";

    // Determine session_key: use session meta id/key if available, otherwise session_id
    const sessionKey =
      sessionMeta.key ||
      sessionMeta.id ||
      sessionId;

    rows.push({
      session_key: sessionKey,
      session_id: sessionId,
      label: sessionLabel || null,
      kind,
      display_name: displayName || null,
      channel: channel || null,
      model: lastModel || null,
      total_tokens: totalTokens,
      last_message: lastAssistantMessage || null,
      last_role: lastAssistantMessage ? "assistant" : null,
      status,
      started_at: startedAt.toISOString(),
      last_active_at: lastActiveAt.toISOString(),
      duration_ms: durationMs,
      cost_total: Math.round(costTotal * 1000000) / 1000000,
      synced_at: new Date().toISOString(),
    });
  }

  // Upsert in batches of 100
  let synced = 0;
  let active = 0;
  let completed = 0;

  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const result = await upsertSessions(batch);
    if (result.ok) {
      synced += batch.length;
      for (const r of batch) {
        if (r.status === "active") active++;
        else completed++;
      }
    }
  }

  console.log(
    `Synced ${synced} sessions (${active} active, ${completed} completed) from ${jsonlFiles.length} files`
  );
}

main().catch((err) => {
  console.error("sync-sessions error:", err);
  process.exit(1);
});
