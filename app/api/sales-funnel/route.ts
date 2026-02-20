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

const PIPELINE_STAGES = [
  "prospect",
  "warm",
  "demo_scheduled",
  "demo_done",
  "negotiating",
  "active",
  "inactive",
  "lost",
];

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
    const search = searchParams.get("search");
    const stateFilter = searchParams.get("state");
    const territoryFilter = searchParams.get("territory");
    const hideInactiveLost = searchParams.get("hideInactiveLost") === "true";

    let url = `${SUPABASE_URL}/rest/v1/crm_partners?select=*&partner_type=eq.monument_company&order=pipeline_status.asc,last_contact_at.desc&limit=1000`;

    if (search) {
      url += `&name=ilike.${encodeURIComponent(`%${search}%`)}`;
    }
    if (stateFilter && stateFilter !== "all") {
      url += `&state=eq.${encodeURIComponent(stateFilter)}`;
    }
    if (territoryFilter && territoryFilter !== "all") {
      url += `&territory=eq.${encodeURIComponent(territoryFilter)}`;
    }

    const res = await fetch(url, { headers: sbHeaders });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text, partners: [], stages: {} }, { status: 500 });
    }

    let partners: Record<string, unknown>[] = await res.json();

    // Recalculate health scores
    partners = partners.map((p) => ({
      ...p,
      health_score: calcHealthScore(p.last_contact_at as string | null),
    }));

    // Filter out inactive/lost if requested
    if (hideInactiveLost) {
      partners = partners.filter((p) => {
        const status = p.pipeline_status as string;
        return status !== "inactive" && status !== "lost";
      });
    }

    // Group by pipeline_status
    const stages: Record<string, unknown[]> = {};
    PIPELINE_STAGES.forEach((stage) => {
      stages[stage] = [];
    });

    partners.forEach((p) => {
      const status = p.pipeline_status as string;
      if (stages[status]) {
        stages[status].push(p);
      }
    });

    // Calculate stats
    const total = partners.length;
    const activePipeline = (stages.warm?.length || 0) + (stages.demo_scheduled?.length || 0) + (stages.demo_done?.length || 0) + (stages.negotiating?.length || 0);
    const won = stages.active?.length || 0;
    const lost = stages.lost?.length || 0;
    const conversionRate = total > 0 ? ((won / total) * 100).toFixed(1) : "0.0";

    // Pipeline value estimate (active companies × avg medallion order)
    const activePartners = (stages.active || []) as Array<Record<string, unknown>>;
    const totalMedallions = activePartners.reduce((sum: number, p: Record<string, unknown>) => sum + (Number(p.total_medallions_ordered) || 0), 0);
    const avgMedallionsPerPartner = activePartners.length > 0 ? totalMedallions / activePartners.length : 0;
    const pipelineValue = activePipeline * avgMedallionsPerPartner * 50; // Assume $50 per medallion

    return NextResponse.json({
      partners,
      stages,
      stats: {
        total,
        activePipeline,
        won,
        lost,
        conversionRate: `${conversionRate}%`,
        pipelineValue: Math.round(pipelineValue),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, partners: [], stages: {} }, { status: 500 });
  }
}
