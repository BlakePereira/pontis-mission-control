import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  try {
    // Fetch all partners with coordinates
    const url = `${SUPABASE_URL}/rest/v1/crm_partners?select=id,name,city,state,partner_type,pipeline_status,phone,website,latitude,longitude,delivery_radius_miles&latitude=not.is.null&longitude=not.is.null&order=name.asc`;

    const res = await fetch(url, { headers: sbHeaders });
    
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text, partners: [] }, { status: 500 });
    }

    const partners = await res.json();

    return NextResponse.json({ partners });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, partners: [] }, { status: 500 });
  }
}
