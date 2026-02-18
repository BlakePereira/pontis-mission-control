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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const health = searchParams.get("health");
    const search = searchParams.get("search");
    const assignee = searchParams.get("assignee");
    const partnerType = searchParams.get("partnerType");

    let url = `${SUPABASE_URL}/rest/v1/crm_partners?select=*,crm_contacts(id,name,role,email,phone,preferred_contact_method)&order=created_at.desc&limit=500`;

    if (status && status !== "all") {
      url += `&pipeline_status=eq.${encodeURIComponent(status)}`;
    }
    if (assignee && assignee !== "all") {
      url += `&next_action_assignee=eq.${encodeURIComponent(assignee)}`;
    }
    if (partnerType && partnerType !== "all") {
      url += `&partner_type=eq.${encodeURIComponent(partnerType)}`;
    }
    if (search) {
      url += `&name=ilike.${encodeURIComponent(`%${search}%`)}`;
    }

    const res = await fetch(url, { headers: sbHeaders });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text, partners: [] }, { status: 500 });
    }

    let partners: Record<string, unknown>[] = await res.json();

    // Recalculate health scores dynamically and apply health filter
    partners = partners.map((p) => ({
      ...p,
      health_score: calcHealthScore(p.last_contact_at as string | null),
    }));

    if (health && health !== "all") {
      partners = partners.filter((p) => {
        const score = p.health_score as number;
        if (health === "healthy") return score > 70;
        if (health === "warning") return score >= 40 && score <= 70;
        if (health === "critical") return score < 40;
        return true;
      });
    }

    return NextResponse.json({ partners });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, partners: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Auto-calculate health score on creation
    const health_score = calcHealthScore(body.last_contact_at ?? null);

    const payload = {
      name: body.name,
      address: body.address ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      zip: body.zip ?? null,
      territory: body.territory ?? null,
      website: body.website ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      partner_type: body.partner_type ?? "monument_company",
      pipeline_status: body.pipeline_status ?? "prospect",
      lead_source: body.lead_source ?? null,
      total_medallions_ordered: body.total_medallions_ordered ?? 0,
      mrr: body.mrr ?? 0,
      last_contact_at: body.last_contact_at ?? null,
      next_action: body.next_action ?? null,
      next_action_due: body.next_action_due ?? null,
      next_action_assignee: body.next_action_assignee ?? null,
      health_score,
      notes: body.notes ?? null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/crm_partners`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ partner: Array.isArray(data) ? data[0] : data }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
