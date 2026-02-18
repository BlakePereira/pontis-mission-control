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

    let url = `${SUPABASE_URL}/rest/v1/planning_goals?select=*&order=created_at.desc&limit=500`;
    if (quarter) {
      url += `&quarter=eq.${encodeURIComponent(quarter)}`;
    }

    const res = await fetch(url, { headers: sbHeaders });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text, goals: [] }, { status: 500 });
    }

    const goals = await res.json();
    return NextResponse.json({ goals: Array.isArray(goals) ? goals : [] });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, goals: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      title: body.title,
      description: body.description ?? null,
      quarter: body.quarter,
      category: body.category ?? "business",
      target_metric: body.target_metric ?? null,
      current_value: body.current_value ?? 0,
      target_value: body.target_value ?? 0,
      unit: body.unit ?? null,
      status: body.status ?? "on_track",
      owner: body.owner ?? null,
      notes: body.notes ?? null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/planning_goals`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ goal: Array.isArray(data) ? data[0] : data }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
