"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  RefreshCw,
  CalendarClock,
  Timer,
  Zap,
  ChevronDown,
} from "lucide-react";

interface CronJobRaw {
  id?: string;
  name?: string;
  enabled?: boolean;
  schedule?: { kind?: string; expr?: string; everyMs?: number; tz?: string };
  payload?: { kind?: string; message?: string; model?: string; thinking?: string; timeoutSeconds?: number };
  delivery?: { mode?: string; channel?: string; to?: string };
  sessionTarget?: string;
  state?: { nextRunAtMs?: number; lastRunAtMs?: number; lastStatus?: string; lastDurationMs?: number };
}

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule_kind: string | null;
  schedule_expr: string | null;
  schedule_every_ms: number | null;
  schedule_tz: string | null;
  payload_kind: string | null;
  session_target: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  updated_at: string;
  raw: CronJobRaw | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseCronExpr(expr: string, tz: string | null): string {
  const tz_label = tz?.includes("Denver") ? "MT" : tz ?? "UTC";
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;
  const [min, hour, , , dow] = parts;

  const isPaddedHour = hour !== "*";
  const isPaddedMin = min !== "*";

  // Weekday names
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function fmtTime(h: string, m: string) {
    const hNum = parseInt(h);
    const mNum = parseInt(m);
    const suffix = hNum >= 12 ? "PM" : "AM";
    const h12 = hNum % 12 || 12;
    const mStr = mNum === 0 ? "" : `:${String(mNum).padStart(2, "0")}`;
    return `${h12}${mStr} ${suffix} ${tz_label}`;
  }

  const [, , dom] = parts;

  // Monthly on specific day
  if (dom !== "*" && dow === "*" && isPaddedHour && isPaddedMin) {
    const ordinal = dom === "1" ? "1st" : dom === "2" ? "2nd" : dom === "3" ? "3rd" : `${dom}th`;
    return `${ordinal} of month at ${fmtTime(hour, min)}`;
  }

  // Every day at time
  if (dow === "*" && isPaddedHour && isPaddedMin) {
    return `Daily at ${fmtTime(hour, min)}`;
  }

  // Specific weekday at time
  if (dow !== "*" && isPaddedHour) {
    const dayName = days[parseInt(dow)] ?? `day ${dow}`;
    return `Every ${dayName} at ${fmtTime(hour, min)}`;
  }

  return expr;
}

function formatEvery(ms: number): string {
  if (ms >= 86400000) return `Every ${Math.round(ms / 86400000)}d`;
  if (ms >= 3600000) return `Every ${Math.round(ms / 3600000)}h`;
  if (ms >= 60000) return `Every ${Math.round(ms / 60000)} min`;
  return `Every ${Math.round(ms / 1000)}s`;
}

function humanSchedule(job: CronJob): string {
  if (job.schedule_kind === "cron" && job.schedule_expr) {
    return parseCronExpr(job.schedule_expr, job.schedule_tz);
  }
  if (job.schedule_kind === "every" && job.schedule_every_ms) {
    return formatEvery(job.schedule_every_ms);
  }
  return "—";
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const now = Date.now();
  const ts = new Date(iso).getTime();
  const diff = ts - now;
  const abs = Math.abs(diff);
  const future = diff > 0;

  if (abs < 60000) return future ? "in <1m" : "just now";
  const mins = Math.floor(abs / 60000);
  if (abs < 3600000) return future ? `in ${mins}m` : `${mins}m ago`;
  const hours = Math.floor(abs / 3600000);
  const remMins = Math.floor((abs % 3600000) / 60000);
  if (abs < 86400000)
    return future
      ? `in ${hours}h ${remMins}m`
      : `${hours}h ${remMins}m ago`;
  const days = Math.floor(abs / 86400000);
  return future ? `in ${days}d` : `${days}d ago`;
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CronsClient() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/crons");
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setJobs(data.jobs ?? []);
        setError(null);
      }
      setLastRefresh(new Date());
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  async function syncNow() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/crons/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sync-secret": "pontis-cron-sync-2026",
        },
        body: JSON.stringify({ jobs: [] }),
      });
      const data = await res.json();
      if (data.ok) {
        setSyncMsg(`Synced ${data.upserted} jobs`);
        await load();
      } else {
        setSyncMsg(`Error: ${data.error}`);
      }
    } catch (e: unknown) {
      setSyncMsg(`Error: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 4000);
    }
  }

  const activeCount = jobs.filter((j) => j.enabled).length;
  const disabledCount = jobs.filter((j) => !j.enabled).length;

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Total Jobs</p>
          <p className="text-2xl font-bold text-white">{jobs.length}</p>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Active</p>
          <p className="text-2xl font-bold text-[#10b981]">{activeCount}</p>
        </div>
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Disabled</p>
          <p className="text-2xl font-bold text-[#555]">{disabledCount}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
          <XCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Sync feedback */}
      {syncMsg && (
        <div className="flex items-center gap-2 text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 rounded-lg p-3 text-sm">
          <CheckCircle2 size={14} />
          <span>{syncMsg}</span>
        </div>
      )}

      {/* Table */}
      {jobs.length === 0 && !error ? (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-10 text-center">
          <Clock size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#555] text-sm">No cron jobs found.</p>
          <p className="text-[#444] text-xs mt-1">Sync from the Mac mini to populate.</p>
        </div>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider">Schedule</th>
                <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider">Next Run</th>
                <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider">Last Run</th>
                <th className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {jobs.map((job) => {
                const isExpanded = expandedId === job.id;
                const raw = job.raw as CronJobRaw | null;
                return (
                  <React.Fragment key={job.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      className={`hover:bg-[#1a1a1a] transition-colors cursor-pointer ${isExpanded ? "bg-[#1a1a1a]" : ""}`}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Zap size={13} className={job.enabled ? "text-[#10b981]" : "text-[#444]"} />
                          <span className="text-white font-medium">{job.name}</span>
                          <ChevronDown size={13} className={`text-[#555] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {job.enabled ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#10b981]/10 text-[#10b981] text-xs font-medium">
                            <CheckCircle2 size={11} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#2a2a2a] text-[#555] text-xs font-medium">
                            <PauseCircle size={11} />
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Schedule */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[#aaa]">
                          <CalendarClock size={13} className="text-[#555]" />
                          <span>{humanSchedule(job)}</span>
                        </div>
                      </td>

                      {/* Next run */}
                      <td className="px-4 py-3">
                        {job.next_run_at ? (
                          <span className="text-[#888]">{relativeTime(job.next_run_at)}</span>
                        ) : (
                          <span className="text-[#444]">—</span>
                        )}
                      </td>

                      {/* Last run */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {job.last_run_at ? (
                            <>
                              {job.last_status === "ok" ? (
                                <CheckCircle2 size={13} className="text-[#10b981] shrink-0" />
                              ) : job.last_status ? (
                                <XCircle size={13} className="text-red-400 shrink-0" />
                              ) : null}
                              <span className="text-[#888]">{relativeTime(job.last_run_at)}</span>
                              {job.last_duration_ms != null && (
                                <span className="flex items-center gap-1 text-[#555] text-xs">
                                  <Timer size={11} />
                                  {formatDuration(job.last_duration_ms)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[#444]">Never</span>
                          )}
                        </div>
                      </td>

                      {/* Session target */}
                      <td className="px-4 py-3">
                        {job.session_target ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-[#2a2a2a] text-[#777]">
                            {job.session_target}
                          </span>
                        ) : (
                          <span className="text-[#444]">—</span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-[#111] border-t border-[#2a2a2a]">
                          <div className="px-6 py-4 space-y-4">
                            {/* Detail grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Schedule Type</p>
                                <p className="text-sm text-white">{job.schedule_kind ?? "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Expression</p>
                                <p className="text-sm text-white font-mono">{job.schedule_expr ?? (job.schedule_every_ms ? `${job.schedule_every_ms}ms` : "—")}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Timezone</p>
                                <p className="text-sm text-white">{job.schedule_tz ?? "UTC"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Payload Type</p>
                                <p className="text-sm text-white">{job.payload_kind ?? "—"}</p>
                              </div>
                              {raw?.payload?.model && (
                                <div>
                                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Model</p>
                                  <p className="text-sm text-white">{raw.payload.model}</p>
                                </div>
                              )}
                              {raw?.payload?.thinking && (
                                <div>
                                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Thinking</p>
                                  <p className="text-sm text-white">{raw.payload.thinking}</p>
                                </div>
                              )}
                              {raw?.payload?.timeoutSeconds && (
                                <div>
                                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Timeout</p>
                                  <p className="text-sm text-white">{raw.payload.timeoutSeconds}s</p>
                                </div>
                              )}
                              {raw?.delivery?.mode && raw.delivery.mode !== "none" && (
                                <div>
                                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Delivery</p>
                                  <p className="text-sm text-white">{raw.delivery.mode}{raw.delivery.channel ? ` → ${raw.delivery.channel}` : ""}{raw.delivery.to ? ` (${raw.delivery.to})` : ""}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Job ID</p>
                                <p className="text-xs text-[#555] font-mono">{job.id}</p>
                              </div>
                            </div>

                            {/* Prompt / Message */}
                            {raw?.payload?.message && (
                              <div>
                                <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Prompt / Instructions</p>
                                <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-4 max-h-[300px] overflow-y-auto">
                                  <pre className="text-xs text-[#999] whitespace-pre-wrap leading-relaxed font-mono">{raw.payload.message}</pre>
                                </div>
                              </div>
                            )}

                            {/* Next / Last run details */}
                            <div className="flex items-center gap-6 text-xs text-[#555] pt-1 border-t border-[#1e1e1e]">
                              {job.next_run_at && (
                                <span>Next: {new Date(job.next_run_at).toLocaleString()}</span>
                              )}
                              {job.last_run_at && (
                                <span>Last: {new Date(job.last_run_at).toLocaleString()} ({job.last_status ?? "unknown"})</span>
                              )}
                              {job.last_duration_ms != null && (
                                <span>Duration: {formatDuration(job.last_duration_ms)}</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-[#444]">
        <span>
          {lastRefresh
            ? `Refreshed at ${lastRefresh.toLocaleTimeString()}`
            : "Auto-refreshes every 60s"}
        </span>
        <button
          onClick={syncNow}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#3a3a3a] transition-all disabled:opacity-50 text-xs"
        >
          <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync Now"}
        </button>
      </div>
    </div>
  );
}
