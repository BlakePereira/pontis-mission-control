"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2, Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface ChatAction {
  type: string;
  data: Record<string, unknown>;
  _id?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
}

interface ChatPanelProps {
  quarter: string;
  onDataChange: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function ChatPanel({ quarter, onDataChange, collapsed, onToggle }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    if (!text) setInput("");

    const userMsg: ChatMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const historyForApi = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/planning/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: historyForApi, quarter }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");

      const actions = (data.actions || []).map((a: ChatAction, i: number) => ({
        ...a,
        _id: `${Date.now()}-${i}`,
      }));

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        actions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: `⚠️ Error: ${(err as Error).message}`,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, quarter]);

  async function applyAction(action: ChatAction) {
    const id = action._id || JSON.stringify(action);
    if (appliedActions.has(id)) return;

    try {
      if (action.type === "create_daily_task") {
        const d = action.data;
        await fetch("/api/planning/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: d.date || new Date().toISOString().slice(0, 10),
            owner: d.owner || "clara",
            task: d.task,
            goal_id: d.goal_id || null,
            priority: d.priority || 5,
            status: "pending",
          }),
        });
      } else if (action.type === "update_goal_progress") {
        const d = action.data;
        await fetch(`/api/planning/goals/${d.goal_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ current_value: d.current_value }),
        });
      } else if (action.type === "update_goal_status") {
        const d = action.data;
        await fetch(`/api/planning/goals/${d.goal_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: d.status }),
        });
      }

      setAppliedActions((prev) => new Set([...prev, id]));
      onDataChange();
    } catch (err) {
      console.error("Failed to apply action:", err);
    }
  }

  async function applyAll(actions: ChatAction[]) {
    for (const action of actions) {
      await applyAction(action);
    }
  }

  function actionLabel(action: ChatAction): string {
    if (action.type === "create_daily_task") {
      const d = action.data;
      return `Add task for ${d.owner}: "${d.task}"`;
    }
    if (action.type === "update_goal_progress") {
      return `Update goal progress to ${action.data.current_value}`;
    }
    if (action.type === "update_goal_status") {
      return `Set goal status to ${action.data.status}`;
    }
    return action.type;
  }

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-full p-3 shadow-lg hover:bg-emerald-500/30 transition-colors lg:hidden"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0e0e0e] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#111]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-400" />
          <h3 className="text-white font-semibold text-sm">Clara</h3>
          <span className="text-[10px] text-[#555] uppercase tracking-wider">Planning AI</span>
        </div>
        {onToggle && (
          <button onClick={onToggle} className="text-[#555] hover:text-white lg:hidden">
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Sparkles size={24} className="text-emerald-400/30 mx-auto mb-3" />
            <p className="text-[#555] text-sm">Ask me about your goals, priorities, or what to focus on today.</p>
            <div className="mt-4 space-y-2">
              {[
                "What should I focus on today?",
                "Break down this week's priorities",
                "Which goals are at risk?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="block w-full text-left text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[#999] hover:text-white hover:border-emerald-800/30 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.role === "user" ? "" : ""}`}>
              <div
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-emerald-900/20 border border-emerald-800/30 text-emerald-100"
                    : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc]"
                }`}
              >
                {msg.content}
              </div>

              {/* Actions */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-amber-400/60">
                      Suggested Actions ({msg.actions.length})
                    </span>
                    {msg.actions.some((a) => !appliedActions.has(a._id || "")) && (
                      <button
                        onClick={() => applyAll(msg.actions!)}
                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      >
                        Apply All
                      </button>
                    )}
                  </div>
                  {msg.actions.map((action) => {
                    const id = action._id || JSON.stringify(action);
                    const applied = appliedActions.has(id);
                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs ${
                          applied
                            ? "bg-emerald-900/10 border border-emerald-700/30 text-emerald-300"
                            : "bg-amber-900/10 border border-amber-700/30 text-amber-200"
                        }`}
                      >
                        <span className="flex-1 truncate">{actionLabel(action)}</span>
                        {applied ? (
                          <Check size={12} className="text-emerald-400 shrink-0" />
                        ) : (
                          <button
                            onClick={() => applyAction(action)}
                            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 shrink-0"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
              <Loader2 size={14} className="text-emerald-400 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#2a2a2a] bg-[#111]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask Clara about your goals..."
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-emerald-800/50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
