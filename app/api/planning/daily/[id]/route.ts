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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updates.status = body.status;
      updates.completed_at = body.status === "done" ? new Date().toISOString() : null;
    }
    if (body.task !== undefined) updates.task = body.task;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.goal_id !== undefined) updates.goal_id = body.goal_id;
    if (body.owner !== undefined) updates.owner = body.owner;
    if (body.date !== undefined) updates.date = body.date;
    if (body.week_id !== undefined) updates.week_id = body.week_id;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/planning_daily?id=eq.${id}`, {
      method: "PATCH",
      headers: sbHeaders,
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ task: Array.isArray(data) ? data[0] : data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/planning_daily?id=eq.${id}`, {
      method: "DELETE",
      headers: { ...sbHeaders, Prefer: "return=minimal" },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
