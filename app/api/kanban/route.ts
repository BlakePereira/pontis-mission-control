import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("board_id");

    let query = supabase
      .from("kanban_tasks")
      .select("*")
      .order("position", { ascending: true });

    if (boardId) {
      query = query.eq("board_id", parseInt(boardId));
    }

    const { data: tasks, error } = await query;
    if (error) throw error;

    const { data: boards, error: bErr } = await supabase
      .from("kanban_boards")
      .select("*")
      .order("id");
    if (bErr) throw bErr;

    return NextResponse.json({ tasks, boards });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, tasks: [], boards: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { title, description, status, board_id, assigned_to } = body;

    // Get max position for this board
    const { data: existing } = await supabase
      .from("kanban_tasks")
      .select("position")
      .eq("board_id", board_id)
      .order("position", { ascending: false })
      .limit(1);

    const position = existing && existing.length > 0 ? (existing[0].position || 0) + 1 : 0;

    const { data, error } = await supabase
      .from("kanban_tasks")
      .insert([{ title, description, status: status || "todo", board_id, assigned_to, position }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from("kanban_tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ task: data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
