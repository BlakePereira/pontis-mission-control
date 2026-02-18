# Database Migrations

All migrations should be run in order against the Supabase project:
**https://supabase.com/dashboard/project/lgvvylbohcboyzahhono/sql**

Paste each file's contents into the SQL editor and click Run.

---

## Migration History

| File | Description | Status |
|------|-------------|--------|
| `000-knowledge-items.sql` | Knowledge Items base table + full-text search index | ✅ Applied Feb 17, 2026 |
| `001-pgvector.sql` | Enable pgvector extension + add `embedding` and `entities` columns to knowledge_items | ✅ Applied Feb 17, 2026 |
| `002-match-function.sql` | `match_knowledge_items()` RPC for semantic vector search | ✅ Applied Feb 17, 2026 |
| `003-security-council.sql` | `security_scans` + `security_findings` tables for Security Council tab | ✅ Applied Feb 18, 2026 |
| `004-agent-activity.sql` | `agent_activity` table for War Room live status + seed data | ✅ Applied Feb 17, 2026 |
| `005-agent-activity-realtime.sql` | Enable Supabase Realtime publication for `agent_activity` | ✅ Applied Feb 17, 2026 |

---

## How to Apply on a Fresh Database

Run in this exact order:

```
000 → 001 → 002 → 003 → 004 → 005
```

Each file is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) — safe to re-run.

---

## Tables Summary

### `knowledge_items`
Stores all ingested knowledge base items (articles, YouTube videos, tweets, PDFs).
- Full-text search via `search_vector` (tsvector)
- Vector embeddings via `embedding vector(768)` (Jina AI)
- Entity extraction via `entities jsonb`

### `security_scans`
One row per nightly Security Council scan run. Tracks file count, finding counts by severity, raw lens output.

### `security_findings`
Individual findings from security scans. Linked to a scan via `scan_id`. Includes severity, lens, title, description, affected files, remediation, effort estimate.

### `agent_activity`
Live agent status for the War Room visualization. Updated by Clara in real-time via the update-agent-status script.
- Realtime subscription enabled via `supabase_realtime` publication
- `REPLICA IDENTITY FULL` required for Realtime to send full row data
| `006-cron-jobs.sql` | `cron_jobs` table for Cron Jobs tab | ✅ Applied |
| `007-usage-logs.sql` | `usage_logs` + `usage_collector_state` tables for Model Usage tracker | ✅ Applied Feb 18, 2026 |
| `008-sessions-log.sql` | `sessions_log` table for Sessions page | ⏳ Needs to be applied via Supabase SQL editor |
