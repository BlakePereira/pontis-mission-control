"use client";

import { MessageCircle } from "lucide-react";

interface PlanningGoal {
  id: string;
  title: string;
}

interface PlanningDailyTask {
  id: string;
  date: string;
  week_id: string | null;
  owner: string;
  task: string;
  goal_id: string | null;
  priority: number;
  status: "pending" | "in_progress" | "done" | "deferred";
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

interface TodayFocusProps {
  tasks: PlanningDailyTask[];
  goals: PlanningGoal[];
  onToggleTask: (task: PlanningDailyTask) => void | Promise<void>;
  onAskClara?: () => void;
}

const OWNERS = ["blake", "joe", "clara"] as const;

export default function TodayFocus({ tasks, goals, onToggleTask, onAskClara }: TodayFocusProps) {
  const goalMap = new Map(goals.map((g) => [g.id, g.title]));

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">Today&apos;s Focus</h3>
          <p className="text-xs text-[#555] mt-0.5">{dateStr}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-[#555] mb-3">No tasks for today yet.</p>
          {onAskClara && (
            <button
              onClick={onAskClara}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle size={14} />
              Ask Clara to plan today
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {OWNERS.map((owner) => {
            const ownerTasks = tasks
              .filter((t) => t.owner === owner)
              .sort((a, b) => a.priority - b.priority);

            return (
              <div key={owner} className="bg-[#0e0e0e] border border-[#222] rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#666] mb-2 font-semibold">
                  {owner}
                </p>
                <div className="space-y-1.5">
                  {ownerTasks.map((task) => {
                    const isDone = task.status === "done";
                    const goalName = task.goal_id ? goalMap.get(task.goal_id) : null;
                    return (
                      <label
                        key={task.id}
                        className="flex items-start gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={() => onToggleTask(task)}
                          className="mt-0.5 accent-emerald-500 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-sm block ${
                              isDone ? "text-[#555] line-through" : "text-white"
                            }`}
                          >
                            {task.task}
                          </span>
                          {goalName && (
                            <span className="text-[10px] text-emerald-600 truncate block">
                              → {goalName}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                  {ownerTasks.length === 0 && (
                    <p className="text-xs text-[#444]">No tasks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
