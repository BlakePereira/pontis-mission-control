import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, Content } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 30;

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function fetchPlanningContext(quarter: string) {
  const [goalsRes, weeksRes, dailyRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/planning_goals?quarter=eq.${encodeURIComponent(quarter)}&order=created_at.desc`, { headers: sbHeaders }),
    fetch(`${SUPABASE_URL}/rest/v1/planning_weeks?quarter=eq.${encodeURIComponent(quarter)}&order=week_start.desc&limit=4`, { headers: sbHeaders }),
    fetch(`${SUPABASE_URL}/rest/v1/planning_daily?order=date.desc&limit=50`, { headers: sbHeaders }),
  ]);

  const [goals, weeks, daily] = await Promise.all([
    goalsRes.ok ? goalsRes.json() : [],
    weeksRes.ok ? weeksRes.json() : [],
    dailyRes.ok ? dailyRes.json() : [],
  ]);

  return { goals, weeks, daily };
}

function buildSystemPrompt(ctx: { goals: Record<string, unknown>[]; weeks: Record<string, unknown>[]; daily: Record<string, unknown>[] }, quarter: string): string {
  const goalsText = ctx.goals.map((g: Record<string, unknown>) =>
    `- ${g.title} | ${g.current_value}/${g.target_value} ${g.unit || ""} | Status: ${g.status} | Owner: ${g.owner || "all"} | ID: ${g.id}`
  ).join("\n") || "No goals set yet.";

  const weeksText = ctx.weeks.map((w: Record<string, unknown>) => {
    const outcomes = Array.isArray(w.planned_outcomes) ? w.planned_outcomes : [];
    const outcomesStr = outcomes.map((o: Record<string, unknown>) => `  • ${o.title} (${o.status || "pending"})`).join("\n");
    return `Week of ${w.week_start}:\n  Theme: ${w.theme || "none"}\n${outcomesStr || "  No outcomes"}`;
  }).join("\n") || "No weekly plans yet.";

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = ctx.daily.filter((t: Record<string, unknown>) => t.date === today);
  const recentTasks = ctx.daily.filter((t: Record<string, unknown>) => t.date !== today).slice(0, 30);

  const todayText = todayTasks.length > 0
    ? todayTasks.map((t: Record<string, unknown>) => `- [${t.status}] ${t.owner}: ${t.task} (goal: ${t.goal_id || "none"})`).join("\n")
    : "No tasks for today yet.";

  const recentText = recentTasks.length > 0
    ? recentTasks.map((t: Record<string, unknown>) => `- ${t.date} [${t.status}] ${t.owner}: ${t.task}`).join("\n")
    : "No recent task history.";

  return `You are Clara, AI cofounder at Pontis. You help Blake and Joe plan and execute quarterly goals.

Current Quarter: ${quarter}
Today: ${today}

QUARTERLY GOALS:
${goalsText}

RECENT WEEKLY PLANS:
${weeksText}

TODAY'S TASKS:
${todayText}

RECENT TASK HISTORY (last 7 days):
${recentText}

Help them prioritize, break down goals into actionable tasks, identify blockers, and stay focused.
Be direct, specific, and practical. When suggesting tasks, reference which quarterly goal they map to.

IMPORTANT: You MUST respond with valid JSON only. No text before or after the JSON. Format:
{
  "reply": "Your conversational response in markdown",
  "actions": [
    {
      "type": "create_daily_task",
      "data": { "owner": "blake|joe|clara", "task": "description", "goal_id": "id or null", "date": "YYYY-MM-DD", "priority": 1 }
    },
    {
      "type": "update_goal_progress",
      "data": { "goal_id": "id", "current_value": 123 }
    },
    {
      "type": "update_goal_status",
      "data": { "goal_id": "id", "status": "on_track|at_risk|behind|completed" }
    }
  ]
}

The actions array should be empty [] if no actions are needed. Only include actions when the user asks you to create tasks, update progress, or you're proactively suggesting concrete next steps.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], quarter = "2026-Q1" } = body as {
      message: string;
      history: ChatMessage[];
      quarter: string;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim() || "AIzaSyAyWZ77ff-BPW5FF90ufzDToK1QMsTtr94";
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const ctx = await fetchPlanningContext(quarter);
    const systemPrompt = buildSystemPrompt(ctx, quarter);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    // Convert chat history to Gemini format
    const contents = history.slice(-10).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Add current message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const chatSession = model.startChat({
      history: contents.slice(0, -1), // All messages except the last one
    });

    const result = await chatSession.sendMessage(message);
    let rawText = result.response.text();

    // Strip markdown code blocks if present
    rawText = rawText.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '');

    let reply = rawText;
    let actions: unknown[] = [];

    try {
      const parsed = JSON.parse(rawText);
      if (parsed.reply) {
        reply = parsed.reply;
        actions = Array.isArray(parsed.actions) ? parsed.actions : [];
      }
    } catch {
      // If not valid JSON, use raw text as reply
    }

    return NextResponse.json({ reply, actions });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Planning chat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
