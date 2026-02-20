"use client";

import { CalendarDays } from "lucide-react";

interface PlannedOutcome {
  title: string;
  owner?: string;
  goal_id?: string;
  status?: "pending" | "in_progress" | "done";
}

interface PlanningWeek {
  id: string;
  week_start: string;
  theme: string | null;
  planned_outcomes: PlannedOutcome[];
  score: number | null;
}

interface WeekSummaryProps {
  week: PlanningWeek | null;
  weekStart: string;
  onGoToWeekly?: () => void;
}

export default function WeekSummary({ week, weekStart, onGoToWeekly }: WeekSummaryProps) {
  if (!week) {
    return (
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-[#555]" />
            <h3 className="text-white font-semibold text-sm">This Week</h3>
          </div>
          <span className="text-[10px] text-[#555]">Week of {weekStart}</span>
        </div>
        <p className="text-sm text-[#555]">No plan created for this week yet.</p>
        <p className="text-xs text-[#444] mt-1">Ask Clara to generate a weekly plan.</p>
      </div>
    );
  }

  const outcomes = Array.isArray(week.planned_outcomes) ? week.planned_outcomes : [];
  const done = outcomes.filter((o) => o.status === "done").length;
  const total = outcomes.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">This Week</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#555]">Week of {weekStart}</span>
          {onGoToWeekly && (
            <button
              onClick={onGoToWeekly}
              className="text-[10px] text-emerald-600 hover:text-emerald-400"
            >
              Details →
            </button>
          )}
        </div>
      </div>

      {week.theme && (
        <p className="text-sm text-[#999] mb-2">&ldquo;{week.theme}&rdquo;</p>
      )}

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-[#0a0a0a] rounded-full overflow-hidden mb-1">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-[#555] mb-3">
        {done}/{total} outcomes complete ({pct}%)
      </p>

      {/* Outcomes */}
      <div className="space-y-1">
        {outcomes.slice(0, 5).map((outcome, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                outcome.status === "done"
                  ? "bg-emerald-500"
                  : outcome.status === "in_progress"
                    ? "bg-amber-500"
                    : "bg-[#333]"
              }`}
            />
            <span
              className={`${
                outcome.status === "done" ? "text-[#555] line-through" : "text-[#999]"
              }`}
            >
              {outcome.title}
            </span>
          </div>
        ))}
        {outcomes.length === 0 && (
          <p className="text-xs text-[#444]">No outcomes defined yet.</p>
        )}
      </div>
    </div>
  );
}
