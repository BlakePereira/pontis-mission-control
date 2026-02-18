import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: NextRequest) {
  const { id, summary } = await req.json();

  if (!id || typeof summary !== "string") {
    return NextResponse.json({ error: "id and summary are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("knowledge_items")
    .update({ summary: summary.trim() })
    .eq("id", id)
    .select("id, title, summary")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, item: data });
}
