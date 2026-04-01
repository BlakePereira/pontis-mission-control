# Mission Control Scripts

Utility scripts for syncing data, running migrations, and managing Mission Control state.

---

## sync-partners.mjs

**Syncs Pontis CRM partner records into Mission Control.**

Reads all records from the `crm_partners` table in the Pontis Supabase and POSTs them to the `/api/partners/ingest` endpoint.

### Usage

```bash
# Run against local dev server (default)
node mission-control/scripts/sync-partners.mjs

# Run against production
MC_URL=https://pontis-mission-control.vercel.app node mission-control/scripts/sync-partners.mjs
```

### Environment overrides (all optional)

| Variable | Default | Description |
|---|---|---|
| `PONTIS_SUPABASE_URL` | Pontis Supabase URL | Source Supabase instance |
| `PONTIS_SUPABASE_KEY` | Service role key | Supabase service role key |
| `MC_URL` | `http://localhost:3000` | Mission Control base URL |
| `MC_USERNAME` | `pontis` | Basic auth username |
| `MC_PASSWORD` | `missioncontrol2026` | Basic auth password |

### What it does

1. Pages through all `crm_partners` records (1000 per page)
2. POSTs them to `/api/partners/ingest` in batches of 50
3. Logs inserted / updated / skipped counts per batch and a final summary
4. Exits non-zero if any errors occurred

### Schema note

> The task description referenced a `fulfillment_partners` table. That table does not exist in the current Pontis Supabase schema. The actual partner table is `crm_partners`. Both this script and the ingest endpoint use `crm_partners`.

---

## /api/partners/ingest endpoint

**POST /api/partners/ingest**

Accepts an array of partner records and upserts them into `crm_partners`.

- **Auth:** HTTP Basic (`pontis` / `missioncontrol2026`)
- **Match logic:** Looks up by `id` first, then `email`
- **On match:** Updates the existing record
- **No match:** Inserts a new record
- **Returns:** `{ ok, inserted, updated, skipped, errors, total }`

```bash
# Test with curl (local)
curl -X POST http://localhost:3000/api/partners/ingest \
  -u pontis:missioncontrol2026 \
  -H "Content-Type: application/json" \
  -d '[{"id":"test-001","name":"Test Monument Co","email":"test@example.com","pipeline_status":"prospect"}]'
```

---

## Other Scripts

| Script | Purpose |
|---|---|
| `sync-sessions.mjs` | Sync OpenClaw session transcripts to Supabase |
| `collect-usage.mjs` | Collect usage metrics |
| `sync-crons.mjs` | Sync cron job state |
| `generate-weekly-plan.mjs` | Generate weekly planning data |
| `import-monument-companies.mjs` | One-time import of monument company data |
| `run-migration.mjs` | Run database migrations |
| `run-crm-migration.mjs` | Run CRM-specific migrations |
| `setup-crm-simple.mjs` | Simple CRM setup helper |
| `friday-retro.mjs` | Friday retrospective automation |
| `verify-pages.sh` | Verify deployed pages are responding |
