"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Calendar, Clock3, RefreshCw, User2 } from "lucide-react";

type TaskAction = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  assignee: string | null;
  status: string;
  partner: {
    id: string;
    name: string;
    pipeline_status: string;
  } | null;
  dueInDays: number | null;
  isOverdue: boolean;
  isDueSoon: boolean;
};

type StalePartner = {
  id: string;
  name: string;
  pipeline_status: string;
  next_action: string | null;
  next_action_due: string | null;
  next_action_assignee: string | null;
  contactAgeDays: number | null;
  reasons: string[];
};

type TaskData = {
  summary: {
    open: number;
    overdue: number;
    dueSoon: number;
    staleFollowUps: number;
  };
  actions: TaskAction[];
  byAssignee: Record<string, TaskAction[]>;
  stalePartners: StalePartner[];
};

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
            {task.partner && <span>Account: <span className="text-white">{task.partner.name}</span></span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CRMTasksClient() {
  const [data, setData] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/tasks");
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return <div className="py-16 text-center text-sm text-[#555]">Loading CRM tasks…</div>;
  }

  const summary = data?.summary || { open: 0, overdue: 0, dueSoon: 0, staleFollowUps: 0 };
  const overdue = data?.actions.filter((task) => task.isOverdue) || [];
  const dueSoon = data?.actions.filter((task) => !task.isOverdue && task.isDueSoon) || [];
  const assigneeEntries = Object.entries(data?.byAssignee || {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">CRM Tasks</h2>
          <p className="text-sm text-[#555] mt-1">Open action items, due-soon work, and stale follow-up hygiene.</p>
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
                    {tasks.slice(0, 4).map((task) => (
                      <div key={task.id} className="rounded-lg border border-[#2a2a2a] bg-[#181818] px-3 py-2">
                        <p className="text-sm text-white truncate">{task.title}</p>
                        <p className="text-xs text-[#666] mt-1">{task.partner?.name || "Unknown account"} • {dueLabel(task)}</p>
                      </div>
                    ))}
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
                    <p className="text-sm font-semibold text-white">{partner.name}</p>
                    <span className="text-[10px] uppercase tracking-wider text-[#888]">{partner.pipeline_status.replace(/_/g, " ")}</span>
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
