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
    const providerFilter = searchParams.get("provider") || "";
    const modelFilter = searchParams.get("model") || "";
    const kindFilter = searchParams.get("sessionKind") || "";

    const periodStart = getPeriodStart(period);

    // Build filter string
    let filters = "";
    if (periodStart) filters += `&recorded_at=gte.${encodeURIComponent(periodStart)}`;
    if (providerFilter) filters += `&provider=eq.${encodeURIComponent(providerFilter)}`;
    if (modelFilter) filters += `&model=eq.${encodeURIComponent(modelFilter)}`;
    if (kindFilter) filters += `&session_kind=eq.${encodeURIComponent(kindFilter)}`;

    // Fetch all matching records (for summary + daily aggregation)
    const allUrl = `${SUPABASE_URL}/rest/v1/usage_logs?select=*&order=recorded_at.desc${filters}&limit=5000`;
    const allRes = await fetch(allUrl, { headers });
    if (!allRes.ok) {
      const text = await allRes.text();
      return NextResponse.json({ error: text }, { status: 500 });
    }
    const allRecords: Record<string, unknown>[] = await allRes.json();

    // Compute summary
    let totalCost = 0;
    let totalCalls = 0;
    let totalTokens = 0;
    const byProvider: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    const bySessionKind: Record<string, number> = {};
    const dailyMap: Record<string, { cost: number; calls: number; tokens: number }> = {};

    for (const r of allRecords) {
      const cost = parseFloat(r.cost_total as string) || 0;
      const tokens = (r.total_tokens as number) || 0;
      totalCost += cost;
      totalCalls += 1;
      totalTokens += tokens;

      const prov = (r.provider as string) || "unknown";
      byProvider[prov] = (byProvider[prov] || 0) + cost;

      const model = (r.model as string) || "unknown";
      byModel[model] = (byModel[model] || 0) + cost;

      const kind = (r.session_kind as string) || "unknown";
      bySessionKind[kind] = (bySessionKind[kind] || 0) + cost;

      // Daily grouping
      const date = (r.recorded_at as string).slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { cost: 0, calls: 0, tokens: 0 };
      dailyMap[date].cost += cost;
      dailyMap[date].calls += 1;
      dailyMap[date].tokens += tokens;
    }

    // Build last 14 days for the chart (fill in missing days with zeros)
    const daily = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      daily.push({
        date: dateStr,
        cost: dailyMap[dateStr]?.cost || 0,
        calls: dailyMap[dateStr]?.calls || 0,
        tokens: dailyMap[dateStr]?.tokens || 0,
      });
    }

    // Fetch totals for all-time, today, this week, this month (for the top stats)
    const todayStart = getPeriodStart("day");
    const weekStart = getPeriodStart("week");
    const monthStart = getPeriodStart("month");

    const [todayRes, weekRes, monthRes, allTimeRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/usage_logs?select=cost_total&recorded_at=gte.${encodeURIComponent(todayStart!)}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/usage_logs?select=cost_total&recorded_at=gte.${encodeURIComponent(weekStart!)}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/usage_logs?select=cost_total&recorded_at=gte.${encodeURIComponent(monthStart!)}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/usage_logs?select=cost_total`, { headers }),
    ]);

    const sumCost = (rows: { cost_total: string }[]) =>
      rows.reduce((acc, r) => acc + (parseFloat(r.cost_total) || 0), 0);

    const todayData = todayRes.ok ? await todayRes.json() : [];
    const weekData = weekRes.ok ? await weekRes.json() : [];
    const monthData = monthRes.ok ? await monthRes.json() : [];
    const allTimeData = allTimeRes.ok ? await allTimeRes.json() : [];

    // Top models by calls
    const modelCalls: Record<string, number> = {};
    for (const r of allRecords) {
      const model = (r.model as string) || "unknown";
      modelCalls[model] = (modelCalls[model] || 0) + 1;
    }
    const mostUsedModel = Object.entries(modelCalls).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const mostExpensiveModel = Object.entries(byModel).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    // Recent calls (last 50)
    const recentCalls = allRecords.slice(0, 50);

    return NextResponse.json({
      summary: {
        totalCost,
        totalCalls,
        totalTokens,
        byProvider,
        byModel,
        bySessionKind,
        mostUsedModel,
        mostExpensiveModel,
        avgCostPerCall: totalCalls > 0 ? totalCost / totalCalls : 0,
      },
      topStats: {
        today: sumCost(todayData),
        week: sumCost(weekData),
        month: sumCost(monthData),
        allTime: sumCost(allTimeData),
      },
      daily,
      recentCalls,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
