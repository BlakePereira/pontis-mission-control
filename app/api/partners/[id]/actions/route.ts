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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_action_items?partner_id=eq.${id}&select=*&order=due_date.asc`,
      { headers: sbHeaders }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text, actions: [] }, { status: 500 });
    }

    const actions = await res.json();
    return NextResponse.json({ actions });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, actions: [] }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const payload = {
      partner_id: id,
      title: body.title,
      description: body.description ?? null,
      due_date: body.due_date ?? null,
      priority: body.priority ?? "medium",
      assignee: body.assignee ?? null,
      status: "pending",
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_action_items`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ action: Array.isArray(data) ? data[0] : data }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: partnerId } = params;
    const body = await req.json();
    const actionId = body.id;

    if (!actionId) {
      return NextResponse.json({ error: "Action item id required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.assignee !== undefined) updates.assignee = body.assignee;

    // Auto-set completed_at
    if (body.status === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_action_items?id=eq.${actionId}&partner_id=eq.${partnerId}`,
      {
        method: "PATCH",
        headers: sbHeaders,
        body: JSON.stringify(updates),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ action: Array.isArray(data) ? data[0] : data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
