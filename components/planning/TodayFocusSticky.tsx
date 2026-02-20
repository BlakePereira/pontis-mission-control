"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Calendar } from "lucide-react";

type DailyStatus = "pending" | "in_progress" | "done" | "deferred";

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

interface TodayFocusStickyProps {
  tasks: PlanningDailyTask[];
  onToggleTask: (task: PlanningDailyTask) => void | Promise<void>;
}

const OWNERS = ["blake", "joe", "clara"] as const;

export default function TodayFocusSticky({ tasks, onToggleTask }: TodayFocusStickyProps) {
  const [collapsed, setCollapsed] = useState(false);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (collapsed) {
    return (
      <div className="bg-[#0a0a0a] border-b border-[#2a2a2a] px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-emerald-400" />
          <span className="text-sm text-white font-semibold">{dateStr}</span>
          <span className="text-xs text-[#555]">
            {tasks.filter((t) => t.status === "done").length}/{tasks.length} complete
          </span>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          className="text-[#999] hover:text-white transition-colors"
        >
          <ChevronDown size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] border-b border-[#2a2a2a] sticky top-0 z-10">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-emerald-400" />
            <h3 className="text-white font-semibold text-sm">TODAY: {dateStr}</h3>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            className="text-[#999] hover:text-white transition-colors"
          >
            <ChevronUp size={16} />
          </button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-sm text-[#555]">No tasks scheduled for today.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {OWNERS.map((owner) => {
              const ownerTasks = tasks
                .filter((t) => t.owner === owner)
                .sort((a, b) => a.priority - b.priority)
                .slice(0, 3); // Show top 3 only

              return (
                <div key={owner} className="bg-[#111] border border-[#222] rounded-lg p-2">
                  <p className="text-[10px] uppercase tracking-wider text-[#666] mb-1.5 font-semibold">
                    {owner}
                  </p>
                  <div className="space-y-1">
                    {ownerTasks.map((task) => {
                      const isDone = task.status === "done";
                      return (
                        <label
                          key={task.id}
                          className="flex items-start gap-2 cursor-pointer group text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => onToggleTask(task)}
                            className="mt-0.5 accent-emerald-500 shrink-0"
                          />
                          <span
                            className={`${
                              isDone ? "text-[#555] line-through" : "text-white"
                            }`}
                          >
                            {task.task}
                          </span>
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
    </div>
  );
}
