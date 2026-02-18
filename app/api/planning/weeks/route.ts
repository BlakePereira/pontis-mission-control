import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quarter = searchParams.get("quarter");

    let url = `${SUPABASE_URL}/rest/v1/planning_weeks?select=*&order=week_start.asc&limit=500`;
    if (quarter) {
      url += `&quarter=eq.${encodeURIComponent(quarter)}`;
    }

    const res = await fetch(url, { headers: sbHeaders });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text, weeks: [] }, { status: 500 });
    }

    const weeks = await res.json();
    return NextResponse.json({ weeks: Array.isArray(weeks) ? weeks : [] });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, weeks: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      week_start: body.week_start,
      quarter: body.quarter,
      theme: body.theme ?? null,
      planned_outcomes: Array.isArray(body.planned_outcomes) ? body.planned_outcomes : [],
      retrospective: body.retrospective ?? null,
      score: body.score ?? null,
      blake_score: body.blake_score ?? null,
      joe_score: body.joe_score ?? null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/planning_weeks`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ week: Array.isArray(data) ? data[0] : data }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
