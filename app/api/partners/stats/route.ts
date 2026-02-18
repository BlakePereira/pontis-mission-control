import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

export async function GET() {
  try {
    const [allPartnersRes, activeRes, pendingActionsRes, overdueActionsRes] =
      await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/crm_partners?select=id,pipeline_status,last_contact_at`,
          { headers: sbHeaders }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/crm_partners?select=id&pipeline_status=eq.active`,
          { headers: sbHeaders }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/crm_action_items?select=id&status=eq.pending`,
          { headers: sbHeaders }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/crm_action_items?select=id&status=eq.overdue`,
          { headers: sbHeaders }
        ),
      ]);

    const allPartners: { id: string; pipeline_status: string; last_contact_at: string | null }[] =
      allPartnersRes.ok ? await allPartnersRes.json() : [];
    const activePartners = activeRes.ok ? await activeRes.json() : [];
    const pendingActions = pendingActionsRes.ok ? await pendingActionsRes.json() : [];
    const overdueActions = overdueActionsRes.ok ? await overdueActionsRes.json() : [];

    // Compute average health score from all partners
    const healthScores = allPartners.map((p) => {
      if (!p.last_contact_at) return 10;
      const diffDays =
        (Date.now() - new Date(p.last_contact_at).getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) return 100;
      if (diffDays < 14) return 70;
      if (diffDays < 30) return 40;
      return 10;
    });

    const avgHealthScore =
      healthScores.length > 0
        ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
        : 0;

    // Pipeline status counts
    const pipelineCounts: Record<string, number> = {};
    const statuses = [
      "prospect","warm","demo_scheduled","demo_done","negotiating","active","inactive","lost"
    ];
    for (const s of statuses) pipelineCounts[s] = 0;
    for (const p of allPartners) {
      if (pipelineCounts[p.pipeline_status] !== undefined) {
        pipelineCounts[p.pipeline_status]++;
      }
    }

    return NextResponse.json({
      totalPartners: allPartners.length,
      activePartners: activePartners.length,
      openActionItems: pendingActions.length + overdueActions.length,
      overdueActionItems: overdueActions.length,
      avgHealthScore,
      pipelineCounts,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
