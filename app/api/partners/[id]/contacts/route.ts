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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params;
    const body = await req.json();
    const contactId = body.contactId;

    if (!contactId) {
      return NextResponse.json({ error: "contactId required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.role !== undefined) updates.role = body.role;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.email !== undefined) updates.email = body.email;
    if (body.preferred_contact_method !== undefined) updates.preferred_contact_method = body.preferred_contact_method;
    if (body.notes !== undefined) updates.notes = body.notes;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_contacts?id=eq.${contactId}&partner_id=eq.${partnerId}`,
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
    return NextResponse.json({ contact: Array.isArray(data) ? data[0] : data });
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
    const contactId = searchParams.get("contactId");

    if (!contactId) {
      return NextResponse.json({ error: "contactId query param required" }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/crm_contacts?id=eq.${contactId}&partner_id=eq.${partnerId}`,
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
