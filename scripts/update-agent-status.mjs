#!/usr/bin/env node
// Usage: node update-agent-status.mjs <agent_name> <status> [current_task]
// Example: node update-agent-status.mjs Codex working "Building auth module"

import { createClient } from "@supabase/supabase-js";

const [, , agent_name, status, current_task] = process.argv;

if (!agent_name || !status) {
  console.error("Usage: update-agent-status.mjs <agent_name> <status> [current_task]");
  process.exit(1);
}

const supabase = createClient(
  "https://lgvvylbohcboyzahhono.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndnZ5bGJvaGNib3l6YWhob25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgyODcwNywiZXhwIjoyMDg1NDA0NzA3fQ.EAo3uj6HyCTW44HK2d8WK2sNy10CwmnTYA0qQ2IGlsE"
);

const { error } = await supabase.from("agent_activity").upsert(
  {
    agent_name,
    status,
    current_task: current_task || null,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "agent_name" }
);

if (error) {
  console.error("Error:", error);
  process.exit(1);
}

console.log(`✅ ${agent_name} → ${status}${current_task ? `: ${current_task}` : ""}`);
