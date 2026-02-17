import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);

export async function POST(req: NextRequest) {
  const { agent_name, status, current_task } = await req.json();

  if (!agent_name || !status) {
    return NextResponse.json({ error: "agent_name and status required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("agent_activity")
    .upsert(
      { agent_name, status, current_task, updated_at: new Date().toISOString() },
      { onConflict: "agent_name" }
    )
    .select();

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function GET() {
  const { data, error } = await supabase.from("agent_activity").select("*");

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json(data);
}
