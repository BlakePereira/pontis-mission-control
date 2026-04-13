"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, ChevronRight, ChevronLeft, Clock, MapPin, Search,
  Flower2, SprayCan, AlertTriangle, DollarSign, FileText,
} from "lucide-react";
import FulfillmentDetailPanel from "./FulfillmentDetailPanel";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FulfillmentPartner {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  zip?: string | null;
  territory: string | null;
  website: string | null;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  partner_type?: "monument_company" | "fulfillment_partner";
  pipeline_status: string;
  health_score: number;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  next_action_assignee?: string | null;
  total_medallions_ordered?: number;
  mrr?: number | string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  is_tracked: boolean;
  lead_source?: string | null;
  // Fulfillment-specific (parsed from notes)
  fulfillment_category?: "florist" | "cleaner" | "both" | null;
  fulfillment_status?: string | null;
  service_radius_miles?: number | null;
  service_area_notes?: string | null;
  pricing_notes?: string | null;
  contract_status?: string | null;
  quality_status?: "normal" | "watch" | "restricted" | null;
  preferred_order_channel?: string | null;
}

interface Stats {
  total: number;
  lead: number;
  inProgress: number;
  onboarding: number;
  active: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "lead", label: "Lead", color: "#52525b" },
  { key: "contacted", label: "Contacted", color: "#3b82f6" },
  { key: "qualified", label: "Qualified", color: "#8b5cf6" },
  { key: "pricing_pending", label: "Pricing", color: "#eab308" },
  { key: "contract_pending", label: "Contract", color: "#f97316" },
  { key: "onboarding", label: "Onboarding", color: "#06b6d4" },
  { key: "test_ready", label: "Test Ready", color: "#10b981" },
  { key: "active", label: "Active", color: "#22c55e" },
];

const STAGE_ORDER = PIPELINE_STAGES.map(s => s.key);

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getSignals(partner: FulfillmentPartner) {
  const missingFields: string[] = [];
  const activeStatuses = ["qualified", "pricing_pending", "contract_pending", "onboarding", "test_ready", "active"];

  if (activeStatuses.includes(partner.fulfillment_status || "")) {
    if (!partner.next_action) missingFields.push("next action");
    if (!partner.next_action_assignee) missingFields.push("owner");
    if (!partner.next_action_due) missingFields.push("due date");
  }

  const today = startOfDay(new Date());
  const due = partner.next_action_due ? startOfDay(new Date(partner.next_action_due)) : null;
  const dueInDays = due ? Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const staleContactDays = partner.last_contact_at
    ? Math.floor((Date.now() - new Date(partner.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    missingFields,
    dueInDays,
    isOverdue: dueInDays !== null && dueInDays < 0,
    isDueSoon: dueInDays !== null && dueInDays >= 0 && dueInDays <= 3,
    isStale: staleContactDays !== null && staleContactDays > 14,
    staleContactDays,
  };
}

function parsePartnerNotes(notes: string | null): Partial<FulfillmentPartner> {
  if (!notes) return {};
  const result: Partial<FulfillmentPartner> = {};

  const categoryMatch = notes.match(/\[category:\s*(florist|cleaner|both)\]/i);
  if (categoryMatch) result.fulfillment_category = categoryMatch[1].toLowerCase() as "florist" | "cleaner" | "both";

  const statusMatch = notes.match(/\[fulfillment_status:\s*([^\]]+)\]/i);
  if (statusMatch) result.fulfillment_status = statusMatch[1].trim();

  const qualityMatch = notes.match(/\[quality:\s*(normal|watch|restricted)\]/i);
  if (qualityMatch) result.quality_status = qualityMatch[1].toLowerCase() as "normal" | "watch" | "restricted";

  const contractMatch = notes.match(/\[contract:\s*([^\]]+)\]/i);
  if (contractMatch) result.contract_status = contractMatch[1].trim();

  const pricingMatch = notes.match(/\[pricing:\s*([^\]]+)\]/i);
  if (pricingMatch) result.pricing_notes = pricingMatch[1].trim();

  const areaMatch = notes.match(/\[service_area:\s*([^\]]+)\]/i);
  if (areaMatch) result.service_area_notes = areaMatch[1].trim();

  return result;
}

function buildStructuredNotes(partner: FulfillmentPartner, updates: Partial<FulfillmentPartner>): string {
  const merged = { ...partner, ...updates };
  const lines: string[] = [];

  if (merged.fulfillment_category) lines.push(`[category: ${merged.fulfillment_category}]`);
  if (merged.fulfillment_status) lines.push(`[fulfillment_status: ${merged.fulfillment_status}]`);
  if (merged.quality_status) lines.push(`[quality: ${merged.quality_status}]`);
  if (merged.contract_status) lines.push(`[contract: ${merged.contract_status}]`);
  if (merged.pricing_notes) lines.push(`[pricing: ${merged.pricing_notes}]`);
  if (merged.service_area_notes) lines.push(`[service_area: ${merged.service_area_notes}]`);

  // Preserve any non-structured notes
  const plainNotes = (partner.notes || "").split("\n")
    .filter(line => !line.trim().startsWith("[") || !line.trim().endsWith("]"))
    .join("\n").trim();

  if (plainNotes) lines.push(plainNotes);

  return lines.join("\n");
}

function pricingIndicator(notes: string | null | undefined): "complete" | "partial" | "missing" {
  if (!notes) return "missing";
  if (notes.toLowerCase().includes("complete") || notes.toLowerCase().includes("confirmed")) return "complete";
  return "partial";
}

function contractIndicator(status: string | null | undefined): "signed" | "pending" | "missing" {
  if (!status) return "missing";
  if (status.toLowerCase().includes("signed") || status.toLowerCase().includes("complete")) return "signed";
  if (status.toLowerCase().includes("pending") || status.toLowerCase().includes("sent")) return "pending";
  return "missing";
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3">
      <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold" style={{ color: color || "white" }}>{value}</p>
    </div>
  );
}

// ─── PipelineCard ─────────────────────────────────────────────────────────────

function PipelineCard({ partner, onSelect, onMove }: {
  partner: FulfillmentPartner;
  onSelect: () => void;
  onMove: (direction: "next" | "prev") => void;
}) {
  const currentIndex = STAGE_ORDER.indexOf(partner.fulfillment_status || "lead");
  const canMoveNext = currentIndex >= 0 && currentIndex < STAGE_ORDER.length - 1;
  const canMovePrev = currentIndex > 0;
  const signal = getSignals(partner);
  const pricing = pricingIndicator(partner.pricing_notes);
  const contract = contractIndicator(partner.contract_status);

  return (
    <div
      onClick={onSelect}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#444] transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {partner.fulfillment_category === "florist" && <Flower2 size={12} className="text-pink-400 flex-shrink-0" />}
            {partner.fulfillment_category === "cleaner" && <SprayCan size={12} className="text-blue-400 flex-shrink-0" />}
            {partner.fulfillment_category === "both" && (
              <><Flower2 size={10} className="text-pink-400" /><SprayCan size={10} className="text-blue-400" /></>
            )}
            <h4 className="text-sm font-semibold text-white truncate group-hover:text-[#f97316] transition-colors">
              {partner.name}
            </h4>
          </div>
          {(partner.city || partner.state) && (
            <p className="text-xs text-[#555] mt-0.5 flex items-center gap-1">
              <MapPin size={9} />
              {[partner.city, partner.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        {partner.quality_status && partner.quality_status !== "normal" && (
          <span title={`Quality: ${partner.quality_status}`}>
            <AlertTriangle
              size={14}
              className={partner.quality_status === "watch" ? "text-yellow-400" : "text-red-400"}
            />
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[#666] mb-2">
        <span className="flex items-center gap-1">
          <Clock size={9} />
          {formatRelative(partner.last_contact_at)}
        </span>
        {partner.service_area_notes && (
          <span className="truncate max-w-[100px]" title={partner.service_area_notes}>
            {partner.service_area_notes}
          </span>
        )}
      </div>

      {partner.next_action && (
        <div className="text-xs text-[#888] mb-2 truncate">
          <span className="text-[#f97316]">→</span> {partner.next_action}
        </div>
      )}

      {/* Readiness indicators */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded ${
            pricing === "complete" ? "bg-green-900/40 text-green-400" :
            pricing === "partial" ? "bg-yellow-900/40 text-yellow-400" :
            "bg-zinc-800 text-zinc-500"
          }`}
          title={`Pricing: ${pricing}`}
        >
          <DollarSign size={9} className="inline" />
        </span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded ${
            contract === "signed" ? "bg-green-900/40 text-green-400" :
            contract === "pending" ? "bg-yellow-900/40 text-yellow-400" :
            "bg-zinc-800 text-zinc-500"
          }`}
          title={`Contract: ${contract}`}
        >
          <FileText size={9} className="inline" />
        </span>
      </div>

      {/* Warnings */}
      {(signal.isOverdue || signal.isDueSoon || signal.missingFields.length > 0 || signal.isStale) && (
        <div className="mb-2 flex flex-wrap gap-1">
          {signal.isOverdue && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-950/40 text-red-300 border border-red-700/30">
              Overdue
            </span>
          )}
          {!signal.isOverdue && signal.isDueSoon && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-950/40 text-yellow-200 border border-yellow-700/30">
              Due soon
            </span>
          )}
          {signal.isStale && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-950/40 text-orange-200 border border-orange-700/30">
              {signal.staleContactDays}d stale
            </span>
          )}
          {signal.missingFields.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-700">
              Missing {signal.missingFields.slice(0, 2).join(", ")}
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 pt-2 border-t border-[#2a2a2a]">
        {canMovePrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove("prev"); }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] bg-[#111] border border-[#2a2a2a] rounded text-[#666] hover:text-white hover:border-[#444] transition-colors"
            title="Move to previous stage"
          >
            <ChevronLeft size={10} />
            Prev
          </button>
        )}
        {canMoveNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onMove("next"); }}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] bg-[#f97316]/10 border border-[#f97316]/30 rounded text-[#f97316] hover:bg-[#f97316]/20 transition-colors"
            title="Move to next stage"
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
  partners: FulfillmentPartner[];
  onSelectPartner: (p: FulfillmentPartner) => void;
  onMovePartner: (p: FulfillmentPartner, direction: "next" | "prev") => void;
}) {
  return (
    <div className="min-w-0 flex flex-col">
      <div
        className="rounded-lg p-3 mb-3 border-2"
        style={{ borderColor: stage.color, backgroundColor: `${stage.color}15` }}
      >
        <h3 className="text-sm font-bold" style={{ color: stage.color }}>
          {stage.label}
        </h3>
        <p className="text-xs text-[#666] mt-0.5">{partners.length} {partners.length === 1 ? "partner" : "partners"}</p>
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
          <div className="text-center py-8 text-[#555] text-xs">No partners</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FulfillmentPipeline() {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<Record<string, FulfillmentPartner[]>>({});
  const [stats, setStats] = useState<Stats>({ total: 0, lead: 0, inProgress: 0, onboarding: 0, active: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedPartner, setSelectedPartner] = useState<FulfillmentPartner | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ partnerType: "fulfillment_partner" });
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/partners?${params}`);
      const data = await res.json();

      // Enrich partners with parsed notes
      const enriched: FulfillmentPartner[] = (data.partners || []).map((p: FulfillmentPartner) => ({
        ...p,
        ...parsePartnerNotes(p.notes),
      }));

      // Apply category filter
      let filtered = enriched;
      if (categoryFilter !== "all") {
        filtered = filtered.filter(p => p.fulfillment_category === categoryFilter);
      }

      // Group by fulfillment status
      const grouped: Record<string, FulfillmentPartner[]> = {};
      PIPELINE_STAGES.forEach(s => { grouped[s.key] = []; });

      filtered.forEach(p => {
        const status = p.fulfillment_status || "lead";
        if (grouped[status]) {
          grouped[status].push(p);
        } else {
          // Handle statuses not in pipeline (quality_watch, inactive, lost)
          grouped["lead"].push(p);
        }
      });

      setStages(grouped);

      // Compute stats from all enriched
      setStats({
        total: enriched.length,
        lead: enriched.filter(p => p.fulfillment_status === "lead" || !p.fulfillment_status).length,
        inProgress: enriched.filter(p => ["contacted", "qualified", "pricing_pending", "contract_pending"].includes(p.fulfillment_status || "")).length,
        onboarding: enriched.filter(p => ["onboarding", "test_ready"].includes(p.fulfillment_status || "")).length,
        active: enriched.filter(p => p.fulfillment_status === "active").length,
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMovePartner = async (partner: FulfillmentPartner, direction: "next" | "prev") => {
    const currentIndex = STAGE_ORDER.indexOf(partner.fulfillment_status || "lead");
    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= STAGE_ORDER.length) return;

    const newStatus = STAGE_ORDER[targetIndex];
    const signal = getSignals(partner);

    // Guard for missing discipline fields when advancing to later stages
    const guardedStatuses = ["qualified", "pricing_pending", "contract_pending", "onboarding", "test_ready", "active"];
    if (direction === "next" && guardedStatuses.includes(newStatus) && signal.missingFields.length > 0) {
      const proceed = window.confirm(
        `This partner is missing ${signal.missingFields.join(", ")}. Move to ${PIPELINE_STAGES.find(s => s.key === newStatus)?.label} anyway?`
      );
      if (!proceed) return;
    }

    try {
      // Update notes with new fulfillment_status
      const newNotes = buildStructuredNotes(partner, { fulfillment_status: newStatus });
      await fetch(`/api/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNotes }),
      });

      // Log the stage change
      await fetch(`/api/partners/${partner.id}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "other",
          summary: `Status changed to ${PIPELINE_STAGES.find(s => s.key === newStatus)?.label || newStatus}`,
          interaction_date: new Date().toISOString(),
          logged_by: "system",
        }),
      });

      fetchData();
    } catch (e) {
      console.error("Failed to move partner:", e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Fulfillment Pipeline</h2>
          <p className="text-xs text-[#555] mt-0.5">Recruiting through active: florists and cleaners readiness tracking</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs text-[#888] hover:text-white hover:border-[#444] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Leads" value={stats.lead} color="#52525b" />
        <StatCard label="In Progress" value={stats.inProgress} color="#f97316" />
        <StatCard label="Active" value={stats.active} color="#22c55e" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2">
          <Search size={14} className="text-[#555]" />
          <input
            type="text"
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white placeholder-[#555] w-40"
          />
        </div>

        <div className="flex gap-1">
          {[
            { key: "all", label: "All", icon: null },
            { key: "florist", label: "Florists", icon: <Flower2 size={12} className="text-pink-400" /> },
            { key: "cleaner", label: "Cleaners", icon: <SprayCan size={12} className="text-blue-400" /> },
          ].map(c => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(c.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all ${
                categoryFilter === c.key
                  ? "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30"
                  : "text-[#666] hover:text-white bg-[#111] border border-[#2a2a2a] hover:border-[#444]"
              }`}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Columns */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-[#555] text-sm">Loading pipeline...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 items-start">
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
      )}

      {/* Detail Panel */}
      {selectedPartner && (
        <FulfillmentDetailPanel
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
