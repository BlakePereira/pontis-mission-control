"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Flag,
  Plus,
  Save,
  Activity,
} from "lucide-react";
import ChatPanel from "./ChatPanel";
import TodayFocus from "./TodayFocus";
import TodayFocusSticky from "./TodayFocusSticky";
import WeekSummary from "./WeekSummary";
import GoalsSummary from "./GoalsSummary";
import LaunchTab from "./LaunchTab";

type TabKey = "dashboard" | "weekly" | "quarterly" | "launch";
type GoalStatus = "on_track" | "at_risk" | "behind" | "completed";
type DailyStatus = "pending" | "in_progress" | "done" | "deferred";

interface PlanningGoal {
  id: string;
  title: string;
  description: string | null;
  quarter: string;
  category: string;
  target_metric: string | null;
  current_value: number | string;
  target_value: number | string;
  unit: string | null;
  status: GoalStatus;
  owner: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PlannedOutcome {
  title: string;
  owner?: string;
  goal_id?: string;
  status?: "pending" | "in_progress" | "done";
}

interface PlanningWeek {
  id: string;
  week_start: string;
  quarter: string;
  theme: string | null;
  planned_outcomes: PlannedOutcome[];
  retrospective: string | null;
  score: number | null;
  blake_score: number | null;
  joe_score: number | null;
  created_at: string;
  updated_at: string;
}

interface PlanningDailyTask {
  id: string;
  date: string;
  week_id: string | null;
  owner: string;
  task: string;
  goal_id: string | null;
  priority: number;
  status: DailyStatus;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

function getCurrentQuarter(date = new Date()): string {
  const month = date.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `${date.getFullYear()}-Q${quarter}`;
}

function parseQuarter(quarter: string): { year: number; q: number } {
  const [yearPart, quarterPart] = quarter.split("-Q");
  return { year: Number(yearPart), q: Number(quarterPart) };
}

function getQuarterWeeks(quarter: string): string[] {
  const { year, q } = parseQuarter(quarter);
  const quarterStartMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(year, quarterStartMonth, 1));
  const day = start.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + mondayOffset);
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i * 7);
    return d.toISOString().slice(0, 10);
  });
}

function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfWeekISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function statusClass(status: GoalStatus): string {
  if (status === "completed") return "bg-emerald-900/30 text-emerald-300 border-emerald-700/50";
  if (status === "on_track") return "bg-emerald-900/30 text-emerald-300 border-emerald-700/50";
  if (status === "at_risk") return "bg-amber-900/30 text-amber-300 border-amber-700/50";
  return "bg-red-900/30 text-red-300 border-red-700/50";
}

function progressColor(status: GoalStatus): string {
  if (status === "on_track" || status === "completed") return "bg-emerald-500";
  if (status === "at_risk") return "bg-amber-500";
  return "bg-red-500";
}

function ownerBadge(owner: string | null): string {
  if (!owner) return "ALL";
  return owner.toUpperCase();
}

function coerceNumber(input: number | string | null | undefined): number {
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const n = Number(input);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default function PlanningClient() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [goals, setGoals] = useState<PlanningGoal[]>([]);
  const [weeks, setWeeks] = useState<PlanningWeek[]>([]);
  const [daily, setDaily] = useState<PlanningDailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // Weekly tab state
  const [expandedWeekIds, setExpandedWeekIds] = useState<Record<string, boolean>>({});
  const [editingWeekIds, setEditingWeekIds] = useState<Record<string, boolean>>({});

  // Quarterly tab state
  const [editingGoalIds, setEditingGoalIds] = useState<Record<string, boolean>>({});
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    category: "business",
    target_metric: "",
    current_value: "0",
    target_value: "0",
    unit: "",
    status: "on_track" as GoalStatus,
    owner: "all",
  });

  const loadData = useCallback(async (selectedQuarter: string) => {
    setLoading(true);
    try {
      const [goalsRes, weeksRes, dailyRes] = await Promise.all([
        fetch(`/api/planning/goals?quarter=${encodeURIComponent(selectedQuarter)}`),
        fetch(`/api/planning/weeks?quarter=${encodeURIComponent(selectedQuarter)}`),
        fetch("/api/planning/daily"),
      ]);
      const [goalsData, weeksData, dailyData] = await Promise.all([
        goalsRes.json(),
        weeksRes.json(),
        dailyRes.json(),
      ]);
      setGoals(Array.isArray(goalsData.goals) ? goalsData.goals : []);
      const weeksList = Array.isArray(weeksData.weeks) ? weeksData.weeks : [];
      setWeeks(
        weeksList.map((week: PlanningWeek) => ({
          ...week,
          planned_outcomes: Array.isArray(week.planned_outcomes) ? week.planned_outcomes : [],
        }))
      );
      setDaily(Array.isArray(dailyData.tasks) ? dailyData.tasks : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(quarter);
  }, [quarter, loadData]);

  const today = todayISO();
  const weekStart = startOfWeekISO();

  const weekMap = useMemo(() => new Map(weeks.map((w) => [w.week_start, w])), [weeks]);
  const thisWeek = useMemo(() => weeks.find((w) => w.week_start === weekStart) ?? null, [weeks, weekStart]);
  const todayTasks = useMemo(() => daily.filter((t) => t.date === today), [daily, today]);

  const thisWeekTasks = useMemo(() => {
    if (!thisWeek) return [] as PlanningDailyTask[];
    return daily.filter((t) => t.week_id === thisWeek.id);
  }, [daily, thisWeek]);

  const driftScore = useMemo(() => {
    if (!thisWeekTasks.length) return 0;
    const mapped = thisWeekTasks.filter((t) => !!t.goal_id).length;
    return Math.round((mapped / thisWeekTasks.length) * 100);
  }, [thisWeekTasks]);

  const quarterWeekStarts = useMemo(() => getQuarterWeeks(quarter), [quarter]);

  const handleDataChange = useCallback(() => {
    loadData(quarter);
  }, [quarter, loadData]);

  async function toggleTaskStatus(task: PlanningDailyTask) {
    const nextStatus: DailyStatus = task.status === "done" ? "pending" : "done";
    await fetch(`/api/planning/daily/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadData(quarter);
  }

  async function updateOutcomeStatus(week: PlanningWeek, index: number) {
    const outcomes = [...week.planned_outcomes];
    const current = outcomes[index];
    const nextStatus =
      current.status === "done" ? "pending" : current.status === "in_progress" ? "done" : "in_progress";
    outcomes[index] = { ...current, status: nextStatus };
    await fetch(`/api/planning/weeks/${week.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planned_outcomes: outcomes }),
    });
    await loadData(quarter);
  }

  async function saveWeek(week: PlanningWeek) {
    await fetch(`/api/planning/weeks/${week.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: week.theme,
        planned_outcomes: week.planned_outcomes,
        retrospective: week.retrospective,
        score: week.score,
        blake_score: week.blake_score,
        joe_score: week.joe_score,
      }),
    });
    setEditingWeekIds((s) => ({ ...s, [week.id]: false }));
    await loadData(quarter);
  }

  async function saveGoal(goal: PlanningGoal) {
    await fetch(`/api/planning/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: goal.title,
        description: goal.description,
        target_metric: goal.target_metric,
        current_value: coerceNumber(goal.current_value),
        target_value: coerceNumber(goal.target_value),
        unit: goal.unit,
        status: goal.status,
        owner: goal.owner,
      }),
    });
    setEditingGoalIds((s) => ({ ...s, [goal.id]: false }));
    await loadData(quarter);
  }

  async function addGoal() {
    if (!newGoal.title.trim()) return;
    await fetch("/api/planning/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newGoal,
        quarter,
        current_value: Number(newGoal.current_value || 0),
        target_value: Number(newGoal.target_value || 0),
      }),
    });
    setNewGoalOpen(false);
    setNewGoal({
      title: "", description: "", category: "business", target_metric: "",
      current_value: "0", target_value: "0", unit: "", status: "on_track", owner: "all",
    });
    await loadData(quarter);
  }

  function setWeekField(weekId: string, field: keyof PlanningWeek, value: unknown) {
    setWeeks((prev) =>
      prev.map((w) => (w.id === weekId ? { ...w, [field]: value } as PlanningWeek : w))
    );
  }

  function setGoalField(goalId: string, field: keyof PlanningGoal, value: unknown) {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, [field]: value } as PlanningGoal : g))
    );
  }

  return (
    <div className="space-y-5">
      {/* Sticky Today's Focus Panel */}
      {!loading && (
        <TodayFocusSticky tasks={todayTasks} onToggleTask={toggleTaskStatus} />
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-2 flex items-center gap-2 w-fit">
          {[
            { key: "dashboard", label: "Dashboard", icon: CalendarDays },
            { key: "weekly", label: "Weekly", icon: ClipboardList },
            { key: "quarterly", label: "Quarterly", icon: Flag },
            { key: "launch", label: "Launch", icon: Activity },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as TabKey)}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors flex items-center gap-2 ${
                tab === key
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-[#1a1a1a] border-[#2a2a2a] text-[#999] hover:text-white"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3 flex items-center gap-3 w-fit">
          <label className="text-xs uppercase tracking-wider text-[#999]">Quarter</label>
          <select
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm text-white px-2.5 py-1.5"
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
          >
            {[
              `${new Date().getFullYear() - 1}-Q4`,
              `${new Date().getFullYear()}-Q1`,
              `${new Date().getFullYear()}-Q2`,
              `${new Date().getFullYear()}-Q3`,
              `${new Date().getFullYear()}-Q4`,
              `${new Date().getFullYear() + 1}-Q1`,
            ].map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="text-[#999] text-sm">Loading planning data...</div>}

      {/* ──────── DASHBOARD TAB ──────── */}
      {!loading && tab === "dashboard" && (
        <div className="flex gap-5 items-start">
          {/* Left: Content */}
          <div className={`space-y-4 ${chatCollapsed ? "w-full" : "w-full lg:w-[60%]"}`}>
            <TodayFocus
              tasks={todayTasks}
              goals={goals}
              onToggleTask={toggleTaskStatus}
              onAskClara={() => setChatCollapsed(false)}
            />

            <WeekSummary
              week={thisWeek}
              weekStart={weekStart}
              onGoToWeekly={() => setTab("weekly")}
            />

            <GoalsSummary goals={goals} />

            {/* Drift Score */}
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-emerald-400" />
                <div>
                  <p className="text-sm text-white font-semibold">Drift Score</p>
                  <p className="text-[10px] text-[#555]">% of this week&apos;s tasks linked to quarterly goals</p>
                </div>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${
                driftScore >= 70 ? "text-emerald-400" : driftScore >= 40 ? "text-amber-400" : "text-red-400"
              }`}>
                {driftScore}%
              </div>
            </div>
          </div>

          {/* Right: Chat Panel */}
          <div className={`hidden lg:block lg:w-[40%] sticky top-4 ${chatCollapsed ? "!hidden" : ""}`}>
            <div className="h-[calc(100vh-12rem)]">
              <ChatPanel
                quarter={quarter}
                onDataChange={handleDataChange}
                collapsed={false}
              />
            </div>
          </div>

          {/* Mobile chat */}
          <div className="lg:hidden">
            <ChatPanel
              quarter={quarter}
              onDataChange={handleDataChange}
              collapsed={chatCollapsed}
              onToggle={() => setChatCollapsed(!chatCollapsed)}
            />
          </div>
        </div>
      )}

      {/* Mobile chat overlay */}
      {!loading && tab === "dashboard" && !chatCollapsed && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setChatCollapsed(true)}>
          <div
            className="absolute bottom-0 left-0 right-0 h-[70vh] bg-[#0a0a0a] rounded-t-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatPanel
              quarter={quarter}
              onDataChange={handleDataChange}
              onToggle={() => setChatCollapsed(true)}
            />
          </div>
        </div>
      )}

      {/* ──────── WEEKLY TAB ──────── */}
      {!loading && tab === "weekly" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {quarterWeekStarts.map((weekStartDate) => {
            const week = weekMap.get(weekStartDate);
            const isCurrent = weekStartDate === weekStart;

            if (!week) {
              return (
                <div
                  key={weekStartDate}
                  className={`bg-[#111] border rounded-xl p-4 ${
                    isCurrent ? "border-emerald-800/50" : "border-[#2a2a2a]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-white text-sm font-semibold">
                      Week of {weekStartDate}
                      {isCurrent && <span className="ml-2 text-[10px] text-emerald-400">(current)</span>}
                    </h4>
                    <span className="text-xs text-[#555]">No plan</span>
                  </div>
                </div>
              );
            }

            const isExpanded = !!expandedWeekIds[week.id] || isCurrent;
            const isEditing = !!editingWeekIds[week.id];
            const outcomesDone = week.planned_outcomes.filter((o) => o.status === "done").length;
            const completionPct = week.planned_outcomes.length
              ? Math.round((outcomesDone / week.planned_outcomes.length) * 100)
              : 0;
            const weekTasks = daily.filter((t) => t.week_id === week.id);

            return (
              <div
                key={week.id}
                className={`bg-[#111] border rounded-xl p-4 ${
                  isCurrent ? "border-emerald-800/50" : "border-[#2a2a2a]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-white text-sm font-semibold">
                      Week of {week.week_start}
                      {isCurrent && <span className="ml-2 text-[10px] text-emerald-400">(current)</span>}
                    </h4>
                    {isEditing ? (
                      <input
                        className="mt-1 w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 text-sm text-white"
                        value={week.theme ?? ""}
                        onChange={(e) => setWeekField(week.id, "theme", e.target.value)}
                        placeholder="Week theme"
                      />
                    ) : (
                      <p className="text-xs text-[#999] mt-1">{week.theme ?? "No theme set"}</p>
                    )}
                  </div>
                  <button
                    className="text-xs px-2 py-1 rounded-md border border-[#2a2a2a] text-[#999] hover:text-white"
                    onClick={() => setEditingWeekIds((s) => ({ ...s, [week.id]: !s[week.id] }))}
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                </div>

                <div className="mt-3 h-2 w-full bg-[#0a0a0a] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${completionPct}%` }} />
                </div>
                <p className="text-xs text-[#999] mt-1">{completionPct}% outcomes complete</p>

                <div className="mt-3 space-y-1">
                  {week.planned_outcomes.map((outcome, idx) => (
                    <button
                      key={`${week.id}-${idx}-${outcome.title}`}
                      onClick={() => updateOutcomeStatus(week, idx)}
                      className="w-full text-left text-sm text-white bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1.5 flex items-center justify-between"
                    >
                      <span>{outcome.title}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        outcome.status === "done"
                          ? "bg-emerald-900/30 text-emerald-300 border-emerald-700/50"
                          : outcome.status === "in_progress"
                            ? "bg-amber-900/30 text-amber-300 border-amber-700/50"
                            : "bg-[#0a0a0a] text-[#999] border-[#2a2a2a]"
                      }`}>
                        {outcome.status ?? "pending"}
                      </span>
                    </button>
                  ))}
                  {!week.planned_outcomes.length && <p className="text-xs text-[#555]">No outcomes</p>}
                </div>

                {isEditing && (
                  <div className="mt-3">
                    <textarea
                      className="w-full min-h-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-sm text-white"
                      value={week.retrospective ?? ""}
                      onChange={(e) => setWeekField(week.id, "retrospective", e.target.value)}
                      placeholder="Weekly retrospective..."
                    />
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 text-xs text-[#999]">
                  <span>Team: {week.score ?? "—"}/5</span>
                  <span>Blake: {week.blake_score ?? "—"}/5</span>
                  <span>Joe: {week.joe_score ?? "—"}/5</span>
                </div>

                {isEditing && (
                  <button
                    onClick={() => saveWeek(week)}
                    className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs"
                  >
                    <Save size={13} />
                    Save Week
                  </button>
                )}

                {!isEditing && (
                  <button
                    onClick={() => setExpandedWeekIds((s) => ({ ...s, [week.id]: !s[week.id] }))}
                    className="mt-3 text-xs px-2 py-1 rounded-md border border-[#2a2a2a] text-[#999] hover:text-white"
                  >
                    {isExpanded ? "Hide Daily Breakdown" : "Show Daily Breakdown"}
                  </button>
                )}

                {isExpanded && (
                  <div className="mt-3 border-t border-[#2a2a2a] pt-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#666] mb-2 font-semibold">
                      Daily Breakdown
                    </p>
                    {weekTasks.length === 0 ? (
                      <p className="text-xs text-[#555]">No daily tasks linked to this week.</p>
                    ) : (
                      <div className="space-y-2">
                        {Array.from(new Set(weekTasks.map((t) => t.date)))
                          .sort()
                          .map((date) => {
                            const dayTasks = weekTasks
                              .filter((t) => t.date === date)
                              .sort((a, b) => a.priority - b.priority);
                            const dayName = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "numeric",
                              day: "numeric",
                            });
                            return (
                              <div key={date} className="bg-[#0a0a0a] rounded-md p-2">
                                <p className="text-xs text-emerald-400 font-semibold mb-1">
                                  {dayName}
                                </p>
                                <div className="space-y-1">
                                  {dayTasks.map((task) => {
                                    const isDone = task.status === "done";
                                    return (
                                      <label
                                        key={task.id}
                                        className="flex items-start gap-2 cursor-pointer group"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isDone}
                                          onChange={() => toggleTaskStatus(task)}
                                          className="mt-0.5 accent-emerald-500 shrink-0 text-xs"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <span
                                            className={`text-xs block ${
                                              isDone ? "text-[#555] line-through" : "text-white"
                                            }`}
                                          >
                                            {task.task}
                                          </span>
                                          <span className="text-[10px] text-[#666]">
                                            {task.owner}
                                          </span>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ──────── QUARTERLY TAB ──────── */}
      {!loading && tab === "quarterly" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setNewGoalOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm"
            >
              <Plus size={14} />
              Add Goal
            </button>
          </div>

          {newGoalOpen && (
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-sm text-white"
                placeholder="Goal title"
                value={newGoal.title}
                onChange={(e) => setNewGoal((s) => ({ ...s, title: e.target.value }))}
              />
              <input
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-sm text-white"
                placeholder="Description"
                value={newGoal.description}
                onChange={(e) => setNewGoal((s) => ({ ...s, description: e.target.value }))}
              />
              <input
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-sm text-white"
                placeholder="Target metric"
                value={newGoal.target_metric}
                onChange={(e) => setNewGoal((s) => ({ ...s, target_metric: e.target.value }))}
              />
              <input
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-sm text-white"
                placeholder="Unit"
                value={newGoal.unit}
                onChange={(e) => setNewGoal((s) => ({ ...s, unit: e.target.value }))}
              />
              <input
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-sm text-white"
                placeholder="Current value"
                value={newGoal.current_value}
                onChange={(e) => setNewGoal((s) => ({ ...s, current_value: e.target.value }))}
              />
              <input
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1.5 text-sm text-white"
                placeholder="Target value"
                value={newGoal.target_value}
                onChange={(e) => setNewGoal((s) => ({ ...s, target_value: e.target.value }))}
              />
              <button
                onClick={addGoal}
                className="px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm"
              >
                Create Goal
              </button>
            </div>
          )}

          {/* Group goals by category */}
          {["business", "product", "personal"].map((category) => {
            const catGoals = goals.filter((g) => g.category === category);
            if (!catGoals.length) return null;
            return (
              <div key={category}>
                <h3 className="text-xs uppercase tracking-wider text-[#666] mb-2 mt-4 font-semibold">
                  {category}
                </h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {catGoals.map((goal) => {
                    const current = coerceNumber(goal.current_value);
                    const target = coerceNumber(goal.target_value);
                    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                    const editing = !!editingGoalIds[goal.id];
                    return (
                      <div key={goal.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {editing ? (
                              <input
                                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 text-sm text-white"
                                value={goal.title}
                                onChange={(e) => setGoalField(goal.id, "title", e.target.value)}
                              />
                            ) : (
                              <h4 className="text-white font-semibold">{goal.title}</h4>
                            )}
                            {editing ? (
                              <textarea
                                className="mt-1 w-full min-h-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 text-sm text-white"
                                value={goal.description ?? ""}
                                onChange={(e) => setGoalField(goal.id, "description", e.target.value)}
                              />
                            ) : (
                              <p className="text-sm text-[#999] mt-1">{goal.description ?? "No description."}</p>
                            )}
                          </div>
                          <button
                            className="text-xs px-2 py-1 rounded-md border border-[#2a2a2a] text-[#999] hover:text-white shrink-0"
                            onClick={() => setEditingGoalIds((s) => ({ ...s, [goal.id]: !s[goal.id] }))}
                          >
                            {editing ? "Cancel" : "Edit"}
                          </button>
                        </div>

                        <div className="mt-3 h-2 w-full bg-[#0a0a0a] rounded-full overflow-hidden">
                          <div className={`h-full ${progressColor(goal.status)}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-[#999] mt-1">
                          {current} / {target} {goal.unit ?? ""}
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded border ${statusClass(goal.status)}`}>
                            {goal.status.replace("_", " ")}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded border bg-[#1a1a1a] border-[#2a2a2a] text-[#999]">
                            {ownerBadge(goal.owner)}
                          </span>
                        </div>

                        {editing && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <input
                              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 text-sm text-white"
                              value={String(goal.current_value)}
                              onChange={(e) => setGoalField(goal.id, "current_value", e.target.value)}
                              placeholder="Current"
                            />
                            <input
                              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 text-sm text-white"
                              value={String(goal.target_value)}
                              onChange={(e) => setGoalField(goal.id, "target_value", e.target.value)}
                              placeholder="Target"
                            />
                            <select
                              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 text-sm text-white"
                              value={goal.status}
                              onChange={(e) => setGoalField(goal.id, "status", e.target.value as GoalStatus)}
                            >
                              <option value="on_track">on_track</option>
                              <option value="at_risk">at_risk</option>
                              <option value="behind">behind</option>
                              <option value="completed">completed</option>
                            </select>
                            <input
                              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-1 text-sm text-white"
                              value={goal.owner ?? ""}
                              onChange={(e) => setGoalField(goal.id, "owner", e.target.value)}
                              placeholder="Owner"
                            />
                            <button
                              onClick={() => saveGoal(goal)}
                              className="col-span-2 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm"
                            >
                              Save Goal
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!goals.length && <p className="text-sm text-[#999]">No goals created for this quarter.</p>}
        </div>
      )}

      {/* ──────── LAUNCH TAB ──────── */}
      {!loading && tab === "launch" && (
        <LaunchTab />
      )}
    </div>
  );
}
