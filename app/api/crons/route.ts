import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/cron_jobs?select=*&order=name.asc`,
      { headers }
    );
    const data = await res.json();
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: JSON.stringify(data), jobs: [] });
    }
    return NextResponse.json({ jobs: data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, jobs: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobs } = body as { jobs: Record<string, unknown>[] };

    if (!Array.isArray(jobs)) {
      return NextResponse.json({ error: "jobs must be an array" }, { status: 400 });
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/cron_jobs`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(jobs),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true, upserted: jobs.length });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
