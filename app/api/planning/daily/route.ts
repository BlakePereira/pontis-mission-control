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
    const date = searchParams.get("date");
    const owner = searchParams.get("owner");
    const weekId = searchParams.get("week_id");

    let url = `${SUPABASE_URL}/rest/v1/planning_daily?select=*&order=date.asc,priority.asc,created_at.asc&limit=1000`;
    if (date) {
      url += `&date=eq.${encodeURIComponent(date)}`;
    }
    if (owner) {
      url += `&owner=eq.${encodeURIComponent(owner)}`;
    }
    if (weekId) {
      url += `&week_id=eq.${encodeURIComponent(weekId)}`;
    }

    const res = await fetch(url, { headers: sbHeaders });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text, tasks: [] }, { status: 500 });
    }

    const tasks = await res.json();
    return NextResponse.json({ tasks: Array.isArray(tasks) ? tasks : [] });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, tasks: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = {
      date: body.date,
      week_id: body.week_id ?? null,
      owner: body.owner,
      task: body.task,
      goal_id: body.goal_id ?? null,
      priority: body.priority ?? 1,
      status: body.status ?? "pending",
      notes: body.notes ?? null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/planning_daily`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ task: Array.isArray(data) ? data[0] : data }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
