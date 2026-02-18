import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SYNC_SECRET = process.env.CRON_SYNC_SECRET;

const supaHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

interface RawCronJob {
  id: string;
  name: string;
  enabled?: boolean;
  schedule?: {
    kind?: string;
    expr?: string;
    everyMs?: number;
    tz?: string;
  };
  sessionTarget?: string;
  payload?: { kind?: string };
  state?: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastDurationMs?: number;
  };
}

function toRow(job: RawCronJob) {
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

export async function POST(req: NextRequest) {
  // Validate sync secret
  const secret = req.headers.get("x-sync-secret");
  if (!CRON_SYNC_SECRET || secret !== CRON_SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobs } = body as { jobs: RawCronJob[] };

    if (!Array.isArray(jobs)) {
      return NextResponse.json({ error: "jobs must be an array" }, { status: 400 });
    }

    const rows = jobs.map(toRow);

    const res = await fetch(`${SUPABASE_URL}/rest/v1/cron_jobs`, {
      method: "POST",
      headers: {
        ...supaHeaders,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true, upserted: rows.length });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
