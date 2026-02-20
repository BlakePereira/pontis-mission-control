"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, X, Plus, Check, ChevronRight, Phone, Mail, Globe,
  MapPin, Calendar, User, AlertCircle, Clock, Building2, TrendingUp, Trash2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Partner {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  territory: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  partner_type: "monument_company" | "fulfillment_partner";
  pipeline_status: string;
  lead_source: string | null;
  total_medallions_ordered: number;
  mrr: number | string;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  next_action_assignee: string | null;
  health_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  crm_contacts?: Contact[];
}

interface Contact {
  id: string;
  partner_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  preferred_contact_method: string;
  notes: string | null;
  created_at: string;
}

interface Interaction {
  id: string;
  partner_id: string;
  contact_id: string | null;
  type: string;
  direction: string | null;
  summary: string;
  outcome: string | null;
  logged_by: string | null;
  raw_note: string | null;
  interaction_date: string;
  created_at: string;
}

interface ActionItem {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  assignee: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface Stats {
  totalPartners: number;
  activePartners: number;
  openActionItems: number;
  avgHealthScore: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PIPELINE_STATUSES = [
  { key: "all", label: "All" },
  { key: "prospect", label: "Prospect" },
  { key: "warm", label: "Warm" },
  { key: "demo_scheduled", label: "Demo Scheduled" },
  { key: "demo_done", label: "Demo Done" },
  { key: "negotiating", label: "Negotiating" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "lost", label: "Lost" },
];

const PARTNER_TYPES = [
  { key: "all", label: "All Partners" },
  { key: "monument_company", label: "Monument Companies" },
  { key: "fulfillment_partner", label: "Fulfillment Partners" },
];

const HEALTH_FILTERS = [
  { key: "all", label: "All" },
  { key: "healthy", label: "Healthy" },
  { key: "warning", label: "Warning" },
  { key: "critical", label: "Critical" },
];

const INTERACTION_TYPES = ["email","call","text","meeting","demo","site_visit","note"];
const INTERACTION_ICONS: Record<string, string> = {
  email: "📧", call: "📞", text: "💬", meeting: "🤝", demo: "🎥", site_visit: "🏢", note: "📝",
};

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

function lastContactColor(iso: string | null): string {
  if (!iso) return "#ef4444";
  const days = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 7) return "#22c55e";
  if (days < 14) return "#eab308";
  return "#ef4444";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function formatMRR(mrr: number | string): string {
  const n = typeof mrr === "string" ? parseFloat(mrr) : mrr;
  if (!n || isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    prospect:       "bg-zinc-800 text-zinc-400 border-zinc-700",
    warm:           "bg-yellow-900/40 text-yellow-400 border-yellow-700/40",
    demo_scheduled: "bg-blue-900/40 text-blue-400 border-blue-700/40",
    demo_done:      "bg-purple-900/40 text-purple-400 border-purple-700/40",
    negotiating:    "bg-orange-900/40 text-orange-400 border-orange-700/40",
    active:         "bg-green-900/40 text-green-400 border-green-700/40",
    inactive:       "bg-zinc-800 text-zinc-500 border-zinc-700",
    lost:           "bg-red-900/40 text-red-400 border-red-700/40",
  };
  return map[status] || "bg-zinc-800 text-zinc-400 border-zinc-700";
}

function priorityBadgeClass(priority: string): string {
  const map: Record<string, string> = {
    low:    "bg-zinc-800 text-zinc-500 border-zinc-700",
    medium: "bg-blue-900/40 text-blue-400 border-blue-700/40",
    high:   "bg-orange-900/40 text-orange-400 border-orange-700/40",
    urgent: "bg-red-900/40 text-red-400 border-red-700/40",
  };
  return map[priority] || "bg-zinc-800 text-zinc-400";
}

function outcomeBadgeClass(outcome: string | null): string {
  const map: Record<string, string> = {
    positive: "bg-green-900/40 text-green-400 border-green-700/40",
    neutral:  "bg-zinc-800 text-zinc-400 border-zinc-700",
    negative: "bg-red-900/40 text-red-400 border-red-700/40",
  };
  return outcome ? (map[outcome] || "bg-zinc-800 text-zinc-400") : "";
}

function statusLabel(s: string): string {
  return PIPELINE_STATUSES.find((p) => p.key === s)?.label || s;
}

function partnerTypeLabel(type: string): string {
  if (type === "fulfillment_partner") return "Fulfillment";
  return "Monument";
}

function partnerTypeBadgeClass(type: string): string {
  if (type === "fulfillment_partner") return "bg-orange-900/30 text-orange-300 border-orange-700/40";
  return "bg-emerald-900/30 text-emerald-300 border-emerald-700/40";
}

function primaryContact(partner: Partner): string {
  const contacts = partner.crm_contacts;
  if (!contacts || contacts.length === 0) return "—";
  return contacts[0].name + (contacts[0].role ? ` · ${contacts[0].role}` : "");
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

// ─── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-lg transition-all whitespace-nowrap ${
        active
          ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30"
          : "text-[#666] hover:text-white bg-[#111] border border-[#2a2a2a] hover:border-[#444]"
      }`}
    >
      {label}
    </button>
  );
}

// ─── AddPartnerModal ──────────────────────────────────────────────────────────

function AddPartnerModal({ onClose, onSaved }: { onClose: () => void; onSaved: (p: Partner) => void }) {
  const [form, setForm] = useState({
    name: "", address: "", city: "", state: "", zip: "", territory: "",
    phone: "", email: "", website: "", partner_type: "monument_company", pipeline_status: "prospect",
    lead_source: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Company name is required"); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lead_source: form.lead_source || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to save"); return; }
      onSaved(data.partner);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-bold text-white">Add Partner</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-900/20 border border-red-700/30 rounded-lg p-3">{error}</div>}

          <FormInput label="Company Name *" value={form.name} onChange={(v) => set("name", v)} placeholder="e.g. Smith Monument Co." />

          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Phone" value={form.phone} onChange={(v) => set("phone", v)} placeholder="(555) 000-0000" />
            <FormInput label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" placeholder="owner@company.com" />
          </div>

          <FormInput label="Website" value={form.website} onChange={(v) => set("website", v)} placeholder="https://..." />
          <FormInput label="Address" value={form.address} onChange={(v) => set("address", v)} placeholder="123 Main St" />

          <div className="grid grid-cols-3 gap-3">
            <FormInput label="City" value={form.city} onChange={(v) => set("city", v)} />
            <FormInput label="State" value={form.state} onChange={(v) => set("state", v)} />
            <FormInput label="ZIP" value={form.zip} onChange={(v) => set("zip", v)} />
          </div>

          <FormInput label="Territory" value={form.territory} onChange={(v) => set("territory", v)} placeholder="e.g. TX, OK, NM" />

          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Partner Type" value={form.partner_type} onChange={(v) => set("partner_type", v)}
              options={[
                { value: "monument_company", label: "Monument Company" },
                { value: "fulfillment_partner", label: "Fulfillment Partner" },
              ]} />
            <FormSelect label="Pipeline Status" value={form.pipeline_status} onChange={(v) => set("pipeline_status", v)}
              options={PIPELINE_STATUSES.filter((s) => s.key !== "all").map((s) => ({ value: s.key, label: s.label }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Lead Source" value={form.lead_source} onChange={(v) => set("lead_source", v)}
              options={[
                { value: "", label: "— Select —" },
                { value: "cold_outreach", label: "Cold Outreach" },
                { value: "referral", label: "Referral" },
                { value: "inbound", label: "Inbound" },
                { value: "event", label: "Event" },
                { value: "research", label: "Research" },
              ]} />
          </div>

          <FormTextarea label="Notes" value={form.notes} onChange={(v) => set("notes", v)} rows={3} />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-[#888] hover:text-white border border-[#2a2a2a] rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-[#10b981] text-black font-semibold rounded-lg hover:bg-[#0ea572] transition-colors disabled:opacity-50">
              {saving ? "Saving…" : "Add Partner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Form Helpers ─────────────────────────────────────────────────────────────

function FormInput({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-[#555] uppercase tracking-wider block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#10b981]/50"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-[11px] text-[#555] uppercase tracking-wider block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#10b981]/50"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function FormTextarea({ label, value, onChange, rows = 3, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] text-[#555] uppercase tracking-wider block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#10b981]/50 resize-none"
      />
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ partner: initialPartner, onClose, onUpdated, onDeleted }: {
  partner: Partner;
  onClose: () => void;
  onUpdated: (p: Partner) => void;
  onDeleted: (partnerId: string) => void;
}) {
  const [partner, setPartner] = useState(initialPartner);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [tab, setTab] = useState<"overview" | "contacts" | "timeline" | "actions">("overview");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Partner>>({});
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactForm, setEditContactForm] = useState<Partial<Contact>>({});
  const [savingContact, setSavingContact] = useState(false);
  const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
  const [editInteractionForm, setEditInteractionForm] = useState<Partial<Interaction>>({});
  const [savingInteraction, setSavingInteraction] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/partners/${partner.id}`);
      if (res.ok) {
        const data = await res.json();
        setPartner(data.partner);
        setContacts(data.contacts || []);
        setInteractions(data.interactions || []);
        setActions(data.actions || []);
      }
    } finally {
      setLoading(false);
    }
  }, [partner.id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Keep in sync when parent updates
  useEffect(() => { setPartner(initialPartner); }, [initialPartner]);

  const startEdit = () => {
    setEditForm({
      name: partner.name,
      address: partner.address || "",
      city: partner.city || "",
      state: partner.state || "",
      zip: partner.zip || "",
      territory: partner.territory || "",
      website: partner.website || "",
      phone: partner.phone || "",
      email: partner.email || "",
      partner_type: partner.partner_type,
      pipeline_status: partner.pipeline_status,
      lead_source: partner.lead_source || "",
      total_medallions_ordered: partner.total_medallions_ordered,
      mrr: partner.mrr,
      last_contact_at: toDateInputValue(partner.last_contact_at),
      next_action: partner.next_action || "",
      next_action_due: toDateInputValue(partner.next_action_due),
      next_action_assignee: partner.next_action_assignee || "",
      notes: partner.notes || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const payload = {
        ...editForm,
        address: editForm.address || null,
        city: editForm.city || null,
        state: editForm.state || null,
        zip: editForm.zip || null,
        territory: editForm.territory || null,
        website: editForm.website || null,
        phone: editForm.phone || null,
        email: editForm.email || null,
        lead_source: editForm.lead_source || null,
        next_action: editForm.next_action || null,
        next_action_assignee: editForm.next_action_assignee || null,
        notes: editForm.notes || null,
        last_contact_at: editForm.last_contact_at ? new Date(String(editForm.last_contact_at)).toISOString() : null,
        next_action_due: editForm.next_action_due ? new Date(String(editForm.next_action_due)).toISOString() : null,
      };
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.partner || { ...partner, ...payload };
        setPartner(updated);
        onUpdated(updated);
        setEditing(false);
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/partners/${partner.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleted(partner.id);
        onClose();
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const completeAction = async (actionId: string) => {
    await fetch(`/api/partners/${partner.id}/actions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: actionId, status: "completed" }),
    });
    setActions((prev) => prev.map((a) => a.id === actionId ? { ...a, status: "completed", completed_at: new Date().toISOString() } : a));
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "contacts", label: `Contacts (${contacts.length})` },
    { key: "timeline", label: `Timeline (${interactions.length})` },
    { key: "actions", label: `Actions (${actions.filter((a) => a.status !== "completed").length})` },
  ] as const;

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-[#0f0f0f] border-l border-[#2a2a2a] z-50 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-[#2a2a2a] flex-shrink-0">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: healthColor(partner.health_score) }}
            />
            <h2 className="text-lg font-bold text-white truncate">{partner.name}</h2>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${partnerTypeBadgeClass(partner.partner_type)}`}>
              {partnerTypeLabel(partner.partner_type)}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadgeClass(partner.pipeline_status)}`}>
              {statusLabel(partner.pipeline_status)}
            </span>
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
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && (
            <>
              <button onClick={startEdit} className="px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[#888] hover:text-white hover:border-[#444] transition-colors">
                Edit
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="px-3 py-1.5 text-xs bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 hover:bg-red-900/30 hover:border-red-700/50 transition-colors flex items-center gap-1.5"
                title="Delete Partner"
              >
                <Trash2 size={12} />
                Delete
              </button>
            </>
          )}
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors"><X size={20} /></button>
        </div>
      </div>

      {/* Edit Form Overlay */}
      {editing && (
        <div className="p-5 border-b border-[#2a2a2a] bg-[#111] overflow-y-auto max-h-[50vh] flex-shrink-0">
          <div className="space-y-3">
            <FormInput label="Name" value={String(editForm.name || "")} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} />
            <FormInput label="Address" value={String(editForm.address || "")} onChange={(v) => setEditForm((f) => ({ ...f, address: v }))} />
            <div className="grid grid-cols-3 gap-3">
              <FormInput label="City" value={String(editForm.city || "")} onChange={(v) => setEditForm((f) => ({ ...f, city: v }))} />
              <FormInput label="State" value={String(editForm.state || "")} onChange={(v) => setEditForm((f) => ({ ...f, state: v }))} />
              <FormInput label="ZIP" value={String(editForm.zip || "")} onChange={(v) => setEditForm((f) => ({ ...f, zip: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Phone" value={String(editForm.phone || "")} onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))} />
              <FormInput label="Email" value={String(editForm.email || "")} onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} />
            </div>
            <FormInput label="Website" value={String(editForm.website || "")} onChange={(v) => setEditForm((f) => ({ ...f, website: v }))} />
            <FormInput label="Territory" value={String(editForm.territory || "")} onChange={(v) => setEditForm((f) => ({ ...f, territory: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Partner Type" value={String(editForm.partner_type || "monument_company")}
                onChange={(v) => setEditForm((f) => ({ ...f, partner_type: v as Partner["partner_type"] }))}
                options={[
                  { value: "monument_company", label: "Monument Company" },
                  { value: "fulfillment_partner", label: "Fulfillment Partner" },
                ]} />
              <FormSelect label="Status" value={String(editForm.pipeline_status || "prospect")}
                onChange={(v) => setEditForm((f) => ({ ...f, pipeline_status: v }))}
                options={PIPELINE_STATUSES.filter((s) => s.key !== "all").map((s) => ({ value: s.key, label: s.label }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Lead Source" value={String(editForm.lead_source || "")}
                onChange={(v) => setEditForm((f) => ({ ...f, lead_source: v }))}
                options={[
                  { value: "", label: "— None —" },
                  { value: "cold_outreach", label: "Cold Outreach" },
                  { value: "referral", label: "Referral" },
                  { value: "inbound", label: "Inbound" },
                  { value: "event", label: "Event" },
                  { value: "research", label: "Research" },
                ]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Last Contact"
                value={String(editForm.last_contact_at || "")}
                onChange={(v) => setEditForm((f) => ({ ...f, last_contact_at: v }))}
                type="date"
              />
              <FormInput
                label="Next Action Due"
                value={String(editForm.next_action_due || "")}
                onChange={(v) => setEditForm((f) => ({ ...f, next_action_due: v }))}
                type="date"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="Next Action" value={String(editForm.next_action || "")} onChange={(v) => setEditForm((f) => ({ ...f, next_action: v }))} />
              <FormSelect label="Assignee" value={String(editForm.next_action_assignee || "")}
                onChange={(v) => setEditForm((f) => ({ ...f, next_action_assignee: v }))}
                options={[{ value: "", label: "— None —" }, { value: "blake", label: "Blake" }, { value: "joe", label: "Joe" }, { value: "clara", label: "Clara" }]} />
            </div>
            <FormTextarea label="Notes" value={String(editForm.notes || "")} onChange={(v) => setEditForm((f) => ({ ...f, notes: v }))} />
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={savingEdit}
                className="px-4 py-1.5 text-sm bg-[#10b981] text-black font-semibold rounded-lg hover:bg-[#0ea572] transition-colors disabled:opacity-50">
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-1.5 text-sm text-[#888] hover:text-white border border-[#2a2a2a] rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#2a2a2a] flex-shrink-0 px-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-3 text-xs font-medium transition-colors whitespace-nowrap ${
              tab === key
                ? "text-[#10b981] border-b-2 border-[#10b981]"
                : "text-[#555] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[#555] text-sm">Loading…</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === "overview" && (
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
                    {partner.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={13} className="text-[#555]" />
                        <a href={`mailto:${partner.email}`} className="text-[#10b981] hover:underline">{partner.email}</a>
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
                    {(partner.address || partner.city) && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={13} className="text-[#555]" />
                        <span className="text-[#aaa]">{[partner.address, partner.city, partner.state, partner.zip].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1a1a1a] rounded-xl p-4">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Partner Type</p>
                    <span className={`inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border ${partnerTypeBadgeClass(partner.partner_type)}`}>
                      {partnerTypeLabel(partner.partner_type)}
                    </span>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-xl p-4">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Territory</p>
                    <p className="text-sm text-white">{partner.territory || "—"}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-xl p-4">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Lead Source</p>
                    <p className="text-sm text-white capitalize">{partner.lead_source?.replace("_", " ") || "—"}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-xl p-4">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Medallions Ordered</p>
                    <p className="text-2xl font-bold text-white">{partner.total_medallions_ordered}</p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-xl p-4">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">MRR</p>
                    <p className="text-2xl font-bold text-[#10b981]">{formatMRR(partner.mrr)}</p>
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
                    <div className="flex items-center gap-3 mt-2">
                      {partner.next_action_due && (
                        <span className="text-xs text-[#555] flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(partner.next_action_due)}
                        </span>
                      )}
                      {partner.next_action_assignee && (
                        <span className="text-xs text-[#555] flex items-center gap-1">
                          <User size={10} /> {partner.next_action_assignee}
                        </span>
                      )}
                    </div>
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

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1a1a1a] rounded-xl p-3">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Last Contact</p>
                    <p className="text-sm" style={{ color: lastContactColor(partner.last_contact_at) }}>
                      {formatRelative(partner.last_contact_at)}
                    </p>
                  </div>
                  <div className="bg-[#1a1a1a] rounded-xl p-3">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Added</p>
                    <p className="text-sm text-[#888]">{formatDate(partner.created_at)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* CONTACTS */}
            {tab === "contacts" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#555] uppercase tracking-wider">Contacts</p>
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 rounded-lg hover:bg-[#10b981]/20 transition-colors"
                  >
                    <Plus size={12} /> Add Contact
                  </button>
                </div>

                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-[#555] text-sm">No contacts yet</div>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((c) => (
                      <div key={c.id} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a]">
                        {editingContactId === c.id ? (
                          /* ── Inline edit form ── */
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-[#555] uppercase tracking-wider">Name</label>
                                <input
                                  className="w-full mt-1 bg-[#111] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981]"
                                  value={editContactForm.name ?? ""}
                                  onChange={(e) => setEditContactForm((f) => ({ ...f, name: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[#555] uppercase tracking-wider">Role</label>
                                <input
                                  className="w-full mt-1 bg-[#111] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981]"
                                  value={editContactForm.role ?? ""}
                                  onChange={(e) => setEditContactForm((f) => ({ ...f, role: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[#555] uppercase tracking-wider">Phone</label>
                                <input
                                  className="w-full mt-1 bg-[#111] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981]"
                                  value={editContactForm.phone ?? ""}
                                  onChange={(e) => setEditContactForm((f) => ({ ...f, phone: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-[#555] uppercase tracking-wider">Email</label>
                                <input
                                  className="w-full mt-1 bg-[#111] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981]"
                                  value={editContactForm.email ?? ""}
                                  onChange={(e) => setEditContactForm((f) => ({ ...f, email: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-[#555] uppercase tracking-wider">Notes</label>
                              <textarea
                                rows={2}
                                className="w-full mt-1 bg-[#111] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981] resize-none"
                                value={editContactForm.notes ?? ""}
                                onChange={(e) => setEditContactForm((f) => ({ ...f, notes: e.target.value }))}
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => { setEditingContactId(null); setEditContactForm({}); }}
                                className="px-3 py-1.5 text-xs text-[#666] border border-[#333] rounded-lg hover:border-[#555] transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                disabled={savingContact}
                                onClick={async () => {
                                  setSavingContact(true);
                                  try {
                                    const res = await fetch(`/api/partners/${partner.id}/contacts`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ contactId: c.id, ...editContactForm }),
                                    });
                                    if (res.ok) {
                                      const data = await res.json();
                                      const updated = data.contact;
                                      setContacts((prev) => prev.map((x) => x.id === c.id ? { ...x, ...updated } : x));
                                      setEditingContactId(null);
                                      setEditContactForm({});
                                    }
                                  } finally {
                                    setSavingContact(false);
                                  }
                                }}
                                className="px-3 py-1.5 text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 rounded-lg hover:bg-[#10b981]/20 transition-colors disabled:opacity-50"
                              >
                                {savingContact ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── Read view ── */
                          <>
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm font-semibold text-white">{c.name}</p>
                                {c.role && <p className="text-xs text-[#555]">{c.role}</p>}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-[#555] bg-[#111] px-2 py-0.5 rounded-full border border-[#2a2a2a]">
                                  {c.preferred_contact_method}
                                </span>
                                <button
                                  onClick={() => { setEditingContactId(c.id); setEditContactForm({ name: c.name, role: c.role ?? "", phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "" }); }}
                                  className="p-1 text-[#555] hover:text-[#10b981] transition-colors rounded"
                                  title="Edit contact"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Delete ${c.name}?`)) return;
                                    const res = await fetch(`/api/partners/${partner.id}/contacts?contactId=${c.id}`, { method: "DELETE" });
                                    if (res.ok) setContacts((prev) => prev.filter((x) => x.id !== c.id));
                                  }}
                                  className="p-1 text-[#555] hover:text-red-400 transition-colors rounded"
                                  title="Delete contact"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                </button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {c.phone && (
                                <div className="flex items-center gap-2 text-xs text-[#888]">
                                  <Phone size={11} className="text-[#555]" /> {c.phone}
                                </div>
                              )}
                              {c.email && (
                                <div className="flex items-center gap-2 text-xs text-[#888]">
                                  <Mail size={11} className="text-[#555]" />
                                  <a href={`mailto:${c.email}`} className="text-[#10b981] hover:underline">{c.email}</a>
                                </div>
                              )}
                            </div>
                            {c.notes && <p className="text-xs text-[#666] mt-2 italic">{c.notes}</p>}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {showAddContact && (
                  <AddContactForm
                    partnerId={partner.id}
                    onSaved={(c) => { setContacts((prev) => [...prev, c]); setShowAddContact(false); }}
                    onCancel={() => setShowAddContact(false)}
                  />
                )}
              </div>
            )}

            {/* TIMELINE */}
            {tab === "timeline" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#555] uppercase tracking-wider">Interaction Timeline</p>
                  <button
                    onClick={() => setShowAddInteraction(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 rounded-lg hover:bg-[#10b981]/20 transition-colors"
                  >
                    <Plus size={12} /> Log Interaction
                  </button>
                </div>

                {showAddInteraction && (
                  <AddInteractionForm
                    partnerId={partner.id}
                    contacts={contacts}
                    onSaved={(i) => { setInteractions((prev) => [i, ...prev]); setShowAddInteraction(false); }}
                    onCancel={() => setShowAddInteraction(false)}
                  />
                )}

                {interactions.length === 0 ? (
                  <div className="text-center py-8 text-[#555] text-sm">No interactions yet</div>
                ) : (
                  <div className="space-y-3">
                    {interactions.map((i) => (
                      <div key={i.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg flex items-center justify-center text-base">
                          {INTERACTION_ICONS[editingInteractionId === i.id ? (editInteractionForm.type ?? i.type) : i.type] || "📝"}
                        </div>
                        <div className="flex-1 bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                          {editingInteractionId === i.id ? (
                            /* ── Inline edit form ── */
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-[#555] uppercase tracking-wider">Type</label>
                                  <select
                                    className="w-full mt-1 bg-[#111] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981]"
                                    value={editInteractionForm.type ?? i.type}
                                    onChange={(e) => setEditInteractionForm((f) => ({ ...f, type: e.target.value as Interaction["type"] }))}
                                  >
                                    {["email","call","text","meeting","demo","site_visit","note"].map((t) => (
                                      <option key={t} value={t}>{t.replace("_"," ")}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-[#555] uppercase tracking-wider">Outcome</label>
                                  <select
                                    className="w-full mt-1 bg-[#111] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981]"
                                    value={editInteractionForm.outcome ?? i.outcome ?? ""}
                                    onChange={(e) => setEditInteractionForm((f) => ({ ...f, outcome: e.target.value as Interaction["outcome"] || null }))}
                                  >
                                    <option value="">— none —</option>
                                    <option value="positive">positive</option>
                                    <option value="neutral">neutral</option>
                                    <option value="negative">negative</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-[#555] uppercase tracking-wider">Summary</label>
                                <textarea
                                  rows={3}
                                  className="w-full mt-1 bg-[#111] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#10b981] resize-none"
                                  value={editInteractionForm.summary ?? i.summary}
                                  onChange={(e) => setEditInteractionForm((f) => ({ ...f, summary: e.target.value }))}
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={async () => {
                                    if (!confirm("Delete this interaction?")) return;
                                    const res = await fetch(`/api/partners/${partner.id}/interactions?interactionId=${i.id}`, { method: "DELETE" });
                                    if (res.ok) {
                                      setInteractions((prev) => prev.filter((x) => x.id !== i.id));
                                      setEditingInteractionId(null);
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors mr-auto"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => { setEditingInteractionId(null); setEditInteractionForm({}); }}
                                  className="px-3 py-1.5 text-xs text-[#666] border border-[#333] rounded-lg hover:border-[#555] transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  disabled={savingInteraction}
                                  onClick={async () => {
                                    setSavingInteraction(true);
                                    try {
                                      const res = await fetch(`/api/partners/${partner.id}/interactions`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ interactionId: i.id, ...editInteractionForm }),
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        const updated = data.interaction;
                                        setInteractions((prev) => prev.map((x) => x.id === i.id ? { ...x, ...updated } : x));
                                        setEditingInteractionId(null);
                                        setEditInteractionForm({});
                                      }
                                    } finally {
                                      setSavingInteraction(false);
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 rounded-lg hover:bg-[#10b981]/20 transition-colors disabled:opacity-50"
                                >
                                  {savingInteraction ? "Saving…" : "Save"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ── Read view ── */
                            <>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-white capitalize">{i.type.replace("_", " ")}</span>
                                  {i.direction && <span className="text-[10px] text-[#555]">{i.direction}</span>}
                                  {i.outcome && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${outcomeBadgeClass(i.outcome)}`}>
                                      {i.outcome}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-[#555]">{formatRelative(i.interaction_date)}</span>
                                  <button
                                    onClick={() => { setEditingInteractionId(i.id); setEditInteractionForm({ type: i.type, outcome: i.outcome, summary: i.summary }); }}
                                    className="p-1 text-[#555] hover:text-[#10b981] transition-colors rounded"
                                    title="Edit interaction"
                                  >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                </div>
                              </div>
                              <p className="text-xs text-[#aaa] leading-relaxed">{i.summary}</p>
                              {i.logged_by && <p className="text-[10px] text-[#555] mt-1">by {i.logged_by}</p>}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ACTIONS */}
            {tab === "actions" && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#555] uppercase tracking-wider">Action Items</p>
                  <button
                    onClick={() => setShowAddAction(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 rounded-lg hover:bg-[#10b981]/20 transition-colors"
                  >
                    <Plus size={12} /> Add Action
                  </button>
                </div>

                {showAddAction && (
                  <AddActionForm
                    partnerId={partner.id}
                    onSaved={(a) => { setActions((prev) => [a, ...prev]); setShowAddAction(false); }}
                    onCancel={() => setShowAddAction(false)}
                  />
                )}

                {/* Open items */}
                {actions.filter((a) => a.status !== "completed").length === 0 && (
                  <div className="text-center py-4 text-[#555] text-sm">No open action items</div>
                )}
                {actions.filter((a) => a.status !== "completed").map((a) => (
                  <ActionItemRow key={a.id} action={a} onComplete={completeAction} />
                ))}

                {/* Completed */}
                {actions.filter((a) => a.status === "completed").length > 0 && (
                  <>
                    <div className="border-t border-[#2a2a2a] pt-4">
                      <p className="text-[11px] text-[#555] uppercase tracking-wider mb-3">Completed</p>
                      <div className="space-y-2 opacity-60">
                        {actions.filter((a) => a.status === "completed").map((a) => (
                          <ActionItemRow key={a.id} action={a} onComplete={completeAction} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-[#111] border border-red-700/30 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-red-900/20 border border-red-700/30 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Delete Partner?</h3>
              </div>
              <p className="text-sm text-[#aaa] leading-relaxed">
                Delete <span className="font-semibold text-white">{partner.name}</span>? This will also delete all contacts, interactions, and action items. This cannot be undone.
              </p>
            </div>
            <div className="p-5 flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm text-[#888] hover:text-white border border-[#2a2a2a] rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete Partner
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ActionItemRow ────────────────────────────────────────────────────────────

function ActionItemRow({ action, onComplete }: { action: ActionItem; onComplete: (id: string) => void }) {
  const isOverdue = action.status !== "completed" && action.due_date && new Date(action.due_date) < new Date();
  return (
    <div className={`flex gap-3 items-start bg-[#1a1a1a] rounded-xl p-3 border ${isOverdue ? "border-red-700/30" : "border-[#2a2a2a]"}`}>
      <button
        onClick={() => action.status !== "completed" && onComplete(action.id)}
        className={`flex-shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-colors ${
          action.status === "completed"
            ? "bg-[#10b981] border-[#10b981]"
            : "border-[#444] hover:border-[#10b981]"
        }`}
      >
        {action.status === "completed" && <Check size={12} className="text-black" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-medium ${action.status === "completed" ? "line-through text-[#555]" : "text-white"}`}>
            {action.title}
          </p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${priorityBadgeClass(action.priority)}`}>
            {action.priority}
          </span>
        </div>
        {action.description && (
          <p className="text-xs text-[#666] mt-0.5">{action.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {action.due_date && (
            <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? "text-red-400" : "text-[#555]"}`}>
              {isOverdue && <AlertCircle size={10} />}
              <Clock size={10} /> {formatDate(action.due_date)}
            </span>
          )}
          {action.assignee && (
            <span className="text-[10px] text-[#555] flex items-center gap-1">
              <User size={10} /> {action.assignee}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Inline Forms ─────────────────────────────────────────────────────────────

function AddContactForm({ partnerId, onSaved, onCancel }: {
  partnerId: string; onSaved: (c: Contact) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "", preferred_contact_method: "email", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/partners/${partnerId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) { const data = await res.json(); onSaved(data.contact); }
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#111] border border-[#10b981]/20 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-[#10b981] uppercase tracking-wider">Add Contact</p>
      <FormInput label="Name *" value={form.name} onChange={(v) => set("name", v)} />
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Role" value={form.role} onChange={(v) => set("role", v)} />
        <FormSelect label="Preferred" value={form.preferred_contact_method} onChange={(v) => set("preferred_contact_method", v)}
          options={[{ value: "email", label: "Email" }, { value: "phone", label: "Phone" }, { value: "text", label: "Text" }]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormInput label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
        <FormInput label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
      </div>
      <FormTextarea label="Notes" value={form.notes} onChange={(v) => set("notes", v)} rows={2} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs bg-[#10b981] text-black font-semibold rounded-lg disabled:opacity-50">
          {saving ? "Saving…" : "Save Contact"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-[#888] hover:text-white border border-[#2a2a2a] rounded-lg">Cancel</button>
      </div>
    </form>
  );
}

function AddInteractionForm({ partnerId, contacts, onSaved, onCancel }: {
  partnerId: string; contacts: Contact[]; onSaved: (i: Interaction) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({
    type: "call", direction: "outbound", summary: "", outcome: "neutral",
    logged_by: "blake", contact_id: "", interaction_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/partners/${partnerId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contact_id: form.contact_id || null,
          interaction_date: new Date(form.interaction_date).toISOString(),
        }),
      });
      if (res.ok) { const data = await res.json(); onSaved(data.interaction); }
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#111] border border-[#10b981]/20 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-[#10b981] uppercase tracking-wider">Log Interaction</p>
      <div className="grid grid-cols-2 gap-3">
        <FormSelect label="Type" value={form.type} onChange={(v) => set("type", v)}
          options={INTERACTION_TYPES.map((t) => ({ value: t, label: `${INTERACTION_ICONS[t]} ${t.replace("_", " ")}` }))} />
        <FormSelect label="Direction" value={form.direction} onChange={(v) => set("direction", v)}
          options={[{ value: "outbound", label: "Outbound" }, { value: "inbound", label: "Inbound" }]} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormSelect label="Outcome" value={form.outcome} onChange={(v) => set("outcome", v)}
          options={[{ value: "positive", label: "Positive" }, { value: "neutral", label: "Neutral" }, { value: "negative", label: "Negative" }]} />
        <FormSelect label="Logged By" value={form.logged_by} onChange={(v) => set("logged_by", v)}
          options={[{ value: "blake", label: "Blake" }, { value: "joe", label: "Joe" }, { value: "clara", label: "Clara" }]} />
      </div>
      {contacts.length > 0 && (
        <FormSelect label="Contact" value={form.contact_id} onChange={(v) => set("contact_id", v)}
          options={[{ value: "", label: "— None —" }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]} />
      )}
      <FormInput label="Date" value={form.interaction_date} onChange={(v) => set("interaction_date", v)} type="date" />
      <FormTextarea label="Summary *" value={form.summary} onChange={(v) => set("summary", v)} rows={3} placeholder="What happened?" />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs bg-[#10b981] text-black font-semibold rounded-lg disabled:opacity-50">
          {saving ? "Saving…" : "Log Interaction"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-[#888] hover:text-white border border-[#2a2a2a] rounded-lg">Cancel</button>
      </div>
    </form>
  );
}

function AddActionForm({ partnerId, onSaved, onCancel }: {
  partnerId: string; onSaved: (a: ActionItem) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState({ title: "", description: "", due_date: "", priority: "medium", assignee: "blake" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/partners/${partnerId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        }),
      });
      if (res.ok) { const data = await res.json(); onSaved(data.action); }
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#111] border border-[#10b981]/20 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-[#10b981] uppercase tracking-wider">Add Action Item</p>
      <FormInput label="Title *" value={form.title} onChange={(v) => set("title", v)} />
      <FormTextarea label="Description" value={form.description} onChange={(v) => set("description", v)} rows={2} />
      <div className="grid grid-cols-3 gap-3">
        <FormInput label="Due Date" value={form.due_date} onChange={(v) => set("due_date", v)} type="date" />
        <FormSelect label="Priority" value={form.priority} onChange={(v) => set("priority", v)}
          options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "urgent", label: "Urgent" }]} />
        <FormSelect label="Assignee" value={form.assignee} onChange={(v) => set("assignee", v)}
          options={[{ value: "blake", label: "Blake" }, { value: "joe", label: "Joe" }, { value: "clara", label: "Clara" }]} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 text-xs bg-[#10b981] text-black font-semibold rounded-lg disabled:opacity-50">
          {saving ? "Saving…" : "Add Action"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-xs text-[#888] hover:text-white border border-[#2a2a2a] rounded-lg">Cancel</button>
      </div>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PartnersClient() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [partnerTypeFilter, setPartnerTypeFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (partnerTypeFilter !== "all") params.set("partnerType", partnerTypeFilter);
      if (healthFilter !== "all") params.set("health", healthFilter);
      if (search) params.set("search", search);

      const [partnersRes, statsRes] = await Promise.all([
        fetch(`/api/partners?${params}`),
        fetch("/api/partners/stats"),
      ]);

      if (partnersRes.ok) {
        const d = await partnersRes.json();
        setPartners(d.partners || []);
      } else {
        setError("Failed to load partners");
      }

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, partnerTypeFilter, healthFilter, search]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handlePartnerSaved = (p: Partner) => {
    setPartners((prev) => [p, ...prev]);
    setShowAddModal(false);
    fetchData(); // refresh stats
  };

  const handlePartnerUpdated = (p: Partner) => {
    setPartners((prev) => prev.map((x) => x.id === p.id ? p : x));
    if (selectedPartner?.id === p.id) setSelectedPartner(p);
  };

  const handlePartnerDeleted = (partnerId: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== partnerId));
    setSelectedPartner(null);
  };

  return (
    <div className="relative">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Partners"
            value={stats.totalPartners}
            icon={<Building2 size={16} className="text-[#555]" />}
          />
          <StatCard
            label="Active Partners"
            value={stats.activePartners}
            color="#10b981"
            icon={<TrendingUp size={16} className="text-[#10b981]" />}
          />
          <StatCard
            label="Open Action Items"
            value={stats.openActionItems}
            color={stats.openActionItems > 0 ? "#eab308" : "white"}
            icon={<AlertCircle size={16} className={stats.openActionItems > 0 ? "text-yellow-400" : "text-[#555]"} />}
          />
          <StatCard
            label="Avg Health Score"
            value={stats.avgHealthScore}
            color={healthColor(stats.avgHealthScore)}
            sub={healthLabel(stats.avgHealthScore)}
            icon={<Activity size={16} style={{ color: healthColor(stats.avgHealthScore) }} />}
          />
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Partner type */}
        <div className="flex items-center gap-1 flex-wrap">
          {PARTNER_TYPES.map(({ key, label }) => (
            <FilterPill key={key} label={label} active={partnerTypeFilter === key} onClick={() => setPartnerTypeFilter(key)} />
          ))}
        </div>

        {/* Spacer */}
        <div className="w-px h-5 bg-[#2a2a2a] hidden sm:block" />

        {/* Status pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {PIPELINE_STATUSES.map(({ key, label }) => (
            <FilterPill key={key} label={label} active={statusFilter === key} onClick={() => setStatusFilter(key)} />
          ))}
        </div>

        {/* Spacer */}
        <div className="w-px h-5 bg-[#2a2a2a] hidden sm:block" />

        {/* Health filter */}
        <div className="flex items-center gap-1">
          {HEALTH_FILTERS.map(({ key, label }) => (
            <FilterPill key={key} label={label} active={healthFilter === key} onClick={() => setHealthFilter(key)} />
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search partners…"
          className="ml-auto px-3 py-1.5 text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#444] focus:outline-none focus:border-[#10b981]/50 w-52"
        />

        {/* Add Partner */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#10b981] text-black font-semibold rounded-lg hover:bg-[#0ea572] transition-colors"
        >
          <Plus size={15} /> Add Partner
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={20} className="text-[#555] animate-spin" />
        </div>
      ) : partners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 size={40} className="text-[#333] mb-3" />
          <p className="text-[#555] text-sm">No partners found</p>
          <p className="text-[#444] text-xs mt-1">Try adjusting your filters or add a new partner</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-[#555] text-[11px] uppercase tracking-wider">
                <th className="text-left px-3 py-3 w-5"></th>
                <th className="text-left px-3 py-3">Company</th>
                <th className="text-left px-3 py-3">Type</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-left px-3 py-3">Territory</th>
                <th className="text-left px-3 py-3">Primary Contact</th>
                <th className="text-left px-3 py-3">Last Contact</th>
                <th className="text-left px-3 py-3">Next Action</th>
                <th className="text-left px-3 py-3">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPartner(selectedPartner?.id === p.id ? null : p)}
                  className={`border-b border-[#1e1e1e] hover:bg-[#1a1a1a] cursor-pointer transition-colors ${
                    selectedPartner?.id === p.id ? "bg-[#1a1a1a]" : ""
                  }`}
                >
                  {/* Health dot */}
                  <td className="px-3 py-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full block"
                      style={{ backgroundColor: healthColor(p.health_score) }}
                      title={`Health: ${p.health_score} (${healthLabel(p.health_score)})`}
                    />
                  </td>

                  {/* Company */}
                  <td className="px-3 py-3">
                    <p className="text-white font-medium text-sm truncate max-w-[160px]">{p.name}</p>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${partnerTypeBadgeClass(p.partner_type)}`}>
                      {partnerTypeLabel(p.partner_type)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusBadgeClass(p.pipeline_status)}`}>
                      {statusLabel(p.pipeline_status)}
                    </span>
                  </td>

                  {/* Territory */}
                  <td className="px-3 py-3 text-[#888] text-xs">{p.territory || "—"}</td>

                  {/* Primary Contact */}
                  <td className="px-3 py-3 text-[#888] text-xs max-w-[140px]">
                    <span className="truncate block">{primaryContact(p)}</span>
                  </td>

                  {/* Last Contact */}
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: lastContactColor(p.last_contact_at) }}>
                    {formatRelative(p.last_contact_at)}
                  </td>

                  {/* Next Action */}
                  <td className="px-3 py-3 text-xs text-[#888] max-w-[160px]">
                    {p.next_action ? (
                      <div>
                        <span className="truncate block">{p.next_action}</span>
                        {p.next_action_due && (
                          <span className="text-[#555] text-[10px]">{formatDate(p.next_action_due)}</span>
                        )}
                      </div>
                    ) : "—"}
                  </td>

                  {/* Assignee */}
                  <td className="px-3 py-3 text-xs text-[#888]">
                    {p.next_action_assignee || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-2 border-t border-[#2a2a2a] text-[#555] text-xs">
            {partners.length} partner{partners.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedPartner && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedPartner(null)} />
          <DetailPanel
            partner={selectedPartner}
            onClose={() => setSelectedPartner(null)}
            onUpdated={handlePartnerUpdated}
            onDeleted={handlePartnerDeleted}
          />
        </>
      )}

      {/* Add Partner Modal */}
      {showAddModal && (
        <AddPartnerModal
          onClose={() => setShowAddModal(false)}
          onSaved={handlePartnerSaved}
        />
      )}
    </div>
  );
}

// ─── Minor icon helpers ────────────────────────────────────────────────────────

function Activity({ size, style, className }: { size: number; style?: React.CSSProperties; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style} className={className}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
