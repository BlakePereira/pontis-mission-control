"use client";

import { Target } from "lucide-react";

type GoalStatus = "on_track" | "at_risk" | "behind" | "completed";

interface PlanningGoal {
  id: string;
  title: string;
  current_value: number | string;
  target_value: number | string;
  unit: string | null;
  status: GoalStatus;
  owner: string | null;
}

interface GoalsSummaryProps {
  goals: PlanningGoal[];
}

function coerceNumber(input: number | string | null | undefined): number {
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const n = Number(input);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function statusOrder(status: GoalStatus): number {
  if (status === "behind") return 0;
  if (status === "at_risk") return 1;
  if (status === "on_track") return 2;
  if (status === "completed") return 3;
  return 4;
}

function progressColor(status: GoalStatus): string {
  if (status === "completed" || status === "on_track") return "bg-emerald-500";
  if (status === "at_risk") return "bg-amber-500";
  return "bg-red-500";
}

function statusDot(status: GoalStatus): string {
  if (status === "completed" || status === "on_track") return "bg-emerald-500";
  if (status === "at_risk") return "bg-amber-500";
  return "bg-red-500";
}

export default function GoalsSummary({ goals }: GoalsSummaryProps) {
  const sorted = [...goals].sort((a, b) => statusOrder(a.status) - statusOrder(b.status));

  const atRisk = goals.filter((g) => g.status === "at_risk" || g.status === "behind").length;
  const completed = goals.filter((g) => g.status === "completed").length;

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">Quarterly Goals</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {atRisk > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-red-900/20 border border-red-800/30 text-red-400">
              {atRisk} at risk
            </span>
          )}
          {completed > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-900/20 border border-emerald-800/30 text-emerald-400">
              {completed} done
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {sorted.map((goal) => {
          const current = coerceNumber(goal.current_value);
          const target = coerceNumber(goal.target_value);
          const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;

          return (
            <div key={goal.id} className="group">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(goal.status)}`} />
                  <span className="text-xs text-[#ccc] truncate">{goal.title}</span>
                </div>
                <span className="text-[10px] text-[#555] shrink-0 tabular-nums">
                  {current}/{target} {goal.unit || ""}
                </span>
              </div>
              <div className="h-1 w-full bg-[#0a0a0a] rounded-full overflow-hidden ml-3">
                <div
                  className={`h-full ${progressColor(goal.status)} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <p className="text-xs text-[#555]">No goals set for this quarter.</p>
        )}
      </div>
    </div>
  );
}
