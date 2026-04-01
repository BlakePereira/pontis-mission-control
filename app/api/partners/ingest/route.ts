/**
 * POST /api/partners/ingest
 * Bulk upsert partner records from Pontis (sync endpoint).
 *
 * Auth: HTTP Basic — username: pontis / password: missioncontrol2026
 *
 * Body: Array of partner records (see PartnerRecord type below).
 *   - Matches on `id` (preferred) or `email` for upsert logic.
 *   - All fields are optional except at least one match key.
 *
 * Returns:
 *   { ok: true, inserted: N, updated: N, skipped: N, errors: [...] }
 *
 * Example:
 *   curl -X POST https://pontis-mission-control.vercel.app/api/partners/ingest \
 *     -u pontis:missioncontrol2026 \
 *     -H "Content-Type: application/json" \
 *     -d '[{"id":"abc-123","name":"Sunrise Monuments","email":"info@sunrise.com","pipeline_status":"customer"}]'
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// The shape of a partner record coming in from Pontis
interface PartnerRecord {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  territory?: string;
  partner_type?: string;
  pipeline_status?: string;
  lead_source?: string;
  notes?: string;
  mrr?: number;
  total_medallions_ordered?: number;
  delivery_radius_miles?: number;
  last_contact_at?: string;
  next_action?: string;
  next_action_due?: string;
  next_action_assignee?: string;
  is_tracked?: boolean;
  [key: string]: unknown;
}

// Basic auth check
function checkAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return false;
  const base64Creds = authHeader.slice(6);
  const creds = Buffer.from(base64Creds, "base64").toString("utf-8");
  return creds === "pontis:missioncontrol2026";
}

// Look up an existing partner by id or email
async function findExisting(record: PartnerRecord): Promise<string | null> {
  // Try by id first
  if (record.id) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_partners?id=eq.${encodeURIComponent(record.id)}&select=id`,
      { headers: sbHeaders }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data[0].id;
  }

  // Fall back to email match
  if (record.email) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_partners?email=eq.${encodeURIComponent(record.email)}&select=id`,
      { headers: sbHeaders }
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data[0].id;
  }

  return null;
}

export async function POST(req: NextRequest) {
  // 1. Auth
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Mission Control"' },
      }
    );
  }

  // 2. Parse body
  let records: PartnerRecord[];
  try {
    const body = await req.json();
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Body must be an array of partner records" },
        { status: 400 }
      );
    }
    records = body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (records.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, updated: 0, skipped: 0, errors: [] });
  }

  // 3. Process each record
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ record: unknown; error: string }> = [];

  for (const record of records) {
    // Must have at least one match key
    if (!record.id && !record.email) {
      skipped++;
      errors.push({ record, error: "Skipped: no id or email to match on" });
      continue;
    }

    try {
      const existingId = await findExisting(record);
      const now = new Date().toISOString();

      if (existingId) {
        // UPDATE existing record
        const payload: PartnerRecord & { updated_at: string } = {
          ...record,
          updated_at: now,
        };
        // Don't overwrite the DB id with the incoming one if different
        delete payload.id;

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/crm_partners?id=eq.${existingId}`,
          {
            method: "PATCH",
            headers: sbHeaders,
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          const text = await res.text();
          errors.push({ record, error: `Update failed: ${text}` });
        } else {
          updated++;
        }
      } else {
        // INSERT new record
        const payload: PartnerRecord & { created_at: string; updated_at: string } = {
          ...record,
          created_at: now,
          updated_at: now,
        };

        const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_partners`, {
          method: "POST",
          headers: { ...sbHeaders, Prefer: "return=minimal" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text();
          errors.push({ record, error: `Insert failed: ${text}` });
        } else {
          inserted++;
        }
      }
    } catch (err: unknown) {
      errors.push({ record, error: String(err) });
    }
  }

  return NextResponse.json({
    ok: errors.length === 0 || inserted + updated > 0,
    inserted,
    updated,
    skipped,
    errors,
    total: records.length,
  });
}
