"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Zap, TrendingUp, DollarSign, Activity, Database } from "lucide-react";

// ─── Formatting helpers ────────────────────────────────────────────────────────

function formatCost(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 1) return `¢${(n * 100).toFixed(2)}`;
  return `$${n.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function shortenModel(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("claude-opus-4-5") || m.includes("claude-opus-4.5")) return "Opus 4.5";
  if (m.includes("claude-opus-4")) return "Opus 4";
  if (m.includes("claude-sonnet-4-5") || m.includes("claude-sonnet-4.5")) return "Sonnet 4.5";
  if (m.includes("claude-sonnet-4")) return "Sonnet 4";
  if (m.includes("claude-haiku-3-5") || m.includes("claude-haiku-3.5")) return "Haiku 3.5";
  if (m.includes("claude-3-5-sonnet") || m.includes("claude-3.5-sonnet")) return "Sonnet 3.5";
  if (m.includes("claude-3-opus")) return "Opus 3";
  if (m.includes("claude-3-haiku")) return "Haiku 3";
  if (m.includes("gpt-4o-mini")) return "GPT-4o mini";
  if (m.includes("gpt-4o")) return "GPT-4o";
  if (m.includes("gpt-4")) return "GPT-4";
  if (m.includes("gpt-3.5")) return "GPT-3.5";
  if (m.includes("gemini-2.0-flash")) return "Gemini 2.0 Flash";
  if (m.includes("gemini-1.5-flash")) return "Gemini 1.5 Flash";
  if (m.includes("gemini-1.5-pro")) return "Gemini 1.5 Pro";
  if (m.includes("grok")) return "Grok";
  return model.length > 20 ? model.slice(0, 18) + "…" : model;
}

const KIND_COLORS: Record<string, string> = {
  main: "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30",
  subagent: "bg-blue-500/20 text-blue-400 border border-blue-400/30",
  group: "bg-purple-500/20 text-purple-400 border border-purple-400/30",
  cron: "bg-yellow-500/20 text-yellow-400 border border-yellow-400/30",
  heartbeat: "bg-orange-500/20 text-orange-400 border border-orange-400/30",
  other: "bg-[#333] text-[#888] border border-[#444]",
  unknown: "bg-[#333] text-[#888] border border-[#444]",
};

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "bg-[#d97706]/20 text-[#d97706]",
  openai: "bg-[#10b981]/20 text-[#10b981]",
  google: "bg-blue-500/20 text-blue-400",
  xai: "bg-purple-500/20 text-purple-400",
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TopStats {
  today: number;
  week: number;
  month: number;
  allTime: number;
}

interface Summary {
  totalCost: number;
  totalCalls: number;
  totalTokens: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  bySessionKind: Record<string, number>;
  mostUsedModel: string;
  mostExpensiveModel: string;
  avgCostPerCall: number;
}

interface DailyEntry {
  date: string;
  cost: number;
  calls: number;
  tokens: number;
}

interface UsageRecord {
  id: string;
  session_kind: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_total: string;
  recorded_at: string;
  stop_reason: string;
}

interface ApiResponse {
  summary: Summary;
  topStats: TopStats;
  daily: DailyEntry[];
  recentCalls: UsageRecord[];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-[#111] border rounded-xl p-4 flex flex-col gap-1 ${highlight ? "border-[#10b981]/30" : "border-[#2a2a2a]"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[#666] text-xs uppercase tracking-wider">{label}</span>
        <Icon size={14} className={highlight ? "text-[#10b981]" : "text-[#444]"} />
      </div>
      <div className={`text-2xl font-bold font-mono ${highlight ? "text-[#10b981]" : "text-white"}`}>
        {value}
      </div>
      {sub && <div className="text-[#555] text-xs">{sub}</div>}
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({ daily }: { daily: DailyEntry[] }) {
  const maxCost = Math.max(...daily.map((d) => d.cost), 0.0001);
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-white text-sm font-semibold">Daily Cost — Last 14 Days</span>
        <span className="text-[#555] text-xs">max {formatCost(maxCost)}</span>
      </div>
      <div className="flex items-end gap-1 h-24">
        {daily.map((d) => {
          const pct = maxCost > 0 ? (d.cost / maxCost) * 100 : 0;
          const isToday = d.date === new Date().toISOString().slice(0, 10);
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                {d.date}<br />{formatCost(d.cost)} · {d.calls} calls
              </div>
              <div
                className={`w-full rounded-t transition-all ${isToday ? "bg-[#10b981]" : "bg-[#10b981]/40 group-hover:bg-[#10b981]/70"}`}
                style={{ height: `${Math.max(pct, d.cost > 0 ? 4 : 0)}%` }}
              />
              <span className="text-[#444] text-[9px] hidden sm:block">
                {d.date.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UsageClient() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [collectMsg, setCollectMsg] = useState("");
  const [period, setPeriod] = useState("week");
  const [providerFilter, setProviderFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (providerFilter) params.set("provider", providerFilter);
      if (modelFilter) params.set("model", modelFilter);
      const res = await fetch(`/api/usage?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [period, providerFilter, modelFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function collectNow() {
    setCollecting(true);
    setCollectMsg("");
    try {
      const res = await fetch("/api/usage/collect", { method: "POST" });
      const json = await res.json();
      setCollectMsg(json.message || "Done");
      await fetchData();
    } catch (e) {
      setCollectMsg("Error collecting");
    } finally {
      setCollecting(false);
    }
  }

  const s = data?.summary;
  const ts = data?.topStats;

  // Available filters from current data
  const providers = s ? Object.keys(s.byProvider) : [];
  const models = s ? Object.keys(s.byModel) : [];

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={collectNow}
            disabled={collecting}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] rounded-lg text-sm hover:bg-[#10b981]/20 transition-all disabled:opacity-50"
          >
            <Zap size={13} className={collecting ? "animate-pulse" : ""} />
            {collecting ? "Collecting…" : "Collect Now"}
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded-lg text-sm hover:text-white hover:bg-[#222] transition-all disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
        {collectMsg && (
          <span className="text-[#10b981] text-xs bg-[#10b981]/10 px-3 py-1 rounded-full">
            {collectMsg}
          </span>
        )}
      </div>

      {/* Top stats — always all-time figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Today"
          value={ts ? formatCost(ts.today) : "—"}
          icon={Activity}
          highlight={!!ts && ts.today > 0}
        />
        <StatCard
          label="This Week"
          value={ts ? formatCost(ts.week) : "—"}
          icon={TrendingUp}
        />
        <StatCard
          label="This Month"
          value={ts ? formatCost(ts.month) : "—"}
          icon={DollarSign}
        />
        <StatCard
          label="All Time"
          value={ts ? formatCost(ts.allTime) : "—"}
          icon={Database}
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Calls (period)"
          value={s ? s.totalCalls.toLocaleString() : "—"}
          icon={Activity}
        />
        <StatCard
          label="Avg / Call"
          value={s ? formatCost(s.avgCostPerCall) : "—"}
          icon={DollarSign}
        />
        <StatCard
          label="Priciest Model"
          value={s ? shortenModel(s.mostExpensiveModel) : "—"}
          icon={TrendingUp}
        />
        <StatCard
          label="Most Used"
          value={s ? shortenModel(s.mostUsedModel) : "—"}
          icon={Zap}
        />
      </div>

      {/* Bar chart */}
      {data?.daily && <BarChart daily={data.daily} />}

      {/* Provider pills + filter row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Provider pills */}
        {s &&
          Object.entries(s.byProvider)
            .sort((a, b) => b[1] - a[1])
            .map(([prov, cost]) => (
              <button
                key={prov}
                onClick={() => setProviderFilter(providerFilter === prov ? "" : prov)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  providerFilter === prov
                    ? "border-white/30"
                    : "border-transparent opacity-70 hover:opacity-100"
                } ${PROVIDER_COLORS[prov] || "bg-[#333] text-[#aaa]"}`}
              >
                {prov} · {formatCost(cost)}
              </button>
            ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period */}
        <div className="flex rounded-lg overflow-hidden border border-[#2a2a2a]">
          {["day", "week", "month", "all"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs transition-all ${
                period === p
                  ? "bg-[#10b981]/15 text-[#10b981]"
                  : "text-[#666] hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Provider dropdown */}
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] text-[#888] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#10b981]/50"
        >
          <option value="">All Providers</option>
          {providers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Model dropdown */}
        <select
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
          className="bg-[#111] border border-[#2a2a2a] text-[#888] text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#10b981]/50"
        >
          <option value="">All Models</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {shortenModel(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Recent calls table */}
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
          <span className="text-white text-sm font-semibold">Recent Calls</span>
          <span className="text-[#555] text-xs">last 50</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-[#555] text-sm">Loading…</div>
          ) : !data?.recentCalls?.length ? (
            <div className="p-8 text-center text-[#555] text-sm">
              No usage data yet. Click "Collect Now" to import from session files.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left px-4 py-2 text-[#555] text-xs font-normal">Time</th>
                  <th className="text-left px-4 py-2 text-[#555] text-xs font-normal">Kind</th>
                  <th className="text-left px-4 py-2 text-[#555] text-xs font-normal">Model</th>
                  <th className="text-right px-4 py-2 text-[#555] text-xs font-normal">In</th>
                  <th className="text-right px-4 py-2 text-[#555] text-xs font-normal">Out</th>
                  <th className="text-right px-4 py-2 text-[#555] text-xs font-normal">Total</th>
                  <th className="text-right px-4 py-2 text-[#555] text-xs font-normal">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.recentCalls.map((r) => {
                  const ts = new Date(r.recorded_at);
                  const timeStr = ts.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });
                  const kindClass =
                    KIND_COLORS[r.session_kind] || KIND_COLORS.unknown;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-[#1a1a1a] hover:bg-[#161616] transition-colors"
                    >
                      <td className="px-4 py-2 text-[#666] text-xs whitespace-nowrap">
                        {timeStr}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${kindClass}`}
                        >
                          {r.session_kind}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[#ccc] text-xs">
                        {shortenModel(r.model)}
                      </td>
                      <td className="px-4 py-2 text-right text-[#666] text-xs font-mono">
                        {formatTokens(r.input_tokens)}
                      </td>
                      <td className="px-4 py-2 text-right text-[#666] text-xs font-mono">
                        {formatTokens(r.output_tokens)}
                      </td>
                      <td className="px-4 py-2 text-right text-[#888] text-xs font-mono">
                        {formatTokens(r.total_tokens)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        <span
                          className={
                            parseFloat(r.cost_total) >= 0.1
                              ? "text-yellow-400"
                              : parseFloat(r.cost_total) >= 0.01
                              ? "text-[#10b981]"
                              : "text-[#555]"
                          }
                        >
                          {formatCost(parseFloat(r.cost_total))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
