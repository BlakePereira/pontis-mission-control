import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

function getPeriodStart(period: string): string | null {
  const now = new Date();
  if (period === "day") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (period === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  return null; // "all"
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "week";
    const kindFilter = searchParams.get("kind") || "all";
    const statusFilter = searchParams.get("status") || "all";

    const periodStart = getPeriodStart(period);
    const todayStart = getPeriodStart("day")!;
    const weekStart = getPeriodStart("week")!;

    // Build filter query string for main session fetch
    let filters = "";
    if (periodStart) filters += `&last_active_at=gte.${encodeURIComponent(periodStart)}`;
    if (kindFilter && kindFilter !== "all") filters += `&kind=eq.${encodeURIComponent(kindFilter)}`;
    if (statusFilter && statusFilter !== "all") filters += `&status=eq.${encodeURIComponent(statusFilter)}`;

    // Fetch filtered sessions
    const sessionsUrl = `${SUPABASE_URL}/rest/v1/sessions_log?select=*&order=last_active_at.desc${filters}&limit=500`;
    const sessionsRes = await fetch(sessionsUrl, { headers });
    if (!sessionsRes.ok) {
      const text = await sessionsRes.text();
      return NextResponse.json({ error: text, sessions: [], summary: {} }, { status: 500 });
    }
    const sessions: Record<string, unknown>[] = await sessionsRes.json();

    // Fetch summary data in parallel
    const [activeRes, todayRes, weekRes, subagentsRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/sessions_log?select=id&status=eq.active`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/sessions_log?select=id&last_active_at=gte.${encodeURIComponent(todayStart)}`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/sessions_log?select=cost_total,total_tokens&last_active_at=gte.${encodeURIComponent(weekStart)}`,
        { headers }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/sessions_log?select=id&kind=eq.subagent`,
        { headers }
      ),
    ]);

    const activeData: { id: string }[] = activeRes.ok ? await activeRes.json() : [];
    const todayData: { id: string }[] = todayRes.ok ? await todayRes.json() : [];
    const weekData: { cost_total: string; total_tokens: number }[] = weekRes.ok
      ? await weekRes.json()
      : [];
    const subagentsData: { id: string }[] = subagentsRes.ok
      ? await subagentsRes.json()
      : [];

    const totalCostThisWeek = weekData.reduce(
      (acc, r) => acc + (parseFloat(r.cost_total as string) || 0),
      0
    );
    const totalTokensThisWeek = weekData.reduce(
      (acc, r) => acc + ((r.total_tokens as number) || 0),
      0
    );

    // Compute average cost per session this week
    const avgCost = weekData.length > 0 ? totalCostThisWeek / weekData.length : 0;

    // Live activity = sessions with status=active
    const liveActivity = sessions.filter((s) => s.status === "active");

    const summary = {
      activeNow: activeData.length,
      todayCount: todayData.length,
      subagentsRun: subagentsData.length,
      avgCost,
      totalTokensThisWeek,
      totalCostThisWeek,
    };

    return NextResponse.json({ summary, sessions, liveActivity });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, sessions: [], summary: {} }, { status: 500 });
  }
}
