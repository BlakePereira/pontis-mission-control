#!/usr/bin/env node
/**
 * session-watcher.mjs
 *
 * Watches OpenClaw session JSONL files for changes and auto-syncs to Supabase
 * every SYNC_INTERVAL_MS. Zero AI cost — just local file reads + HTTP POST.
 *
 * Usage:
 *   node /Users/claraadkinson/.openclaw/workspace/mission-control/scripts/session-watcher.mjs
 *
 * Runs as a background daemon via LaunchAgent.
 */

import { watch, readFileSync, readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";

const SESSIONS_DIR = "/Users/claraadkinson/.openclaw/agents/main/sessions";
const SUPABASE_URL = "https://lgvvylbohcboyzahhono.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE";

const SYNC_INTERVAL_MS = 120_000; // 2 minutes
const DEBOUNCE_MS = 5_000; // wait 5s after last change before syncing
const STATE_FILE = "/tmp/session-watcher-state.json";
const LOG_PREFIX = "[session-watcher]";

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates,return=minimal",
};

// Track which files changed since last sync
let dirtyFiles = new Set();
let debounceTimer = null;
let lastSyncMs = 0;

// ─── Session parsing (same logic as sync-sessions.mjs) ──────────────────────

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

function inferKindFromContent(parsedLines) {
  let hasDeliveryMirror = false;
  let hasGroupMessage = false;
  let hasCronLabel = false;

  for (const item of parsedLines) {
    const msg = item.type === "message" ? item.message : item;
    if (!msg) continue;
    if (msg.model === "delivery-mirror" || msg.provider === "openclaw") hasDeliveryMirror = true;
    if (msg.role === "user") {
      const content = Array.isArray(msg.content)
        ? (msg.content.find((c) => c.type === "text")?.text || "")
        : (typeof msg.content === "string" ? msg.content : "");
      if (/^\[Telegram .+ id:-[0-9]/.test(content)) hasGroupMessage = true;
    }
    const label = item.label || msg.label;
    if (label && (label.toLowerCase().includes("cron") || label.toLowerCase().startsWith("cron:"))) {
      hasCronLabel = true;
    }
  }

  if (hasGroupMessage) return "group";
  if (hasDeliveryMirror && !hasGroupMessage) return "main";
  if (hasCronLabel) return "other";
  return "subagent";
}

function inferKindFromSessionMetadata(firstLine) {
  if (!firstLine) return null;
  const key = (firstLine.key || "").toLowerCase();
  if (key.includes("subagent")) return "subagent";
  if (key === "agent:main:main" || key.includes(":main:main")) return "main";
  if (key.includes("telegram:group") || key.includes("telegram:g-")) return "group";
  if (key.includes("cron")) return "other";
  return null;
}

function parseSessionFile(filename) {
  const sessionId = filename.replace(".jsonl", "");
  const filePath = join(SESSIONS_DIR, filename);

  let lines;
  try {
    lines = readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  } catch {
    return null;
  }
  if (lines.length === 0) return null;

  const parsed = [];
  for (const line of lines) {
    try { parsed.push(JSON.parse(line)); } catch { /* skip */ }
  }
  if (parsed.length === 0) return null;

  const sessionMeta = parsed[0];
  let kind = inferKindFromSessionMetadata(sessionMeta);
  if (!kind) kind = inferKindFromContent(parsed);

  const timestamps = [];
  let startedAt = null;
  if (sessionMeta.timestamp) {
    const ts = new Date(sessionMeta.timestamp).getTime();
    if (!isNaN(ts)) { startedAt = new Date(ts); timestamps.push(ts); }
  }

  let totalTokens = 0, costTotal = 0, lastAssistantMessage = null, lastModel = null;
  let sessionLabel = null, displayName = null, channel = null;

  for (const item of parsed) {
    const msg = item.type === "message" ? item.message : item;
    const itemTs = item.timestamp || (msg && msg.timestamp);
    if (itemTs) {
      const tsNum = typeof itemTs === "number" ? itemTs : new Date(itemTs).getTime();
      if (!isNaN(tsNum)) timestamps.push(tsNum);
    }
    if (item.label && !sessionLabel) sessionLabel = item.label;
    if (item.displayName && !displayName) displayName = item.displayName;
    if (item.data?.label && !sessionLabel) sessionLabel = item.data.label;
    if (!msg) continue;
    if (msg.role !== "assistant") continue;
    if (!msg.usage || !msg.usage.cost) continue;
    if (!msg.provider || msg.provider === "openclaw") continue;
    totalTokens += msg.usage.totalTokens || 0;
    costTotal += msg.usage.cost.total || 0;
    if (msg.model) lastModel = msg.model;
    const text = extractTextFromContent(msg.content);
    if (text) lastAssistantMessage = text;
    if (msg.deliveryContext?.channel && !channel) channel = msg.deliveryContext.channel;
  }

  if (timestamps.length === 0) return null;

  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const now = Date.now();
  const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000;

  const sessionKey = sessionMeta.key || sessionMeta.id || sessionId;

  return {
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
    status: now - maxTs < ACTIVE_THRESHOLD_MS ? "active" : "completed",
    started_at: new Date(minTs).toISOString(),
    last_active_at: new Date(maxTs).toISOString(),
    duration_ms: timestamps.length > 1 ? maxTs - minTs : null,
    cost_total: Math.round(costTotal * 1000000) / 1000000,
    synced_at: new Date().toISOString(),
  };
}

// ─── Sync logic ──────────────────────────────────────────────────────────────

async function syncDirtyFiles() {
  const filesToSync = [...dirtyFiles];
  dirtyFiles.clear();

  if (filesToSync.length === 0) return;

  const rows = [];
  for (const filename of filesToSync) {
    const row = parseSessionFile(filename);
    if (row) rows.push(row);
  }

  if (rows.length === 0) return;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sessions_log?on_conflict=session_key`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify(rows),
    });

    if (res.ok || res.status === 204) {
      const active = rows.filter(r => r.status === "active").length;
      console.log(`${LOG_PREFIX} Synced ${rows.length} sessions (${active} active) at ${new Date().toLocaleTimeString()}`);
      lastSyncMs = Date.now();
      saveState();
    } else {
      const text = await res.text();
      console.error(`${LOG_PREFIX} Supabase error (${res.status}):`, text.slice(0, 200));
      // Re-add failed files to retry
      for (const f of filesToSync) dirtyFiles.add(f);
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} Sync error:`, err.message);
    for (const f of filesToSync) dirtyFiles.add(f);
  }
}

async function fullSync() {
  console.log(`${LOG_PREFIX} Running full sync...`);
  try {
    const allFiles = readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith(".jsonl") && !f.includes(".deleted."));

    for (const f of allFiles) dirtyFiles.add(f);
    await syncDirtyFiles();
  } catch (err) {
    console.error(`${LOG_PREFIX} Full sync error:`, err.message);
  }
}

function saveState() {
  try {
    writeFileSync(STATE_FILE, JSON.stringify({
      lastSyncMs,
      lastSyncAt: new Date(lastSyncMs).toISOString(),
      pid: process.pid,
    }));
  } catch { /* ignore */ }
}

// ─── File watcher ────────────────────────────────────────────────────────────

function scheduleDebouncedSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    syncDirtyFiles().catch(err => console.error(`${LOG_PREFIX} Debounced sync error:`, err.message));
  }, DEBOUNCE_MS);
}

function startWatcher() {
  console.log(`${LOG_PREFIX} Watching ${SESSIONS_DIR}`);
  console.log(`${LOG_PREFIX} Sync interval: ${SYNC_INTERVAL_MS / 1000}s, debounce: ${DEBOUNCE_MS / 1000}s`);
  console.log(`${LOG_PREFIX} PID: ${process.pid}`);

  try {
    watch(SESSIONS_DIR, { persistent: true }, (eventType, filename) => {
      if (!filename || !filename.endsWith(".jsonl")) return;
      if (filename.includes(".deleted.")) return;

      dirtyFiles.add(filename);
      scheduleDebouncedSync();
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} Watch error:`, err.message);
    console.log(`${LOG_PREFIX} Falling back to polling mode`);
  }

  // Periodic full sync as backup (catches anything the watcher missed)
  setInterval(() => {
    fullSync().catch(err => console.error(`${LOG_PREFIX} Periodic sync error:`, err.message));
  }, SYNC_INTERVAL_MS);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${LOG_PREFIX} Starting session watcher daemon`);

  // Initial full sync
  await fullSync();

  // Start watching
  startWatcher();

  // Save state
  saveState();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log(`\n${LOG_PREFIX} Shutting down...`);
    syncDirtyFiles().then(() => process.exit(0)).catch(() => process.exit(1));
  });
  process.on("SIGTERM", () => {
    console.log(`${LOG_PREFIX} SIGTERM received, syncing and exiting...`);
    syncDirtyFiles().then(() => process.exit(0)).catch(() => process.exit(1));
  });
}

main().catch(err => {
  console.error(`${LOG_PREFIX} Fatal:`, err);
  process.exit(1);
});
