"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X, Copy, Check, Zap, Users, DollarSign, Activity } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  session_key: string;
  session_id: string | null;
  label: string | null;
  kind: string;
  display_name: string | null;
  channel: string | null;
  model: string | null;
  total_tokens: number;
  last_message: string | null;
  last_role: string | null;
  status: string;
  started_at: string | null;
  last_active_at: string | null;
  duration_ms: number | null;
  cost_total: string | number;
  raw: Record<string, unknown> | null;
  synced_at: string;
}

interface Summary {
  activeNow: number;
  todayCount: number;
  subagentsRun: number;
  avgCost: number;
  totalTokensThisWeek: number;
  totalCostThisWeek: number;
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(v: string | number): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(n) || n === 0) return "—";
  if (n < 1) return `¢${(n * 100).toFixed(1)}`;
  return `$${n.toFixed(2)}`;
}

function formatDuration(ms: number | null, status: string): string {
  if (status === "active") return "ongoing";
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return "< 1s";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getSessionName(s: Session): string {
  if (s.label) return s.label;
  if (s.display_name) return s.display_name;
  const key = s.session_key || s.session_id || "";
  // Clean up UUID
  if (/^[0-9a-f-]{36}$/i.test(key)) return key.slice(0, 8) + "…";
  return key.length > 30 ? key.slice(0, 30) + "…" : key;
}

// ─── Kind Badge ──────────────────────────────────────────────────────────────

const kindConfig: Record<string, { label: string; cls: string }> = {
  main: { label: "main", cls: "bg-purple-900/60 text-purple-300 border border-purple-700/40" },
  subagent: { label: "sub-agent", cls: "bg-blue-900/60 text-blue-300 border border-blue-700/40" },
  group: { label: "group", cls: "bg-amber-900/60 text-amber-300 border border-amber-700/40" },
  other: { label: "other", cls: "bg-gray-800 text-gray-400 border border-gray-700" },
};

function KindBadge({ kind }: { kind: string }) {
  const cfg = kindConfig[kind] || kindConfig.other;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-900/60 text-green-300 border border-green-700/40">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        active
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
      done
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ session, onClose }: { session: Session; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(session.session_key || session.session_id || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const name = getSessionName(session);
  const cost = typeof session.cost_total === "string" ? parseFloat(session.cost_total) : session.cost_total;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-[#111] border-l border-[#2a2a2a] z-50 flex flex-col shadow-2xl overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-[#2a2a2a] sticky top-0 bg-[#111]">
        <div className="flex-1 min-w-0 pr-4">
          <h2 className="text-lg font-bold text-white truncate">{name}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <KindBadge kind={session.kind} />
            <StatusBadge status={session.status} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#555] hover:text-white transition-colors flex-shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Session ID */}
        <div>
          <p className="text-[11px] text-[#555] uppercase tracking-wider mb-1">Session ID</p>
          <div className="flex items-center gap-2">
            <code className="text-[11px] text-[#888] font-mono bg-[#1a1a1a] px-2 py-1 rounded flex-1 truncate">
              {session.session_key || session.session_id || "—"}
            </code>
            <button
              onClick={copyId}
              className="text-[#555] hover:text-white transition-colors flex-shrink-0"
              title="Copy ID"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Started</p>
            <p className="text-sm text-white">{formatTime(session.started_at)}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Last Active</p>
            <p className="text-sm text-white">{formatRelative(session.last_active_at)}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Duration</p>
            <p className="text-sm text-white">{formatDuration(session.duration_ms, session.status)}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-3">
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Total Tokens</p>
            <p className="text-sm text-white">{formatTokens(session.total_tokens)}</p>
          </div>
        </div>

        {/* Cost */}
        <div className="bg-[#1a1a1a] rounded-lg p-3">
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">Total Cost</p>
          <p className="text-xl font-bold text-[#10b981]">{formatCost(session.cost_total)}</p>
        </div>

        {/* Model */}
        {session.model && (
          <div>
            <p className="text-[11px] text-[#555] uppercase tracking-wider mb-1">Model</p>
            <span className="text-xs text-[#888] bg-[#1a1a1a] px-2 py-1 rounded-full font-mono">
              {session.model}
            </span>
          </div>
        )}

        {/* Last Message */}
        {session.last_message && (
          <div>
            <p className="text-[11px] text-[#555] uppercase tracking-wider mb-2">Assistant said:</p>
            <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
              <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">
                {session.last_message}
              </p>
            </div>
          </div>
        )}

        {/* Raw cost breakdown if available */}
        {cost > 0 && (
          <div>
            <p className="text-[11px] text-[#555] uppercase tracking-wider mb-2">Cost Breakdown</p>
            <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#666]">Total tokens</span>
                <span className="text-[#aaa] font-mono">{formatTokens(session.total_tokens)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#666]">Total cost</span>
                <span className="text-[#10b981] font-mono">{formatCost(session.cost_total)}</span>
              </div>
              {session.duration_ms && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#666]">Duration</span>
                  <span className="text-[#aaa] font-mono">{formatDuration(session.duration_ms, session.status)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Activity Strip ──────────────────────────────────────────────────────

function LiveActivity({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Live Activity</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex-shrink-0 w-64 bg-[#111] border border-green-800/30 rounded-xl p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              <p className="text-sm font-medium text-white truncate">{getSessionName(s)}</p>
            </div>
            {s.model && (
              <span className="text-[10px] text-[#666] bg-[#1a1a1a] px-1.5 py-0.5 rounded-full font-mono">
                {s.model.replace("claude-", "")}
              </span>
            )}
            <p className="text-[11px] text-[#555] mt-1.5">{formatRelative(s.last_active_at)}</p>
            {s.last_message && (
              <p className="text-[11px] text-[#666] italic mt-1.5 line-clamp-2">
                {s.last_message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type PeriodKey = "day" | "week" | "month" | "all";
type KindKey = "all" | "main" | "subagent" | "group" | "other";
type StatusKey = "all" | "active" | "completed";

export default function SessionsClient() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [liveActivity, setLiveActivity] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<PeriodKey>("week");
  const [kindFilter, setKindFilter] = useState<KindKey>("all");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams({
        period,
        kind: kindFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/sessions?${params}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to load sessions");
        return;
      }
      const data = await res.json();
      setSessions(data.sessions || []);
      setSummary(data.summary || null);
      setLiveActivity(data.liveActivity || []);
      setLastSynced(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [period, kindFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSyncNow = async () => {
    setSyncing(true);
    await fetchData();
    setSyncing(false);
  };

  const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: "day", label: "Today" },
    { key: "week", label: "7 days" },
    { key: "month", label: "30 days" },
    { key: "all", label: "All time" },
  ];

  const kindOptions: { key: KindKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "main", label: "Main" },
    { key: "subagent", label: "Sub-agent" },
    { key: "group", label: "Group" },
    { key: "other", label: "Other" },
  ];

  const statusOptions: { key: StatusKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {lastSynced && (
            <p className="text-[#555] text-xs mt-0.5">
              Last synced {formatRelative(lastSynced.toISOString())}
            </p>
          )}
        </div>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#888] hover:text-white hover:border-[#444] transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
          Sync Now
        </button>
      </div>

      {/* Stats Bar */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Active Now"
            value={String(summary.activeNow)}
            icon={<Activity size={16} />}
            highlight={summary.activeNow > 0}
            color="green"
          />
          <StatCard
            label="Today's Sessions"
            value={String(summary.todayCount)}
            icon={<Zap size={16} />}
          />
          <StatCard
            label="Sub-agents Run"
            value={String(summary.subagentsRun)}
            icon={<Users size={16} />}
            sub="all time"
          />
          <StatCard
            label="This Week's Cost"
            value={formatCost(summary.totalCostThisWeek)}
            icon={<DollarSign size={16} />}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Live Activity */}
      <LiveActivity sessions={liveActivity} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Kind filter */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#555] uppercase tracking-wider mr-1">Kind:</span>
          {kindOptions.map(({ key, label }) => (
            <FilterButton
              key={key}
              active={kindFilter === key}
              onClick={() => setKindFilter(key)}
              label={label}
            />
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#555] uppercase tracking-wider mr-1">Status:</span>
          {statusOptions.map(({ key, label }) => (
            <FilterButton
              key={key}
              active={statusFilter === key}
              onClick={() => setStatusFilter(key)}
              label={label}
            />
          ))}
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#555] uppercase tracking-wider mr-1">Period:</span>
          {periodOptions.map(({ key, label }) => (
            <FilterButton
              key={key}
              active={period === key}
              onClick={() => setPeriod(key)}
              label={label}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-[#555] text-sm">Loading sessions…</div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-[#555] text-sm">No sessions found for the selected filters.</div>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-[#555] text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Kind</th>
                <th className="text-left px-4 py-3">Model</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Tokens</th>
                <th className="text-left px-4 py-3">Cost</th>
                <th className="text-left px-4 py-3">Last Message</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-[#1e1e1e] hover:bg-[#1a1a1a] cursor-pointer transition-colors ${
                    selectedSession?.id === s.id ? "bg-[#1a1a1a]" : ""
                  }`}
                  onClick={() =>
                    setSelectedSession(selectedSession?.id === s.id ? null : s)
                  }
                >
                  <td className="px-4 py-3 text-[#888] whitespace-nowrap text-xs">
                    {formatRelative(s.last_active_at)}
                  </td>
                  <td className="px-4 py-3 text-white max-w-[160px]">
                    <div className="flex items-center gap-2">
                      {s.status === "active" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                      )}
                      <span className="truncate text-xs">{getSessionName(s)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <KindBadge kind={s.kind} />
                  </td>
                  <td className="px-4 py-3 text-[#666] text-xs font-mono whitespace-nowrap">
                    {s.model ? s.model.replace("claude-", "") : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#888] text-xs whitespace-nowrap">
                    {formatDuration(s.duration_ms, s.status)}
                  </td>
                  <td className="px-4 py-3 text-[#888] text-xs whitespace-nowrap">
                    {formatTokens(s.total_tokens)}
                  </td>
                  <td className="px-4 py-3 text-[#10b981] text-xs font-mono whitespace-nowrap">
                    {formatCost(s.cost_total)}
                  </td>
                  <td className="px-4 py-3 text-[#555] text-xs max-w-[220px]">
                    <span className="truncate block italic">
                      {s.last_message || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[#2a2a2a] text-[#555] text-xs">
            {sessions.length} session{sessions.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Detail Panel Overlay */}
      {selectedSession && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedSession(null)}
          />
          <DetailPanel
            session={selectedSession}
            onClose={() => setSelectedSession(null)}
          />
        </>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  highlight,
  color = "default",
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
  color?: string;
  sub?: string;
}) {
  const isGreen = highlight && color === "green";
  return (
    <div
      className={`bg-[#111] border rounded-xl p-4 ${
        isGreen
          ? "border-green-700/40 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
          : "border-[#2a2a2a]"
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-xs mb-2 ${
          isGreen ? "text-green-400" : "text-[#555]"
        }`}
      >
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <p
        className={`text-2xl font-bold ${
          isGreen ? "text-green-400" : "text-white"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] text-[#555] mt-0.5">{sub}</p>}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
        active
          ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30"
          : "text-[#666] hover:text-white bg-[#111] border border-[#2a2a2a] hover:border-[#444]"
      }`}
    >
      {label}
    </button>
  );
}
