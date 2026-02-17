import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boardSlug = searchParams.get("board");

    // Fetch boards
    const boardsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/kanban_boards?select=*&order=display_order.asc`,
      { headers }
    );
    const boards = await boardsRes.json();

    // Fetch tasks
    let tasksUrl = `${SUPABASE_URL}/rest/v1/kanban_tasks?select=*&archived=eq.false&order=created_at.asc`;
    if (boardSlug) {
      tasksUrl += `&board=eq.${encodeURIComponent(boardSlug)}`;
    }
    const tasksRes = await fetch(tasksUrl, { headers });
    const tasks = await tasksRes.json();

    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: JSON.stringify(tasks), tasks: [], boards: Array.isArray(boards) ? boards : [] }, { status: 200 });
    }

    return NextResponse.json({ tasks, boards: Array.isArray(boards) ? boards : [] });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, tasks: [], boards: [] }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, status, board, assignee, priority } = body;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/kanban_tasks`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({
        title,
        description: description || "",
        status: status || "backlog",
        board,
        assignee: assignee || "",
        priority: priority || "medium",
        archived: false,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ task: Array.isArray(data) ? data[0] : data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/kanban_tasks?id=eq.${id}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(updates),
      }
    );

    const data = await res.json();
    return NextResponse.json({ task: Array.isArray(data) ? data[0] : data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
