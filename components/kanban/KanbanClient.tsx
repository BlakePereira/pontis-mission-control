"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, AlertCircle, User } from "lucide-react";

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  board: string;
  assignee: string | null;
  priority: string | null;
  task_code: string | null;
  created_at: string;
  archived: boolean;
}

interface Board {
  id: number;
  slug: string;
  name: string;
  icon: string;
}

// Real status values from Supabase
const STATUSES = ["backlog", "progress", "done"];
const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  progress: "In Progress",
  in_progress: "In Progress",
  done: "Done",
  review: "Review",
};
const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-[#2a2a2a] text-[#888]",
  todo: "bg-[#2a2a2a] text-[#888]",
  progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  done: "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20",
  review: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};
const PRIORITY_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-yellow-400",
  low: "text-[#555]",
};

interface AddTaskForm {
  title: string;
  description: string;
  assignee: string;
  status: string;
  priority: string;
}

export default function KanbanClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddTaskForm>({
    title: "",
    description: "",
    assignee: "",
    status: "backlog",
    priority: "medium",
  });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/kanban")
      .then((r) => r.json())
      .then((d) => {
        if (d.error && (!d.boards || d.boards.length === 0)) {
          setError(d.error);
          setLoading(false);
          return;
        }
        const fetchedBoards: Board[] = d.boards || [];
        setBoards(fetchedBoards);
        if (fetchedBoards.length > 0) setActiveSlug(fetchedBoards[0].slug);
        setTasks(d.tasks || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (activeSlug === null) return;
    setLoading(true);
    fetch(`/api/kanban?board=${encodeURIComponent(activeSlug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setError(null);
        setTasks(d.tasks || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [activeSlug]);

  const handleAddTask = async () => {
    if (!addForm.title.trim() || !activeSlug) return;
    setAdding(true);
    try {
      const res = await fetch("/api/kanban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, board: activeSlug }),
      });
      const data = await res.json();
      if (data.task) {
        setTasks((prev) => [...prev, data.task]);
        setAddForm({ title: "", description: "", assignee: "", status: "backlog", priority: "medium" });
        setShowAdd(false);
      }
    } catch (e) {
      console.error(e);
    }
    setAdding(false);
  };

  const updateStatus = async (taskId: number, newStatus: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    await fetch("/api/kanban", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });
  };

  // Get unique statuses from actual data + defaults
  const allStatuses = [...new Set([...STATUSES, ...tasks.map(t => t.status)])].filter(Boolean);
  
  const filteredByStatus = (status: string) =>
    tasks.filter((t) => t.status === status);

  // Group non-standard statuses into backlog
  const getDisplayStatuses = () => {
    const known = new Set(STATUSES);
    const extra = [...new Set(tasks.map(t => t.status))].filter(s => !known.has(s));
    return [...STATUSES, ...extra];
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
          <AlertCircle size={14} />
          <span>Supabase error: {error}</span>
        </div>
      )}

      {/* Board Tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        {boards.map((b) => (
          <button
            key={b.slug}
            onClick={() => setActiveSlug(b.slug)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSlug === b.slug
                ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                : "bg-[#161616] text-[#888] border border-[#2a2a2a] hover:text-white hover:border-[#3a3a3a]"
            }`}
          >
            {b.icon} {b.name}
          </button>
        ))}
        <Button
          onClick={() => setShowAdd(true)}
          size="sm"
          className="ml-auto bg-[#10b981] hover:bg-[#0ea572] text-black font-semibold"
        >
          <Plus size={14} className="mr-1" />
          Add Task
        </Button>
      </div>

      {/* Board Columns */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {STATUSES.map((s) => (
            <div key={s} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4 h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {getDisplayStatuses().map((status) => {
            const col = filteredByStatus(status);
            return (
              <div key={status} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#ccc]">
                    {STATUS_LABELS[status] || status}
                  </h3>
                  <span className="text-xs bg-[#2a2a2a] text-[#666] px-2 py-0.5 rounded-full">
                    {col.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {col.map((task) => (
                    <TaskCard key={task.id} task={task} onStatusChange={updateStatus} allStatuses={getDisplayStatuses()} />
                  ))}
                  {col.length === 0 && (
                    <p className="text-[#444] text-xs text-center py-6">No tasks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#161616] border border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Add Task to {boards.find(b => b.slug === activeSlug)?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input
              placeholder="Task title *"
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
              className="bg-[#0f0f0f] border-[#2a2a2a] text-white placeholder:text-[#555]"
            />
            <Textarea
              placeholder="Description (optional)"
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              className="bg-[#0f0f0f] border-[#2a2a2a] text-white placeholder:text-[#555] resize-none"
              rows={3}
            />
            <Input
              placeholder="Assignee (Blake, Joe, Clara...)"
              value={addForm.assignee}
              onChange={(e) => setAddForm({ ...addForm, assignee: e.target.value })}
              className="bg-[#0f0f0f] border-[#2a2a2a] text-white placeholder:text-[#555]"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={addForm.status}
                onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                className="bg-[#0f0f0f] border border-[#2a2a2a] text-white rounded-md px-3 py-2 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <select
                value={addForm.priority}
                onChange={(e) => setAddForm({ ...addForm, priority: e.target.value })}
                className="bg-[#0f0f0f] border border-[#2a2a2a] text-white rounded-md px-3 py-2 text-sm"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAdd(false)} className="text-[#888]">
                Cancel
              </Button>
              <Button
                onClick={handleAddTask}
                disabled={adding || !addForm.title.trim()}
                className="bg-[#10b981] hover:bg-[#0ea572] text-black font-semibold"
              >
                {adding ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  allStatuses,
}: {
  task: Task;
  onStatusChange: (id: number, status: string) => void;
  allStatuses: string[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#3a3a3a] transition-colors">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-sm text-white font-medium leading-snug">{task.title}</p>
        {task.task_code && (
          <span className="text-[10px] text-[#444] shrink-0">{task.task_code}</span>
        )}
      </div>
      {task.description && (
        <p className="text-xs text-[#666] line-clamp-2 mb-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <div className="flex items-center gap-1 text-xs text-[#555]">
              <User size={10} />
              <span>{task.assignee}</span>
            </div>
          )}
          {task.priority && (
            <span className={`text-[10px] font-medium ${PRIORITY_COLORS[task.priority] || "text-[#555]"}`}>
              {task.priority}
            </span>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)}>
            <Badge className={`${STATUS_COLORS[task.status] || STATUS_COLORS.backlog} text-[10px] cursor-pointer`}>
              {STATUS_LABELS[task.status] || task.status}
            </Badge>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 bg-[#161616] border border-[#2a2a2a] rounded-lg shadow-xl z-10 overflow-hidden min-w-[120px]">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(task.id, s); setMenuOpen(false); }}
                  className="block w-full text-left px-3 py-1.5 text-xs text-[#ccc] hover:bg-[#2a2a2a] transition-colors"
                >
                  {STATUS_LABELS[s] || s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// end of file
