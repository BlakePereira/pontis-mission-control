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

function calcHealthScore(lastContactAt: string | null): number {
  if (!lastContactAt) return 10;
  const diffDays = (Date.now() - new Date(lastContactAt).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return 100;
  if (diffDays < 14) return 70;
  if (diffDays < 30) return 40;
  return 10;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [partnerRes, contactsRes, interactionsRes, actionsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/crm_partners?id=eq.${id}&select=*`, { headers: sbHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/crm_contacts?partner_id=eq.${id}&select=*&order=created_at.asc`, { headers: sbHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/crm_interactions?partner_id=eq.${id}&select=*&order=interaction_date.desc&limit=50`, { headers: sbHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/crm_action_items?partner_id=eq.${id}&select=*&order=due_date.asc`, { headers: sbHeaders }),
    ]);

    if (!partnerRes.ok) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partners: Record<string, unknown>[] = await partnerRes.json();
    if (!partners.length) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partner = {
      ...partners[0],
      health_score: calcHealthScore(partners[0].last_contact_at as string | null),
    };

    const contacts = contactsRes.ok ? await contactsRes.json() : [];
    const interactions = interactionsRes.ok ? await interactionsRes.json() : [];
    const actions = actionsRes.ok ? await actionsRes.json() : [];

    return NextResponse.json({ partner, contacts, interactions, actions });
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
    const { id } = await params;
    const body = await req.json();

    // Auto-calculate health if last_contact_at changed
    if (body.last_contact_at !== undefined) {
      body.health_score = calcHealthScore(body.last_contact_at);
    }

    body.updated_at = new Date().toISOString();

    const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_partners?id=eq.${id}`, {
      method: "PATCH",
      headers: sbHeaders,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ partner: Array.isArray(data) ? data[0] : data });
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

    const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_partners?id=eq.${id}`, {
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
