"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, X, ChevronRight, Phone, Mail, Globe, MapPin, Calendar,
  AlertCircle, Clock, TrendingUp, Building2, Filter, Search, ChevronLeft,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Partner {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  territory: string | null;
  website: string | null;
  phone: string | null;
  pipeline_status: string;
  health_score: number;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  total_medallions_ordered: number;
  mrr: number | string;
  notes: string | null;
}

interface Stats {
  total: number;
  activePipeline: number;
  won: number;
  lost: number;
  conversionRate: string;
  pipelineValue: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "prospect", label: "Prospect", color: "#52525b" },
  { key: "warm", label: "Warm", color: "#eab308" },
  { key: "demo_scheduled", label: "Demo Scheduled", color: "#3b82f6" },
  { key: "demo_done", label: "Demo Done", color: "#8b5cf6" },
  { key: "negotiating", label: "Negotiating", color: "#f97316" },
  { key: "active", label: "Active", color: "#10b981" },
  { key: "inactive", label: "Inactive", color: "#6b7280" },
  { key: "lost", label: "Lost", color: "#ef4444" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function healthColor(score: number): string {
  if (score > 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function healthLabel(score: number): string {
  if (score > 70) return "Healthy";
  if (score >= 40) return "Warning";
  return "Critical";
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMRR(mrr: number | string): string {
  const n = typeof mrr === "string" ? parseFloat(mrr) : mrr;
  if (!n || isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs mb-2 text-[#555]">
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: color || "white" }}>{value}</p>
      {sub && <p className="text-[10px] text-[#555] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── PipelineCard ─────────────────────────────────────────────────────────────

function PipelineCard({ partner, onSelect, onMove }: {
  partner: Partner;
  onSelect: () => void;
  onMove: (direction: "next" | "prev") => void;
}) {
  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.key === partner.pipeline_status);
  const canMoveNext = currentStageIndex < PIPELINE_STAGES.length - 1;
  const canMovePrev = currentStageIndex > 0;

  return (
    <div
      onClick={onSelect}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#444] transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate group-hover:text-[#10b981] transition-colors">
            {partner.name}
          </h4>
          {(partner.city || partner.state) && (
            <p className="text-xs text-[#555] mt-0.5">
              {[partner.city, partner.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: healthColor(partner.health_score) }}
          title={`Health: ${partner.health_score} (${healthLabel(partner.health_score)})`}
        />
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[#666] mb-3">
        <span className="flex items-center gap-1">
          <Clock size={9} />
          {formatRelative(partner.last_contact_at)}
        </span>
      </div>

      {partner.next_action && (
        <div className="text-xs text-[#888] mb-3 truncate">
          <span className="text-[#10b981]">→</span> {partner.next_action}
        </div>
      )}

      {/* Move buttons */}
      <div className="flex gap-1.5 pt-2 border-t border-[#2a2a2a]">
        {canMovePrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove("prev"); }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] bg-[#111] border border-[#2a2a2a] rounded text-[#666] hover:text-white hover:border-[#444] transition-colors"
            title={`← ${PIPELINE_STAGES[currentStageIndex - 1]?.label}`}
          >
            <ChevronLeft size={10} />
            Prev
          </button>
        )}
        {canMoveNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove("next"); }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] bg-[#10b981]/10 border border-[#10b981]/30 rounded text-[#10b981] hover:bg-[#10b981]/20 transition-colors"
            title={`${PIPELINE_STAGES[currentStageIndex + 1]?.label} →`}
          >
            Next
            <ChevronRight size={10} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PipelineColumn ───────────────────────────────────────────────────────────

function PipelineColumn({ stage, partners, onSelectPartner, onMovePartner }: {
  stage: { key: string; label: string; color: string };
  partners: Partner[];
  onSelectPartner: (p: Partner) => void;
  onMovePartner: (p: Partner, direction: "next" | "prev") => void;
}) {
  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      <div
        className="rounded-lg p-3 mb-3 border-2"
        style={{ borderColor: stage.color, backgroundColor: `${stage.color}15` }}
      >
        <h3 className="text-sm font-bold" style={{ color: stage.color }}>
          {stage.label}
        </h3>
        <p className="text-xs text-[#666] mt-0.5">{partners.length} {partners.length === 1 ? "company" : "companies"}</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1 pb-4">
        {partners.map((p) => (
          <PipelineCard
            key={p.id}
            partner={p}
            onSelect={() => onSelectPartner(p)}
            onMove={(direction) => onMovePartner(p, direction)}
          />
        ))}
        {partners.length === 0 && (
          <div className="text-center py-8 text-[#555] text-xs">No companies</div>
        )}
      </div>
    </div>
  );
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────

function DetailPanel({ partner: initialPartner, onClose, onUpdated }: {
  partner: Partner;
  onClose: () => void;
  onUpdated: (p: Partner) => void;
}) {
  const partner = initialPartner;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-[#0f0f0f] border-l border-[#2a2a2a] z-50 flex flex-col shadow-2xl overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-[#2a2a2a] flex-shrink-0 sticky top-0 bg-[#0f0f0f] z-10">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: healthColor(partner.health_score) }}
            />
            <h2 className="text-lg font-bold text-white truncate">{partner.name}</h2>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs" style={{ color: healthColor(partner.health_score) }}>
              Health {partner.health_score}
            </span>
            {(partner.city || partner.state) && (
              <span className="text-xs text-[#555]">
                📍 {[partner.city, partner.state].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        {/* Company Info */}
        <div className="space-y-2">
          <p className="text-[11px] text-[#555] uppercase tracking-wider">Company Info</p>
          <div className="bg-[#1a1a1a] rounded-xl p-4 space-y-2">
            {partner.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={13} className="text-[#555]" />
                <span className="text-[#aaa]">{partner.phone}</span>
              </div>
            )}
            {partner.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe size={13} className="text-[#555]" />
                <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-[#10b981] hover:underline truncate">
                  {partner.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
            {(partner.city || partner.state) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={13} className="text-[#555]" />
                <span className="text-[#aaa]">{[partner.city, partner.state].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1a1a1a] rounded-xl p-4">
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Territory</p>
            <p className="text-sm text-white">{partner.territory || "—"}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4">
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Medallions Ordered</p>
            <p className="text-2xl font-bold text-white">{partner.total_medallions_ordered}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4">
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">MRR</p>
            <p className="text-2xl font-bold text-[#10b981]">{formatMRR(partner.mrr)}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-xl p-4">
            <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Last Contact</p>
            <p className="text-sm text-[#888]">{formatRelative(partner.last_contact_at)}</p>
          </div>
        </div>

        {/* Next Action */}
        {partner.next_action && (
          <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
            <div className="flex items-center gap-2 mb-2">
              <ChevronRight size={13} className="text-[#10b981]" />
              <p className="text-[11px] text-[#555] uppercase tracking-wider">Next Action</p>
            </div>
            <p className="text-sm text-white">{partner.next_action}</p>
            {partner.next_action_due && (
              <div className="flex items-center gap-1 mt-2">
                <Calendar size={10} className="text-[#555]" />
                <span className="text-xs text-[#555]">{formatDate(partner.next_action_due)}</span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {partner.notes && (
          <div>
            <p className="text-[11px] text-[#555] uppercase tracking-wider mb-2">Notes</p>
            <div className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
              <p className="text-sm text-[#aaa] whitespace-pre-wrap leading-relaxed">{partner.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesFunnelClient() {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Record<string, Partner[]>>({});
  const [stats, setStats] = useState<Stats>({ total: 0, activePipeline: 0, won: 0, lost: 0, conversionRate: "0.0%", pipelineValue: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [territoryFilter, setTerritoryFilter] = useState("all");
  const [hideInactiveLost, setHideInactiveLost] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableTerritories, setAvailableTerritories] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (stateFilter !== "all") params.set("state", stateFilter);
      if (territoryFilter !== "all") params.set("territory", territoryFilter);
      if (hideInactiveLost) params.set("hideInactiveLost", "true");

      const res = await fetch(`/api/sales-funnel?${params}`);
      const data = await res.json();
      setStages(data.stages || {});
      setStats(data.stats || { total: 0, activePipeline: 0, won: 0, lost: 0, conversionRate: "0.0%", pipelineValue: 0 });

      // Extract unique states and territories
      const allPartners: Partner[] = data.partners || [];
      const states = Array.from(new Set(allPartners.map((p) => p.state).filter(Boolean))) as string[];
      const territories = Array.from(new Set(allPartners.map((p) => p.territory).filter(Boolean))) as string[];
      setAvailableStates(states.sort());
      setAvailableTerritories(territories.sort());
    } finally {
      setLoading(false);
    }
  }, [searchTerm, stateFilter, territoryFilter, hideInactiveLost]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMovePartner = async (partner: Partner, direction: "next" | "prev") => {
    const currentIndex = PIPELINE_STAGES.findIndex((s) => s.key === partner.pipeline_status);
    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= PIPELINE_STAGES.length) return;

    const newStatus = PIPELINE_STAGES[targetIndex].key;

    try {
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_status: newStatus }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("Failed to move partner:", e);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <div className="border-b border-[#2a2a2a] bg-[#0a0a0a] sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Sales Funnel</h1>
              <p className="text-sm text-[#555] mt-0.5">Monument company pipeline visualization</p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-[#888] hover:text-white hover:border-[#444] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-6 gap-3 mb-4">
            <StatCard label="Total Prospects" value={stats.total} icon={<Building2 size={12} />} />
            <StatCard label="Active Pipeline" value={stats.activePipeline} color="#eab308" icon={<TrendingUp size={12} />} />
            <StatCard label="Won (Active)" value={stats.won} color="#10b981" icon={<TrendingUp size={12} />} />
            <StatCard label="Lost" value={stats.lost} color="#ef4444" icon={<AlertCircle size={12} />} />
            <StatCard label="Conversion Rate" value={stats.conversionRate} color="#10b981" />
            <StatCard label="Pipeline Value" value={formatCurrency(stats.pipelineValue)} color="#10b981" sub="Est. active pipeline × avg order" />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2">
              <Search size={14} className="text-[#555]" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder-[#555] w-48"
              />
            </div>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white outline-none focus:border-[#10b981]/50"
            >
              <option value="all">All States</option>
              {availableStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white outline-none focus:border-[#10b981]/50"
            >
              <option value="all">All Territories</option>
              {availableTerritories.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-lg text-sm text-white cursor-pointer hover:border-[#444] transition-colors">
              <input
                type="checkbox"
                checked={hideInactiveLost}
                onChange={(e) => setHideInactiveLost(e.target.checked)}
                className="w-4 h-4 accent-[#10b981]"
              />
              <span>Hide Inactive/Lost</span>
            </label>
          </div>
        </div>
      </div>

      {/* Pipeline Columns */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-[#555] text-sm">Loading pipeline...</p>
        </div>
      ) : (
        <div className="p-6 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {PIPELINE_STAGES.map((stage) => (
              <PipelineColumn
                key={stage.key}
                stage={stage}
                partners={stages[stage.key] || []}
                onSelectPartner={setSelectedPartner}
                onMovePartner={handleMovePartner}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedPartner && (
        <DetailPanel
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
          onUpdated={(updated) => {
            setSelectedPartner(updated);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
