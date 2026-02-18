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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_interactions?partner_id=eq.${id}&select=*&order=interaction_date.desc`,
      { headers: sbHeaders }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text, interactions: [] }, { status: 500 });
    }

    const interactions = await res.json();
    return NextResponse.json({ interactions });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, interactions: [] }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const interactionDate = body.interaction_date ?? new Date().toISOString();

    const payload = {
      partner_id: id,
      contact_id: body.contact_id ?? null,
      type: body.type,
      direction: body.direction ?? null,
      summary: body.summary,
      outcome: body.outcome ?? null,
      logged_by: body.logged_by ?? null,
      raw_note: body.raw_note ?? null,
      interaction_date: interactionDate,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_interactions`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    // Also update partner's last_contact_at
    const updateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_partners?id=eq.${id}`,
      {
        method: "PATCH",
        headers: sbHeaders,
        body: JSON.stringify({
          last_contact_at: interactionDate,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!updateRes.ok) {
      // Non-fatal — log but don't fail
      console.error("Failed to update last_contact_at:", await updateRes.text());
    }

    const data = await res.json();
    return NextResponse.json({ interaction: Array.isArray(data) ? data[0] : data }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params;
    const body = await req.json();
    const interactionId = body.interactionId;

    if (!interactionId) {
      return NextResponse.json({ error: "interactionId required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.type !== undefined) updates.type = body.type;
    if (body.direction !== undefined) updates.direction = body.direction;
    if (body.summary !== undefined) updates.summary = body.summary;
    if (body.outcome !== undefined) updates.outcome = body.outcome;
    if (body.logged_by !== undefined) updates.logged_by = body.logged_by;
    if (body.raw_note !== undefined) updates.raw_note = body.raw_note;
    if (body.interaction_date !== undefined) updates.interaction_date = body.interaction_date;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_interactions?id=eq.${interactionId}&partner_id=eq.${partnerId}`,
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
    return NextResponse.json({ interaction: Array.isArray(data) ? data[0] : data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params;
    const { searchParams } = new URL(req.url);
    const interactionId = searchParams.get("interactionId");

    if (!interactionId) {
      return NextResponse.json({ error: "interactionId query param required" }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_interactions?id=eq.${interactionId}&partner_id=eq.${partnerId}`,
      {
        method: "DELETE",
        headers: { ...sbHeaders, Prefer: "return=minimal" },
      }
    );

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
