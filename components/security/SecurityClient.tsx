"use client";

import { useEffect, useState, useCallback } from "react";
import { Shield, RefreshCw, ChevronDown, AlertTriangle, Eye } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface SecurityScan {
  id: string;
  scanned_at: string;
  repo: string;
  commit_sha: string | null;
  files_analyzed: number;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  status: "pending" | "running" | "complete" | "failed";
  error: string | null;
}

interface SecurityFinding {
  id: string;
  scan_id: string;
  finding_number: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  lens: "offensive" | "defensive" | "privacy" | "realism";
  title: string;
  description: string;
  affected_files: string[];
  remediation: string;
  effort: "quick-fix" | "needs-design" | "major-refactor";
  is_new: boolean;
  is_resolved: boolean;
  first_seen: string;
  last_seen: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { label: "Critical", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40", dot: "bg-red-500" },
  high: { label: "High", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40", dot: "bg-orange-500" },
  medium: { label: "Medium", bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40", dot: "bg-yellow-500" },
  low: { label: "Low", bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40", dot: "bg-blue-400" },
  info: { label: "Info", bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/40", dot: "bg-gray-500" },
};

const EFFORT_CONFIG = {
  "quick-fix": { label: "Quick Fix", bg: "bg-green-500/20", text: "text-green-400" },
  "needs-design": { label: "Needs Design", bg: "bg-yellow-500/20", text: "text-yellow-400" },
  "major-refactor": { label: "Major Refactor", bg: "bg-red-500/20", text: "text-red-400" },
};

const LENS_EMOJI = {
  offensive: "🔴",
  defensive: "🟢",
  privacy: "🟣",
  realism: "🟡",
};

function SeverityBadge({ severity }: { severity: SecurityFinding["severity"] }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function EffortBadge({ effort }: { effort: SecurityFinding["effort"] }) {
  const cfg = EFFORT_CONFIG[effort];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffH / 24);
  if (diffD > 0) return `${diffD}d ago`;
  if (diffH > 0) return `${diffH}h ago`;
  const diffM = Math.floor(diffMs / 60000);
  return diffM > 0 ? `${diffM}m ago` : "just now";
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SecurityClient() {
  const [scan, setScan] = useState<SecurityScan | null>(null);
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [deepDive, setDeepDive] = useState<string | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);

  const loadFindings = useCallback(async (scanId?: string) => {
    try {
      const url = scanId
        ? `/api/security/findings?scan_id=${scanId}`
        : "/api/security/findings";
      const res = await fetch(url);
      const data = await res.json();
      setScan(data.scan);
      setFindings(data.findings || []);
      if (data.findings?.length > 0 && !selectedFinding) {
        setSelectedFinding(data.findings[0]);
      }
    } catch (err) {
      console.error("Failed to load findings:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedFinding]);

  useEffect(() => {
    loadFindings();
  }, [loadFindings]);

  const runScan = async () => {
    setScanning(true);
    setDeepDive(null);
    setDeepDiveOpen(false);
    try {
      const res = await fetch("/api/security/scan", { method: "POST" });
      const data = await res.json();
      if (data.ok && data.scan_id) {
        await loadFindings(data.scan_id);
      }
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const requestDeepDive = async (finding: SecurityFinding) => {
    setDeepDiveLoading(true);
    setDeepDiveOpen(true);
    setDeepDive(null);
    try {
      const res = await fetch("/api/security/dive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding_id: finding.id }),
      });
      const data = await res.json();
      setDeepDive(data.deep_dive || "No analysis returned.");
    } catch {
      setDeepDive("Failed to generate deep dive. Please try again.");
    } finally {
      setDeepDiveLoading(false);
    }
  };

  const filteredFindings =
    severityFilter === "all"
      ? findings
      : findings.filter((f) => f.severity === severityFilter);

  const hasCritical = (scan?.critical_count ?? 0) > 0;

  // ── Empty State ────────────────────────────────────────────────────────────

  if (!loading && !scan) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-6 text-center p-8">
        <Shield size={64} className="text-gray-600" />
        <div>
          <h2 className="text-xl font-semibold text-white mb-2">No scan data yet</h2>
          <p className="text-gray-500 max-w-sm">
            Run your first scan to see security findings from the Pontis codebase.
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
        >
          {scanning ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <Shield size={16} />
              Run First Scan
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw size={20} className="animate-spin" />
          <span className="text-sm">Loading security data…</span>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Critical Alert Banner */}
      {hasCritical && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/60 border-b border-red-700/50 text-red-300 text-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <AlertTriangle size={14} />
          <strong>{scan?.critical_count} critical finding{scan?.critical_count !== 1 ? "s" : ""}</strong>
          &nbsp;require immediate attention
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center gap-3">
          <Shield size={22} className="text-emerald-400" />
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Security Council</h1>
            {scan && (
              <p className="text-xs text-gray-500 mt-0.5">
                Last scan {formatRelativeTime(scan.scanned_at)} · {scan.files_analyzed} files · {scan.total_findings} findings
              </p>
            )}
          </div>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700/60 hover:bg-emerald-600/70 disabled:opacity-50 text-emerald-300 border border-emerald-700/40 rounded-lg text-sm font-medium transition-colors"
        >
          {scanning ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <RefreshCw size={14} />
              Run Scan Now
            </>
          )}
        </button>
      </header>

      {/* Scanning overlay */}
      {scanning && (
        <div className="flex items-center justify-center gap-3 py-4 bg-gray-800/50 border-b border-gray-700 text-gray-300 text-sm">
          <RefreshCw size={16} className="animate-spin text-emerald-400" />
          <span>🔍 Scanning codebase</span>
          <LoadingDots />
        </div>
      )}

      {/* Stats Bar */}
      {scan && (
        <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-gray-800">
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const cfg = SEVERITY_CONFIG[sev];
            const count = scan[`${sev}_count` as keyof SecurityScan] as number;
            return (
              <button
                key={sev}
                onClick={() =>
                  setSeverityFilter(severityFilter === sev ? "all" : sev)
                }
                className={`flex flex-col items-center py-3 rounded-xl border transition-all ${
                  severityFilter === sev
                    ? `${cfg.bg} ${cfg.border} ${cfg.text}`
                    : "border-gray-700/50 bg-gray-800/40 text-gray-400 hover:border-gray-600"
                }`}
              >
                <span className={`text-2xl font-bold ${severityFilter === sev ? cfg.text : "text-white"}`}>
                  {count}
                </span>
                <span className="text-xs mt-0.5 font-medium">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Severity Tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-800 bg-gray-900">
        {(["all", "critical", "high", "medium", "low"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSeverityFilter(tab)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              severityFilter === tab
                ? "bg-emerald-700/40 text-emerald-300 border border-emerald-700/40"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
            }`}
          >
            {tab === "all"
              ? `All (${findings.length})`
              : `${tab.charAt(0).toUpperCase() + tab.slice(1)} (${findings.filter((f) => f.severity === tab).length})`}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0, height: "calc(100vh - 220px)" }}>
        {/* Left: Findings List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 overflow-y-auto bg-gray-900">
          {filteredFindings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600 text-sm">
              No findings for this filter
            </div>
          ) : (
            <ul>
              {filteredFindings.map((finding) => {
                const cfg = SEVERITY_CONFIG[finding.severity];
                const isSelected = selectedFinding?.id === finding.id;
                return (
                  <li key={finding.id}>
                    <button
                      onClick={() => {
                        setSelectedFinding(finding);
                        setDeepDive(null);
                        setDeepDiveOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3.5 border-b border-gray-800 transition-all ${
                        isSelected
                          ? "bg-gray-800 border-l-2 border-l-emerald-500"
                          : "hover:bg-gray-800/60"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-600 font-mono mt-0.5 min-w-[24px]">
                          #{finding.finding_number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label.toUpperCase()}
                            </span>
                            <span className="text-xs">{LENS_EMOJI[finding.lens]}</span>
                          </div>
                          <p className="text-sm text-gray-200 leading-snug line-clamp-2">
                            {finding.title}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedFinding ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
              <Shield size={40} />
              <p className="text-sm">Select a finding to view details</p>
            </div>
          ) : (
            <div className="max-w-2xl">
              {/* Finding Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="font-mono text-sm text-gray-500">
                    #{selectedFinding.finding_number}
                  </span>
                  <SeverityBadge severity={selectedFinding.severity} />
                  <span className="text-sm">
                    {LENS_EMOJI[selectedFinding.lens]}{" "}
                    <span className="text-gray-500 capitalize">{selectedFinding.lens}</span>
                  </span>
                  {selectedFinding.effort && (
                    <EffortBadge effort={selectedFinding.effort} />
                  )}
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">
                  {selectedFinding.title}
                </h2>
              </div>

              {/* Description */}
              <section className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                  Description
                </h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  {selectedFinding.description}
                </p>
              </section>

              {/* Affected Files */}
              {selectedFinding.affected_files?.length > 0 && (
                <section className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                    Affected Files
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedFinding.affected_files.map((file) => (
                      <code
                        key={file}
                        className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-emerald-300 font-mono"
                      >
                        {file}
                      </code>
                    ))}
                  </div>
                </section>
              )}

              {/* Remediation */}
              {selectedFinding.remediation && (
                <section className="mb-6 p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
                  <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-2">
                    Remediation
                  </h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {selectedFinding.remediation}
                  </p>
                </section>
              )}

              {/* Deep Dive Button */}
              <div className="mb-4">
                <button
                  onClick={() => requestDeepDive(selectedFinding)}
                  disabled={deepDiveLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-700/40 hover:bg-indigo-600/50 disabled:opacity-50 text-indigo-300 border border-indigo-700/40 rounded-lg text-sm font-medium transition-colors"
                >
                  {deepDiveLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Generating deep dive…
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      Deep Dive (Opus)
                    </>
                  )}
                </button>
              </div>

              {/* Deep Dive Panel */}
              {deepDiveOpen && (
                <section className="border border-indigo-800/50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setDeepDiveOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-indigo-900/30 text-indigo-300 text-sm font-medium"
                  >
                    <span>Deep Dive Analysis</span>
                    <ChevronDown size={16} />
                  </button>
                  <div className="p-4 bg-gray-800/40">
                    {deepDiveLoading ? (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <RefreshCw size={14} className="animate-spin" />
                        Analyzing with Opus…
                      </div>
                    ) : (
                      <div className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {deepDive}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Animated dots helper
function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
