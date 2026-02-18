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
      `${SUPABASE_URL}/rest/v1/crm_contacts?partner_id=eq.${id}&select=*&order=created_at.asc`,
      { headers: sbHeaders }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text, contacts: [] }, { status: 500 });
    }

    const contacts = await res.json();
    return NextResponse.json({ contacts });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, contacts: [] }, { status: 500 });
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
      name: body.name,
      role: body.role ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      preferred_contact_method: body.preferred_contact_method ?? "email",
      notes: body.notes ?? null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_contacts`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ contact: Array.isArray(data) ? data[0] : data }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
