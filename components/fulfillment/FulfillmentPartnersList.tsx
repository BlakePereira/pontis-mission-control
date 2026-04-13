"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Plus, Search, MapPin, Clock, User, AlertCircle,
  Flower2, SprayCan, FileText, DollarSign, CheckCircle2, AlertTriangle,
} from "lucide-react";
import FulfillmentDetailPanel from "./FulfillmentDetailPanel";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FulfillmentPartner {
  id: string;
  name: string;
  address?: string | null;
  city: string | null;
  state: string | null;
  zip?: string | null;
  territory: string | null;
  website: string | null;
  phone: string | null;
  email?: string | null;
  partner_type?: "monument_company" | "fulfillment_partner";
  pipeline_status: string;
  lead_source?: string | null;
  total_medallions_ordered?: number;
  mrr?: number | string;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  next_action_assignee?: string | null;
  health_score: number;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  is_tracked: boolean;
  // Fulfillment-specific fields (stored in notes or extended schema)
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
  active: number;
  onboarding: number;
  pricingPending: number;
  qualityWatch: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FULFILLMENT_STATUSES = [
  { key: "all", label: "All" },
  { key: "lead", label: "Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "pricing_pending", label: "Pricing Pending" },
  { key: "contract_pending", label: "Contract Pending" },
  { key: "onboarding", label: "Onboarding" },
  { key: "test_ready", label: "Test Ready" },
  { key: "active", label: "Active" },
  { key: "quality_watch", label: "Quality Watch" },
  { key: "inactive", label: "Inactive" },
  { key: "lost", label: "Lost" },
];

const CATEGORY_FILTERS = [
  { key: "all", label: "All" },
  { key: "florist", label: "Florists" },
  { key: "cleaner", label: "Cleaners" },
  { key: "both", label: "Both" },
];

const QUALITY_FILTERS = [
  { key: "all", label: "All" },
  { key: "normal", label: "Normal" },
  { key: "watch", label: "Watch" },
  { key: "restricted", label: "Restricted" },
];

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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function lastContactColor(iso: string | null): string {
  if (!iso) return "#ef4444";
  const days = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 7) return "#22c55e";
  if (days < 14) return "#eab308";
  return "#ef4444";
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    lead: "bg-zinc-800 text-zinc-400 border-zinc-700",
    contacted: "bg-blue-900/40 text-blue-400 border-blue-700/40",
    qualified: "bg-purple-900/40 text-purple-400 border-purple-700/40",
    pricing_pending: "bg-yellow-900/40 text-yellow-400 border-yellow-700/40",
    contract_pending: "bg-orange-900/40 text-orange-400 border-orange-700/40",
    onboarding: "bg-cyan-900/40 text-cyan-400 border-cyan-700/40",
    test_ready: "bg-emerald-900/40 text-emerald-400 border-emerald-700/40",
    active: "bg-green-900/40 text-green-400 border-green-700/40",
    quality_watch: "bg-red-900/40 text-red-400 border-red-700/40",
    inactive: "bg-zinc-800 text-zinc-500 border-zinc-700",
    lost: "bg-red-900/40 text-red-400 border-red-700/40",
  };
  return map[status] || "bg-zinc-800 text-zinc-400 border-zinc-700";
}

function qualityBadgeClass(quality: string | null | undefined): string {
  if (quality === "watch") return "bg-yellow-900/40 text-yellow-400 border-yellow-700/40";
  if (quality === "restricted") return "bg-red-900/40 text-red-400 border-red-700/40";
  return "";
}

function categoryIcon(cat: string | null | undefined) {
  if (cat === "florist") return <Flower2 size={12} className="text-pink-400" />;
  if (cat === "cleaner") return <SprayCan size={12} className="text-blue-400" />;
  if (cat === "both") return <><Flower2 size={10} className="text-pink-400" /><SprayCan size={10} className="text-blue-400" /></>;
  return null;
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

function parsePartnerNotes(notes: string | null): Partial<FulfillmentPartner> {
  if (!notes) return {};
  const result: Partial<FulfillmentPartner> = {};

  // Parse structured data from notes (format: [key: value])
  const categoryMatch = notes.match(/\[category:\s*(florist|cleaner|both)\]/i);
  if (categoryMatch) result.fulfillment_category = categoryMatch[1].toLowerCase() as "florist" | "cleaner" | "both";

  const statusMatch = notes.match(/\[fulfillment_status:\s*([^\]]+)\]/i);
  if (statusMatch) result.fulfillment_status = statusMatch[1].trim();

  const radiusMatch = notes.match(/\[radius:\s*(\d+)\s*miles?\]/i);
  if (radiusMatch) result.service_radius_miles = parseInt(radiusMatch[1]);

  const qualityMatch = notes.match(/\[quality:\s*(normal|watch|restricted)\]/i);
  if (qualityMatch) result.quality_status = qualityMatch[1].toLowerCase() as "normal" | "watch" | "restricted";

  const contractMatch = notes.match(/\[contract:\s*([^\]]+)\]/i);
  if (contractMatch) result.contract_status = contractMatch[1].trim();

  const pricingMatch = notes.match(/\[pricing:\s*([^\]]+)\]/i);
  if (pricingMatch) result.pricing_notes = pricingMatch[1].trim();

  const channelMatch = notes.match(/\[channel:\s*([^\]]+)\]/i);
  if (channelMatch) result.preferred_order_channel = channelMatch[1].trim();

  const areaMatch = notes.match(/\[service_area:\s*([^\]]+)\]/i);
  if (areaMatch) result.service_area_notes = areaMatch[1].trim();

  return result;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: {
  label: string; value: number; color?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] mb-1 text-[#555]">
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color: color || "white" }}>{value}</p>
    </div>
  );
}

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-lg transition-all whitespace-nowrap ${
        active
          ? "bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30"
          : "text-[#666] hover:text-white bg-[#111] border border-[#2a2a2a] hover:border-[#444]"
      }`}
    >
      {label}
    </button>
  );
}

// ─── AddPartnerModal ──────────────────────────────────────────────────────────

function AddFulfillmentPartnerModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", city: "", state: "", phone: "", email: "",
    fulfillment_category: "florist",
    fulfillment_status: "lead",
    service_area_notes: "",
    pricing_notes: "",
    contract_status: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);

    // Build structured notes
    const structuredNotes = [
      `[category: ${form.fulfillment_category}]`,
      `[fulfillment_status: ${form.fulfillment_status}]`,
      form.service_area_notes ? `[service_area: ${form.service_area_notes}]` : "",
      form.pricing_notes ? `[pricing: ${form.pricing_notes}]` : "",
      form.contract_status ? `[contract: ${form.contract_status}]` : "",
      form.notes,
    ].filter(Boolean).join("\n");

    try {
      await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          partner_type: "fulfillment_partner",
          pipeline_status: "prospect",
          notes: structuredNotes,
        }),
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-4">Add Fulfillment Partner</h2>

        <div className="space-y-3">
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Partner name *"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="City"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
            />
            <input
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="State"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Phone"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
            />
            <input
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="Email"
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.fulfillment_category}
              onChange={(e) => set("fulfillment_category", e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
            >
              <option value="florist">Florist</option>
              <option value="cleaner">Cleaner</option>
              <option value="both">Both</option>
            </select>
            <select
              value={form.fulfillment_status}
              onChange={(e) => set("fulfillment_status", e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
            >
              {FULFILLMENT_STATUSES.filter(s => s.key !== "all").map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <input
            value={form.service_area_notes}
            onChange={(e) => set("service_area_notes", e.target.value)}
            placeholder="Service area / territory notes"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
          />

          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Additional notes..."
            rows={2}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316] resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#888] hover:text-white">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="px-4 py-2 text-sm bg-[#f97316] text-white rounded-lg hover:bg-[#ea580c] disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add Partner"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FulfillmentPartnersList() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<FulfillmentPartner[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, onboarding: 0, pricingPending: 0, qualityWatch: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [selectedPartner, setSelectedPartner] = useState<FulfillmentPartner | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableStates, setAvailableStates] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch only fulfillment partners
      const params = new URLSearchParams({ partnerType: "fulfillment_partner" });
      if (searchTerm) params.set("search", searchTerm);
      if (stateFilter !== "all") params.set("state", stateFilter);

      const res = await fetch(`/api/partners?${params}`);
      const data = await res.json();

      // Enrich partners with parsed notes
      const enriched: FulfillmentPartner[] = (data.partners || []).map((p: FulfillmentPartner) => ({
        ...p,
        ...parsePartnerNotes(p.notes),
      }));

      // Apply client-side filters for fulfillment-specific fields
      let filtered = enriched;

      if (statusFilter !== "all") {
        filtered = filtered.filter(p => p.fulfillment_status === statusFilter);
      }
      if (categoryFilter !== "all") {
        filtered = filtered.filter(p => p.fulfillment_category === categoryFilter);
      }
      if (qualityFilter !== "all") {
        filtered = filtered.filter(p => p.quality_status === qualityFilter);
      }

      setPartners(filtered);

      // Compute stats from all enriched partners
      setStats({
        total: enriched.length,
        active: enriched.filter(p => p.fulfillment_status === "active").length,
        onboarding: enriched.filter(p => ["onboarding", "test_ready"].includes(p.fulfillment_status || "")).length,
        pricingPending: enriched.filter(p => p.fulfillment_status === "pricing_pending").length,
        qualityWatch: enriched.filter(p => p.quality_status === "watch" || p.quality_status === "restricted").length,
      });

      // Extract unique states
      const states = Array.from(new Set(enriched.map(p => p.state).filter(Boolean))) as string[];
      setAvailableStates(states.sort());
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, categoryFilter, qualityFilter, stateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total Partners" value={stats.total} icon={<User size={10} />} />
        <StatCard label="Active" value={stats.active} color="#22c55e" icon={<CheckCircle2 size={10} />} />
        <StatCard label="Onboarding" value={stats.onboarding} color="#06b6d4" icon={<Clock size={10} />} />
        <StatCard label="Pricing Pending" value={stats.pricingPending} color="#eab308" icon={<DollarSign size={10} />} />
        <StatCard label="Quality Watch" value={stats.qualityWatch} color="#ef4444" icon={<AlertTriangle size={10} />} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2">
          <Search size={14} className="text-[#555]" />
          <input
            type="text"
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-white placeholder-[#555] w-48"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          {FULFILLMENT_STATUSES.slice(0, 6).map(s => (
            <FilterPill key={s.key} label={s.label} active={statusFilter === s.key} onClick={() => setStatusFilter(s.key)} />
          ))}
        </div>

        <div className="flex gap-1">
          {CATEGORY_FILTERS.map(c => (
            <FilterPill key={c.key} label={c.label} active={categoryFilter === c.key} onClick={() => setCategoryFilter(c.key)} />
          ))}
        </div>

        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-lg text-xs text-white outline-none"
        >
          <option value="all">All States</option>
          {availableStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex-1" />

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#f97316] text-white rounded-lg hover:bg-[#ea580c]"
        >
          <Plus size={14} /> Add Partner
        </button>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#111] border border-[#2a2a2a] rounded-lg text-[#888] hover:text-white hover:border-[#444] disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Partners Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-[#555] text-sm">Loading fulfillment partners...</p>
        </div>
      ) : partners.length === 0 ? (
        <div className="text-center py-12 text-[#555]">
          <p className="text-sm">No fulfillment partners found.</p>
          <p className="text-xs mt-1">Add your first florist or cleaner to get started.</p>
        </div>
      ) : (
        <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#111] border-b border-[#2a2a2a]">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">Partner</th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">Category</th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">Status</th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">Territory</th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">Owner</th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">Next Action</th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">Due</th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">Last Contact</th>
                <th className="text-left px-3 py-3 text-[10px] uppercase tracking-wider text-[#555] font-medium">Readiness</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => {
                const pricing = pricingIndicator(p.pricing_notes);
                const contract = contractIndicator(p.contract_status);
                const isStale = p.last_contact_at && (Date.now() - new Date(p.last_contact_at).getTime()) / (1000 * 60 * 60 * 24) > 14;

                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPartner(p)}
                    className="border-b border-[#1a1a1a] hover:bg-[#111] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-white">{p.name}</p>
                          {(p.city || p.state) && (
                            <p className="text-[10px] text-[#555] flex items-center gap-1 mt-0.5">
                              <MapPin size={9} />
                              {[p.city, p.state].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        {categoryIcon(p.fulfillment_category)}
                        <span className="text-xs text-[#888] capitalize">{p.fulfillment_category || "—"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] px-2 py-1 rounded-full border ${statusBadgeClass(p.fulfillment_status || "lead")}`}>
                        {FULFILLMENT_STATUSES.find(s => s.key === p.fulfillment_status)?.label || "Lead"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-[#888]">
                        {p.service_area_notes || p.territory || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-[#888]">{p.next_action_assignee || "—"}</span>
                    </td>
                    <td className="px-3 py-3 max-w-[160px]">
                      <span className="text-xs text-[#888] truncate block">{p.next_action || "—"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-[#888]">{formatDate(p.next_action_due)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs flex items-center gap-1" style={{ color: lastContactColor(p.last_contact_at) }}>
                        <Clock size={10} />
                        {formatRelative(p.last_contact_at)}
                      </span>
                      {isStale && (
                        <span className="text-[9px] text-orange-400 block mt-0.5">Stale</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded ${
                            pricing === "complete" ? "bg-green-900/40 text-green-400" :
                            pricing === "partial" ? "bg-yellow-900/40 text-yellow-400" :
                            "bg-zinc-800 text-zinc-500"
                          }`}
                          title="Pricing"
                        >
                          $
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded ${
                            contract === "signed" ? "bg-green-900/40 text-green-400" :
                            contract === "pending" ? "bg-yellow-900/40 text-yellow-400" :
                            "bg-zinc-800 text-zinc-500"
                          }`}
                          title="Contract"
                        >
                          <FileText size={9} />
                        </span>
                        {p.quality_status && p.quality_status !== "normal" && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${qualityBadgeClass(p.quality_status)}`}>
                            <AlertTriangle size={9} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {/* Add Partner Modal */}
      {showAddModal && (
        <AddFulfillmentPartnerModal
          onClose={() => setShowAddModal(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
