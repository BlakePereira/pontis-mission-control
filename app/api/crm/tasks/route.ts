import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

type Partner = {
  id: string;
  name: string;
  pipeline_status: string;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  next_action_assignee: string | null;
};

type ActionItem = {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  assignee: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
};

function daysFromNow(iso: string | null) {
  if (!iso) return null;
  const target = new Date(iso);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function lastContactAgeDays(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  try {
    const [actionsRes, partnersRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/crm_action_items?select=*&order=due_date.asc.nullslast,created_at.desc&limit=1000`, { headers: sbHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/crm_partners?select=id,name,pipeline_status,last_contact_at,next_action,next_action_due,next_action_assignee&order=name.asc&limit=1000`, { headers: sbHeaders }),
    ]);

    if (!actionsRes.ok || !partnersRes.ok) {
      const actionError = actionsRes.ok ? "" : await actionsRes.text();
      const partnerError = partnersRes.ok ? "" : await partnersRes.text();
      return NextResponse.json({ error: actionError || partnerError }, { status: 500 });
    }

    const actions: ActionItem[] = await actionsRes.json();
    const partners: Partner[] = await partnersRes.json();
    const partnerMap = new Map(partners.map((partner) => [partner.id, partner]));

    const openActions = actions
      .filter((action) => action.status !== "completed")
      .map((action) => {
        const partner = partnerMap.get(action.partner_id) || null;
        const dueInDays = daysFromNow(action.due_date);
        const isOverdue = dueInDays !== null && dueInDays < 0;
        const isDueSoon = dueInDays !== null && dueInDays >= 0 && dueInDays <= 3;

        return {
          ...action,
          partner,
          dueInDays,
          isOverdue,
          isDueSoon,
        };
      });

    const groupedByAssignee = openActions.reduce<Record<string, typeof openActions>>((acc, action) => {
      const key = action.assignee || "unassigned";
      acc[key] ||= [];
      acc[key].push(action);
      return acc;
    }, {});

    const stalePartners = partners
      .filter((partner) => ["warm", "demo_scheduled", "demo_done", "negotiating", "active"].includes(partner.pipeline_status))
      .map((partner) => {
        const nextActionDueInDays = daysFromNow(partner.next_action_due);
        const contactAgeDays = lastContactAgeDays(partner.last_contact_at);
        const missingDisciplineFields = [
          !partner.next_action ? "next action" : null,
          !partner.next_action_assignee ? "owner" : null,
          !partner.next_action_due ? "due date" : null,
        ].filter(Boolean) as string[];

        const reasons = [
          ...(missingDisciplineFields.length ? [`Missing ${missingDisciplineFields.join(", ")}`] : []),
          nextActionDueInDays !== null && nextActionDueInDays < 0 ? `Follow-up overdue by ${Math.abs(nextActionDueInDays)}d` : null,
          contactAgeDays !== null && contactAgeDays > 14 ? `No contact for ${contactAgeDays}d` : null,
        ].filter(Boolean) as string[];

        return {
          ...partner,
          nextActionDueInDays,
          contactAgeDays,
          reasons,
        };
      })
      .filter((partner) => partner.reasons.length > 0)
      .sort((a, b) => b.reasons.length - a.reasons.length || a.name.localeCompare(b.name));

    return NextResponse.json({
      summary: {
        open: openActions.length,
        overdue: openActions.filter((action) => action.isOverdue).length,
        dueSoon: openActions.filter((action) => action.isDueSoon).length,
        staleFollowUps: stalePartners.length,
      },
      actions: openActions,
      byAssignee: groupedByAssignee,
      stalePartners,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
