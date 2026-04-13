"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, Calendar, Clock3, RefreshCw, User2,
  Flower2, SprayCan, MapPin,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FulfillmentPartner {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  notes: string | null;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  next_action_assignee: string | null;
  // Parsed from notes
  fulfillment_category?: "florist" | "cleaner" | "both" | null;
  fulfillment_status?: string | null;
  quality_status?: "normal" | "watch" | "restricted" | null;
}

interface ActionItem {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  assignee: string | null;
  status: string;
}

interface TaskAction {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  assignee: string | null;
  status: string;
  partner: FulfillmentPartner | null;
  dueInDays: number | null;
  isOverdue: boolean;
  isDueSoon: boolean;
}

interface StalePartner {
  id: string;
  name: string;
  fulfillment_status: string | null;
  fulfillment_category: string | null;
  next_action: string | null;
  next_action_due: string | null;
  next_action_assignee: string | null;
  contactAgeDays: number | null;
  reasons: string[];
}

interface TaskData {
  summary: {
    open: number;
    overdue: number;
    dueSoon: number;
    staleFollowUps: number;
  };
  actions: TaskAction[];
  byAssignee: Record<string, TaskAction[]>;
  stalePartners: StalePartner[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePartnerNotes(notes: string | null): Partial<FulfillmentPartner> {
  if (!notes) return {};
  const result: Partial<FulfillmentPartner> = {};

  const categoryMatch = notes.match(/\[category:\s*(florist|cleaner|both)\]/i);
  if (categoryMatch) result.fulfillment_category = categoryMatch[1].toLowerCase() as "florist" | "cleaner" | "both";

  const statusMatch = notes.match(/\[fulfillment_status:\s*([^\]]+)\]/i);
  if (statusMatch) result.fulfillment_status = statusMatch[1].trim();

  const qualityMatch = notes.match(/\[quality:\s*(normal|watch|restricted)\]/i);
  if (qualityMatch) result.quality_status = qualityMatch[1].toLowerCase() as "normal" | "watch" | "restricted";

  return result;
}

function formatDate(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function dueLabel(task: TaskAction) {
  if (task.isOverdue && task.dueInDays !== null) return `Overdue ${Math.abs(task.dueInDays)}d`;
  if (task.dueInDays === 0) return "Due today";
  if (task.isDueSoon && task.dueInDays !== null) return `Due in ${task.dueInDays}d`;
  if (task.dueInDays !== null) return `Due in ${task.dueInDays}d`;
  return "No due date";
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function computeDueInfo(dueDate: string | null): { dueInDays: number | null; isOverdue: boolean; isDueSoon: boolean } {
  if (!dueDate) return { dueInDays: null, isOverdue: false, isDueSoon: false };
  const today = startOfDay(new Date());
  const due = startOfDay(new Date(dueDate));
  const dueInDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return {
    dueInDays,
    isOverdue: dueInDays < 0,
    isDueSoon: dueInDays >= 0 && dueInDays <= 3,
  };
}

function categoryIcon(cat: string | null | undefined) {
  if (cat === "florist") return <Flower2 size={12} className="text-pink-400" />;
  if (cat === "cleaner") return <SprayCan size={12} className="text-blue-400" />;
  if (cat === "both") return <><Flower2 size={10} className="text-pink-400" /><SprayCan size={10} className="text-blue-400" /></>;
  return null;
}

// ─── Components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
      <p className="text-[11px] uppercase tracking-wider text-[#555] mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color: accent || "white" }}>{value}</p>
    </div>
  );
}

function TaskRow({ task }: { task: TaskAction }) {
  const tone = task.isOverdue
    ? "border-red-700/30 bg-red-950/20"
    : task.isDueSoon
      ? "border-yellow-700/30 bg-yellow-950/20"
      : "border-[#2a2a2a] bg-[#111]";

  const parsed = task.partner ? parsePartnerNotes(task.partner.notes) : {};

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-sm font-semibold text-white">{task.title}</h3>
            {task.priority && (
              <span className="text-[10px] uppercase tracking-wider text-[#888] border border-[#333] rounded-full px-2 py-0.5">
                {task.priority}
              </span>
            )}
          </div>
          {task.description && <p className="text-sm text-[#888] mb-2">{task.description}</p>}
          <div className="flex items-center gap-3 flex-wrap text-xs text-[#666]">
            <span className="flex items-center gap-1"><Calendar size={12} /> {formatDate(task.due_date)}</span>
            <span className={task.isOverdue ? "text-red-400" : task.isDueSoon ? "text-yellow-300" : "text-[#666]"}>{dueLabel(task)}</span>
            <span className="flex items-center gap-1"><User2 size={12} /> {task.assignee || "Unassigned"}</span>
            {task.partner && (
              <span className="flex items-center gap-1">
                {categoryIcon(parsed.fulfillment_category)}
                <span className="text-white">{task.partner.name}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FulfillmentTasksClient() {
  const [data, setData] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch fulfillment partners
      const partnersRes = await fetch("/api/partners?partnerType=fulfillment_partner");
      const partnersData = await partnersRes.json();
      const partners: FulfillmentPartner[] = (partnersData.partners || []).map((p: FulfillmentPartner) => ({
        ...p,
        ...parsePartnerNotes(p.notes),
      }));

      // Fetch all actions for these partners
      const actions: TaskAction[] = [];
      const byAssignee: Record<string, TaskAction[]> = {};
      const stalePartners: StalePartner[] = [];

      // Fetch actions for each partner (in parallel batches)
      const actionPromises = partners.map(async (partner) => {
        try {
          const res = await fetch(`/api/partners/${partner.id}`);
          if (res.ok) {
            const detail = await res.json();
            return { partner, actions: detail.actions || [] };
          }
        } catch {
          // Ignore errors
        }
        return { partner, actions: [] };
      });

      const results = await Promise.all(actionPromises);

      results.forEach(({ partner, actions: partnerActions }) => {
        // Process actions
        partnerActions.forEach((action: ActionItem) => {
          if (action.status === "completed") return;

          const dueInfo = computeDueInfo(action.due_date);
          const taskAction: TaskAction = {
            ...action,
            partner,
            ...dueInfo,
          };

          actions.push(taskAction);

          const assignee = action.assignee || "unassigned";
          if (!byAssignee[assignee]) byAssignee[assignee] = [];
          byAssignee[assignee].push(taskAction);
        });

        // Check for stale partners
        const reasons: string[] = [];
        const activeStatuses = ["qualified", "pricing_pending", "contract_pending", "onboarding", "test_ready", "active"];
        const status = partner.fulfillment_status || "lead";

        if (activeStatuses.includes(status)) {
          if (!partner.next_action) reasons.push("Missing next action");
          if (!partner.next_action_assignee) reasons.push("Missing owner");
          if (!partner.next_action_due) reasons.push("Missing due date");

          if (partner.last_contact_at) {
            const daysSince = Math.floor((Date.now() - new Date(partner.last_contact_at).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSince > 14) reasons.push(`No contact for ${daysSince} days`);
          } else {
            reasons.push("No contact logged");
          }
        }

        if (reasons.length > 0) {
          const contactAgeDays = partner.last_contact_at
            ? Math.floor((Date.now() - new Date(partner.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          stalePartners.push({
            id: partner.id,
            name: partner.name,
            fulfillment_status: partner.fulfillment_status || null,
            fulfillment_category: partner.fulfillment_category || null,
            next_action: partner.next_action,
            next_action_due: partner.next_action_due,
            next_action_assignee: partner.next_action_assignee,
            contactAgeDays,
            reasons,
          });
        }
      });

      // Sort actions by due date (overdue first, then soonest)
      actions.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        if (a.dueInDays === null) return 1;
        if (b.dueInDays === null) return -1;
        return a.dueInDays - b.dueInDays;
      });

      setData({
        summary: {
          open: actions.length,
          overdue: actions.filter(a => a.isOverdue).length,
          dueSoon: actions.filter(a => !a.isOverdue && a.isDueSoon).length,
          staleFollowUps: stalePartners.length,
        },
        actions,
        byAssignee,
        stalePartners,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return <div className="py-16 text-center text-sm text-[#555]">Loading fulfillment tasks...</div>;
  }

  const summary = data?.summary || { open: 0, overdue: 0, dueSoon: 0, staleFollowUps: 0 };
  const overdue = data?.actions.filter((task) => task.isOverdue) || [];
  const dueSoon = data?.actions.filter((task) => !task.isOverdue && task.isDueSoon) || [];
  const assigneeEntries = Object.entries(data?.byAssignee || {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Fulfillment Tasks</h2>
          <p className="text-sm text-[#555] mt-1">Action items, due-soon work, and stale follow-ups for florists and cleaners.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-[#888] hover:text-white hover:border-[#444] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Open tasks" value={summary.open} />
        <StatCard label="Overdue" value={summary.overdue} accent="#f87171" />
        <StatCard label="Due soon" value={summary.dueSoon} accent="#facc15" />
        <StatCard label="Stale follow-ups" value={summary.staleFollowUps} accent="#fb923c" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="space-y-6">
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-red-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Overdue</h3>
            </div>
            <div className="space-y-3">
              {overdue.length === 0 ? (
                <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-4 text-sm text-[#666]">No overdue tasks.</div>
              ) : overdue.map((task) => <TaskRow key={task.id} task={task} />)}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock3 size={14} className="text-yellow-300" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Due soon</h3>
            </div>
            <div className="space-y-3">
              {dueSoon.length === 0 ? (
                <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-4 text-sm text-[#666]">Nothing due in the next 3 days.</div>
              ) : dueSoon.map((task) => <TaskRow key={task.id} task={task} />)}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">By assignee</h3>
            <div className="space-y-4">
              {assigneeEntries.length === 0 ? (
                <p className="text-sm text-[#666]">No open task ownership yet.</p>
              ) : assigneeEntries.map(([assignee, tasks]) => (
                <div key={assignee}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white capitalize">{assignee.replace(/_/g, " ")}</p>
                    <span className="text-xs text-[#666]">{tasks.length} open</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.slice(0, 4).map((task) => {
                      const parsed = task.partner ? parsePartnerNotes(task.partner.notes) : {};
                      return (
                        <div key={task.id} className="rounded-lg border border-[#2a2a2a] bg-[#181818] px-3 py-2">
                          <p className="text-sm text-white truncate">{task.title}</p>
                          <p className="text-xs text-[#666] mt-1 flex items-center gap-1">
                            {categoryIcon(parsed.fulfillment_category)}
                            {task.partner?.name || "Unknown"} • {dueLabel(task)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Stale follow-ups</h3>
            <div className="space-y-3">
              {(data?.stalePartners || []).length === 0 ? (
                <p className="text-sm text-[#666]">No stale follow-ups right now.</p>
              ) : data!.stalePartners.slice(0, 12).map((partner) => (
                <div key={partner.id} className="rounded-xl border border-orange-700/20 bg-orange-950/10 p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-1.5">
                      {categoryIcon(partner.fulfillment_category)}
                      <p className="text-sm font-semibold text-white">{partner.name}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-[#888]">
                      {(partner.fulfillment_status || "lead").replace(/_/g, " ")}
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-[#f0c18a] list-disc ml-4">
                    {partner.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
