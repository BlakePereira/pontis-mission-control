"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Phone, Mail, Globe, MapPin, Calendar, ChevronRight, Clock,
  Plus, Save, Edit3, Trash2, User, MessageSquare, PhoneCall,
  Video, FileText, ArrowRight, CheckCircle2,
  Flower2, SprayCan, AlertTriangle, DollarSign, Truck,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

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

interface Contact {
  id: string;
  partner_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  preferred_contact_method: string | null;
  notes: string | null;
  created_at: string;
}

interface ActionItem {
  id: string;
  partner_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  assignee: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
}

type TabKey = "activity" | "contacts" | "actions" | "readiness";

// ─── Constants ──────────────────────────────────────────────────────────────

const INTERACTION_TYPES: Record<string, { icon: typeof Phone; label: string; color: string }> = {
  call: { icon: PhoneCall, label: "Call", color: "#3b82f6" },
  email: { icon: Mail, label: "Email", color: "#10b981" },
  meeting: { icon: Video, label: "Meeting", color: "#8b5cf6" },
  site_visit: { icon: MapPin, label: "Site Visit", color: "#f59e0b" },
  note: { icon: FileText, label: "Note", color: "#6b7280" },
  follow_up: { icon: ArrowRight, label: "Follow-up", color: "#ec4899" },
  order: { icon: Truck, label: "Order", color: "#10b981" },
  other: { icon: MessageSquare, label: "Other", color: "#52525b" },
};

const FULFILLMENT_STATUSES = [
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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function dueDateUrgency(due: string | null): "overdue" | "today" | "upcoming" | "future" | "none" {
  if (!due) return "none";
  const d = new Date(due);
  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 3) return "upcoming";
  return "future";
}

const urgencyStyles: Record<string, { bg: string; text: string; label: string }> = {
  overdue: { bg: "bg-red-900/30", text: "text-red-400", label: "Overdue" },
  today: { bg: "bg-yellow-900/30", text: "text-yellow-400", label: "Due Today" },
  upcoming: { bg: "bg-blue-900/30", text: "text-blue-400", label: "Due Soon" },
  future: { bg: "bg-[#1a1a1a]", text: "text-[#888]", label: "" },
  none: { bg: "bg-[#1a1a1a]", text: "text-[#888]", label: "" },
};

function parsePartnerNotes(notes: string | null): Partial<FulfillmentPartner> {
  if (!notes) return {};
  const result: Partial<FulfillmentPartner> = {};

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

function buildStructuredNotes(partner: FulfillmentPartner, updates: Partial<FulfillmentPartner>): string {
  const merged = { ...partner, ...updates };
  const lines: string[] = [];

  if (merged.fulfillment_category) lines.push(`[category: ${merged.fulfillment_category}]`);
  if (merged.fulfillment_status) lines.push(`[fulfillment_status: ${merged.fulfillment_status}]`);
  if (merged.service_radius_miles) lines.push(`[radius: ${merged.service_radius_miles} miles]`);
  if (merged.quality_status) lines.push(`[quality: ${merged.quality_status}]`);
  if (merged.contract_status) lines.push(`[contract: ${merged.contract_status}]`);
  if (merged.pricing_notes) lines.push(`[pricing: ${merged.pricing_notes}]`);
  if (merged.preferred_order_channel) lines.push(`[channel: ${merged.preferred_order_channel}]`);
  if (merged.service_area_notes) lines.push(`[service_area: ${merged.service_area_notes}]`);

  // Preserve any non-structured notes
  const plainNotes = (partner.notes || "").split("\n")
    .filter(line => !line.trim().startsWith("[") || !line.trim().endsWith("]"))
    .join("\n").trim();

  if (plainNotes) lines.push(plainNotes);

  return lines.join("\n");
}

// ─── Editable Field ─────────────────────────────────────────────────────────

function EditableField({ value, onSave, label, placeholder }: {
  value: string | null | undefined;
  onSave: (val: string) => void;
  label: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  if (!editing) {
    return (
      <div
        className="group flex items-center gap-2 cursor-pointer hover:bg-[#222] rounded px-2 py-1.5 -mx-2 transition-colors"
        onClick={() => { setDraft(value || ""); setEditing(true); }}
      >
        <span className="text-sm text-[#aaa] flex-1">{value || <span className="text-[#555] italic">{placeholder || `Add ${label}`}</span>}</span>
        <Edit3 size={11} className="text-[#555] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        className="flex-1 bg-[#222] border border-[#444] rounded px-2 py-1 text-sm text-white outline-none focus:border-[#f97316]"
        placeholder={placeholder || label}
      />
      <button onClick={() => { onSave(draft); setEditing(false); }} className="text-[#f97316] hover:text-white transition-colors">
        <Save size={14} />
      </button>
      <button onClick={() => setEditing(false)} className="text-[#555] hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Log Activity Form ──────────────────────────────────────────────────────

function LogActivityForm({ partnerId, contacts, onLogged, onCancel, prefillType }: {
  partnerId: string;
  contacts: Contact[];
  onLogged: () => void;
  onCancel: () => void;
  prefillType?: string;
}) {
  const [type, setType] = useState(prefillType || "call");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [contactId, setContactId] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!summary.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/partners/${partnerId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          summary: summary.trim(),
          outcome: outcome || null,
          raw_note: notes.trim() || null,
          contact_id: contactId || null,
          direction: type === "email" ? "outbound" : null,
          interaction_date: new Date().toISOString(),
          logged_by: "user",
        }),
      });
      onLogged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Log Activity</h4>
        <button onClick={onCancel} className="text-[#555] hover:text-white"><X size={14} /></button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(INTERACTION_TYPES).map(([key, { label, color }]) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              type === key ? "ring-1 ring-offset-1 ring-offset-[#111]" : "opacity-50 hover:opacity-80"
            }`}
            style={{ backgroundColor: `${color}20`, color }}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="What happened? (required)"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316] placeholder-[#555]"
        autoFocus
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes / details (optional)"
        rows={2}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316] placeholder-[#555] resize-none"
      />

      <select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
      >
        <option value="">Outcome (optional)</option>
        <option value="positive">Positive</option>
        <option value="neutral">Neutral</option>
        <option value="negative">Negative</option>
      </select>

      {contacts.length > 0 && (
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]"
        >
          <option value="">No specific contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.role ? ` (${c.role})` : ""}</option>
          ))}
        </select>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-[#888] hover:text-white">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!summary.trim() || saving}
          className="px-4 py-1.5 text-xs bg-[#f97316] text-white rounded-lg hover:bg-[#ea580c] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Log Activity"}
        </button>
      </div>
    </div>
  );
}

// ─── Add Contact Form ───────────────────────────────────────────────────────

function AddContactForm({ partnerId, onAdded, onCancel }: {
  partnerId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/partners/${partnerId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
        }),
      });
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Add Contact</h4>
        <button onClick={onCancel} className="text-[#555] hover:text-white"><X size={14} /></button>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" autoFocus
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316] placeholder-[#555]" />
      <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. Owner, Manager)"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316] placeholder-[#555]" />
      <div className="grid grid-cols-2 gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316] placeholder-[#555]" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316] placeholder-[#555]" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-[#888] hover:text-white">Cancel</button>
        <button onClick={handleSubmit} disabled={!name.trim() || saving}
          className="px-4 py-1.5 text-xs bg-[#f97316] text-white rounded-lg hover:bg-[#ea580c] disabled:opacity-50">
          {saving ? "Saving..." : "Add Contact"}
        </button>
      </div>
    </div>
  );
}

// ─── Schedule Follow-up Form ────────────────────────────────────────────────

function FollowUpForm({ partnerId, onScheduled, onCancel }: {
  partnerId: string;
  onScheduled: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignee, setAssignee] = useState("Joe");
  const [priority, setPriority] = useState("medium");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/partners/${partnerId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          due_date: dueDate || null,
          assignee,
          priority,
          status: "pending",
        }),
      });
      await fetch(`/api/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          next_action: title.trim(),
          next_action_due: dueDate || null,
          next_action_assignee: assignee,
        }),
      });
      await fetch(`/api/partners/${partnerId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "follow_up",
          summary: `Follow-up scheduled: ${title.trim()}`,
          outcome: dueDate ? `Due: ${formatDate(dueDate)}` : null,
          interaction_date: new Date().toISOString(),
          logged_by: "user",
        }),
      });
      onScheduled();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Schedule Follow-up</h4>
        <button onClick={onCancel} className="text-[#555] hover:text-white"><X size={14} /></button>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the follow-up? *" autoFocus
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316] placeholder-[#555]" />
      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]" />
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]">
          <option value="Joe">Joe</option>
          <option value="Blake">Blake</option>
          <option value="Clara">Clara</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#f97316]">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-[#888] hover:text-white">Cancel</button>
        <button onClick={handleSubmit} disabled={!title.trim() || saving}
          className="px-4 py-1.5 text-xs bg-[#f97316] text-white rounded-lg hover:bg-[#ea580c] disabled:opacity-50">
          {saving ? "Saving..." : "Schedule"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Fulfillment Detail Panel ──────────────────────────────────────────

export default function FulfillmentDetailPanel({ partner: initialPartner, onClose, onUpdated }: {
  partner: FulfillmentPartner;
  onClose: () => void;
  onUpdated: (p: FulfillmentPartner) => void;
}) {
  const [partner, setPartner] = useState<FulfillmentPartner>(() => ({
    ...initialPartner,
    ...parsePartnerNotes(initialPartner.notes),
  }));
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("readiness");
  const [showLogForm, setShowLogForm] = useState(false);
  const [logPrefillType, setLogPrefillType] = useState<string | undefined>();
  const [showContactForm, setShowContactForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/partners/${partner.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.partner) {
          const enriched = { ...data.partner, ...parsePartnerNotes(data.partner.notes) };
          setPartner(enriched);
        }
        setInteractions(data.interactions || []);
        setContacts(data.contacts || []);
        setActions(data.actions || []);
      }
    } finally {
      setLoading(false);
    }
  }, [partner.id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const notifyParent = useCallback((p: FulfillmentPartner) => {
    onUpdated(p);
  }, [onUpdated]);

  async function updateField(field: string, value: string) {
    const res = await fetch(`/api/partners/${partner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.partner) {
        const enriched = { ...data.partner, ...parsePartnerNotes(data.partner.notes) };
        setPartner(enriched);
        notifyParent(enriched);
      }
    }
  }

  async function updateFulfillmentField(updates: Partial<FulfillmentPartner>) {
    const newNotes = buildStructuredNotes(partner, updates);
    await updateField("notes", newNotes);
  }

  async function updateStatus(newStatus: string) {
    await updateFulfillmentField({ fulfillment_status: newStatus });
    // Log the status change
    await fetch(`/api/partners/${partner.id}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "other",
        summary: `Status changed to ${FULFILLMENT_STATUSES.find(s => s.key === newStatus)?.label || newStatus}`,
        interaction_date: new Date().toISOString(),
        logged_by: "system",
      }),
    });
    fetchDetails();
  }

  async function deleteContact(contactId: string) {
    await fetch(`/api/partners/${partner.id}/contacts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contactId }),
    });
    fetchDetails();
  }

  async function completeAction(actionId: string) {
    await fetch(`/api/partners/${partner.id}/actions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: actionId, status: "completed", completed_at: new Date().toISOString() }),
    });
    fetchDetails();
  }

  function quickLog(type: string) {
    setLogPrefillType(type);
    setShowLogForm(true);
    setActiveTab("activity");
  }

  const nextActionUrgency = dueDateUrgency(partner.next_action_due);
  const urgStyle = urgencyStyles[nextActionUrgency];
  const isStale = partner.last_contact_at && (Date.now() - new Date(partner.last_contact_at).getTime()) / (1000 * 60 * 60 * 24) > 14;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "readiness", label: "Readiness" },
    { key: "activity", label: "Activity", count: interactions.length },
    { key: "contacts", label: "Contacts", count: contacts.length },
    { key: "actions", label: "Actions", count: actions.filter(a => a.status !== "completed").length },
  ];

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-[560px] max-w-[90vw] bg-[#0f0f0f] border-l border-[#2a2a2a] z-[60] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#2a2a2a] flex-shrink-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                {partner.fulfillment_category === "florist" && <Flower2 size={16} className="text-pink-400" />}
                {partner.fulfillment_category === "cleaner" && <SprayCan size={16} className="text-blue-400" />}
                {partner.fulfillment_category === "both" && (
                  <><Flower2 size={14} className="text-pink-400" /><SprayCan size={14} className="text-blue-400" /></>
                )}
                <h2 className="text-lg font-bold text-white truncate">{partner.name}</h2>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="capitalize text-[#888]">{partner.fulfillment_category || "—"}</span>
                {partner.city && <span className="text-[#555]"><MapPin size={10} className="inline mr-1" />{[partner.city, partner.state].filter(Boolean).join(", ")}</span>}
                <span className="text-[#555]">Last contact: {formatRelative(partner.last_contact_at)}</span>
                {isStale && <span className="text-orange-400">Stale</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-[#555] hover:text-white transition-colors mt-1">
              <X size={20} />
            </button>
          </div>

          {/* Status Selector */}
          <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
            {FULFILLMENT_STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => updateStatus(s.key)}
                className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all ${
                  partner.fulfillment_status === s.key
                    ? "bg-[#f97316] text-white"
                    : "bg-[#1a1a1a] text-[#666] hover:text-white hover:bg-[#222]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button onClick={() => quickLog("call")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-900/20 border border-blue-800/30 text-blue-400 rounded-lg hover:bg-blue-900/30 transition-colors">
              <PhoneCall size={12} /> Log Call
            </button>
            <button onClick={() => quickLog("email")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-900/20 border border-emerald-800/30 text-emerald-400 rounded-lg hover:bg-emerald-900/30 transition-colors">
              <Mail size={12} /> Log Email
            </button>
            <button onClick={() => setShowFollowUpForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-pink-900/20 border border-pink-800/30 text-pink-400 rounded-lg hover:bg-pink-900/30 transition-colors">
              <Calendar size={12} /> Follow-up
            </button>
            <button onClick={() => quickLog("site_visit")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded-lg hover:text-white hover:border-[#444] transition-colors">
              <MapPin size={12} /> Site Visit
            </button>
          </div>
        </div>

        {/* Next Action Banner */}
        {partner.next_action && (
          <div className={`mx-4 mt-3 p-3 rounded-lg border ${urgStyle.bg} border-[#2a2a2a]`}>
            <div className="flex items-center gap-2 mb-1">
              <ChevronRight size={12} className="text-[#f97316]" />
              <span className="text-[10px] text-[#555] uppercase tracking-wider">Next Action</span>
              {urgStyle.label && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${urgStyle.bg} ${urgStyle.text}`}>
                  {urgStyle.label}
                </span>
              )}
            </div>
            <p className="text-sm text-white">{partner.next_action}</p>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#666]">
              {partner.next_action_due && <span><Calendar size={9} className="inline mr-1" />{formatDate(partner.next_action_due)}</span>}
              {partner.next_action_assignee && <span><User size={9} className="inline mr-1" />{partner.next_action_assignee}</span>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a2a] px-4 mt-3">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-[#f97316] text-[#f97316]"
                  : "border-transparent text-[#666] hover:text-white"
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#222] text-[10px]">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f97316]" />
            </div>
          ) : (
            <>
              {/* Readiness Tab */}
              {activeTab === "readiness" && (
                <div className="space-y-4">
                  {/* Service Readiness */}
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Service Readiness</p>
                    <div className="bg-[#1a1a1a] rounded-xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-[#555] mb-1">Category</p>
                          <select
                            value={partner.fulfillment_category || ""}
                            onChange={(e) => updateFulfillmentField({ fulfillment_category: e.target.value as "florist" | "cleaner" | "both" })}
                            className="w-full bg-[#222] border border-[#2a2a2a] rounded px-2 py-1.5 text-sm text-white outline-none focus:border-[#f97316]"
                          >
                            <option value="">Select...</option>
                            <option value="florist">Florist</option>
                            <option value="cleaner">Cleaner</option>
                            <option value="both">Both</option>
                          </select>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#555] mb-1">Preferred Order Channel</p>
                          <select
                            value={partner.preferred_order_channel || ""}
                            onChange={(e) => updateFulfillmentField({ preferred_order_channel: e.target.value })}
                            className="w-full bg-[#222] border border-[#2a2a2a] rounded px-2 py-1.5 text-sm text-white outline-none focus:border-[#f97316]"
                          >
                            <option value="">Select...</option>
                            <option value="portal">Portal</option>
                            <option value="phone">Phone</option>
                            <option value="email">Email</option>
                            <option value="text">Text</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#555] mb-1">Territory / Service Area</p>
                        <EditableField
                          value={partner.service_area_notes}
                          onSave={(v) => updateFulfillmentField({ service_area_notes: v })}
                          label="Service area"
                          placeholder="e.g., 30 mile radius from Denver, Front Range cemeteries"
                        />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#555] mb-1">Service Radius</p>
                        <EditableField
                          value={partner.service_radius_miles ? `${partner.service_radius_miles} miles` : null}
                          onSave={(v) => {
                            const num = parseInt(v.replace(/\D/g, ""));
                            if (num) updateFulfillmentField({ service_radius_miles: num });
                          }}
                          label="Radius"
                          placeholder="e.g., 25 miles"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing & Contract */}
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Pricing & Contract</p>
                    <div className="bg-[#1a1a1a] rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign size={12} className="text-[#555] flex-shrink-0" />
                        <EditableField
                          value={partner.pricing_notes}
                          onSave={(v) => updateFulfillmentField({ pricing_notes: v })}
                          label="Pricing"
                          placeholder="Pricing summary / status"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText size={12} className="text-[#555] flex-shrink-0" />
                        <EditableField
                          value={partner.contract_status}
                          onSave={(v) => updateFulfillmentField({ contract_status: v })}
                          label="Contract"
                          placeholder="Contract status (e.g., signed, pending, sent)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quality & Trust */}
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Quality & Trust</p>
                    <div className="bg-[#1a1a1a] rounded-xl p-3 space-y-2">
                      <div>
                        <p className="text-[10px] text-[#555] mb-1">Quality Status</p>
                        <div className="flex gap-2">
                          {(["normal", "watch", "restricted"] as const).map((q) => (
                            <button
                              key={q}
                              onClick={() => updateFulfillmentField({ quality_status: q })}
                              className={`px-3 py-1.5 rounded text-xs capitalize transition-all ${
                                partner.quality_status === q
                                  ? q === "normal" ? "bg-green-900/40 text-green-400 border border-green-700/40"
                                    : q === "watch" ? "bg-yellow-900/40 text-yellow-400 border border-yellow-700/40"
                                    : "bg-red-900/40 text-red-400 border border-red-700/40"
                                  : "bg-[#222] text-[#666] border border-[#2a2a2a] hover:text-white"
                              }`}
                            >
                              {q === "watch" && <AlertTriangle size={10} className="inline mr-1" />}
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div>
                    <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Contact Info</p>
                    <div className="bg-[#1a1a1a] rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-[#555] flex-shrink-0" />
                        <EditableField value={partner.phone} onSave={(v) => updateField("phone", v)} label="Phone" placeholder="Add phone" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-[#555] flex-shrink-0" />
                        <EditableField value={partner.email} onSave={(v) => updateField("email", v)} label="Email" placeholder="Add email" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe size={12} className="text-[#555] flex-shrink-0" />
                        <EditableField value={partner.website} onSave={(v) => updateField("website", v)} label="Website" placeholder="Add website" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === "activity" && (
                <div className="space-y-3">
                  {(showLogForm || showFollowUpForm) ? (
                    showFollowUpForm ? (
                      <FollowUpForm
                        partnerId={partner.id}
                        onScheduled={() => { setShowFollowUpForm(false); fetchDetails(); }}
                        onCancel={() => setShowFollowUpForm(false)}
                      />
                    ) : (
                      <LogActivityForm
                        partnerId={partner.id}
                        contacts={contacts}
                        prefillType={logPrefillType}
                        onLogged={() => { setShowLogForm(false); setLogPrefillType(undefined); fetchDetails(); }}
                        onCancel={() => { setShowLogForm(false); setLogPrefillType(undefined); }}
                      />
                    )
                  ) : (
                    <button
                      onClick={() => setShowLogForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#2a2a2a] rounded-lg text-xs text-[#666] hover:text-[#f97316] hover:border-[#f97316]/30 transition-colors"
                    >
                      <Plus size={14} /> Log Activity
                    </button>
                  )}

                  {interactions.length === 0 ? (
                    <div className="text-center py-8 text-[#555] text-xs">
                      No activity yet. Log your first interaction!
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {interactions.map((ix) => {
                        const typeInfo = INTERACTION_TYPES[ix.type] || INTERACTION_TYPES.other;
                        const Icon = typeInfo.icon;
                        return (
                          <div key={ix.id} className="flex gap-3 py-2.5 border-b border-[#1a1a1a] last:border-0">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: `${typeInfo.color}20` }}
                            >
                              <Icon size={13} style={{ color: typeInfo.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white">{ix.summary}</p>
                              {ix.raw_note && <p className="text-xs text-[#aaa] mt-0.5 whitespace-pre-wrap">{ix.raw_note}</p>}
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-[#555]">
                                <span>{formatDateTime(ix.interaction_date)}</span>
                                {ix.outcome && (
                                  <span className={ix.outcome === "positive" ? "text-green-400" : ix.outcome === "negative" ? "text-red-400" : "text-[#888]"}>
                                    {ix.outcome}
                                  </span>
                                )}
                                {ix.logged_by && <span>by {ix.logged_by}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === "contacts" && (
                <div className="space-y-3">
                  {showContactForm ? (
                    <AddContactForm
                      partnerId={partner.id}
                      onAdded={() => { setShowContactForm(false); fetchDetails(); }}
                      onCancel={() => setShowContactForm(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowContactForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#2a2a2a] rounded-lg text-xs text-[#666] hover:text-[#f97316] hover:border-[#f97316]/30 transition-colors"
                    >
                      <Plus size={14} /> Add Contact
                    </button>
                  )}

                  {contacts.length === 0 ? (
                    <div className="text-center py-8 text-[#555] text-xs">
                      No contacts yet. Add your first contact at this partner.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((c) => (
                        <div key={c.id} className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] group">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <User size={13} className="text-[#555]" />
                                <span className="text-sm font-medium text-white">{c.name}</span>
                                {c.role && <span className="text-[10px] text-[#666] bg-[#222] px-1.5 py-0.5 rounded">{c.role}</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-[#888]">
                                {c.phone && (
                                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-[#f97316]">
                                    <Phone size={10} /> {c.phone}
                                  </a>
                                )}
                                {c.email && (
                                  <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-[#f97316]">
                                    <Mail size={10} /> {c.email}
                                  </a>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteContact(c.id)}
                              className="text-[#555] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {activeTab === "actions" && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowFollowUpForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#2a2a2a] rounded-lg text-xs text-[#666] hover:text-[#f97316] hover:border-[#f97316]/30 transition-colors"
                  >
                    <Plus size={14} /> New Action
                  </button>

                  {showFollowUpForm && (
                    <FollowUpForm
                      partnerId={partner.id}
                      onScheduled={() => { setShowFollowUpForm(false); fetchDetails(); }}
                      onCancel={() => setShowFollowUpForm(false)}
                    />
                  )}

                  {actions.length === 0 ? (
                    <div className="text-center py-8 text-[#555] text-xs">
                      No action items yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {actions.filter(a => a.status !== "completed").map((a) => {
                        const urg = dueDateUrgency(a.due_date);
                        const us = urgencyStyles[urg];
                        return (
                          <div key={a.id} className={`${us.bg} rounded-xl p-3 border border-[#2a2a2a]`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm text-white">{a.title}</p>
                                {a.description && <p className="text-xs text-[#888] mt-0.5">{a.description}</p>}
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#666]">
                                  {a.due_date && <span className={us.text}><Calendar size={9} className="inline mr-1" />{formatDate(a.due_date)}</span>}
                                  {a.assignee && <span><User size={9} className="inline mr-1" />{a.assignee}</span>}
                                </div>
                              </div>
                              <button
                                onClick={() => completeAction(a.id)}
                                className="text-[#555] hover:text-[#f97316] transition-colors"
                                title="Mark complete"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {actions.filter(a => a.status === "completed").length > 0 && (
                        <>
                          <p className="text-[10px] text-[#555] uppercase tracking-wider pt-2">Completed</p>
                          {actions.filter(a => a.status === "completed").map((a) => (
                            <div key={a.id} className="bg-[#111] rounded-xl p-3 border border-[#1a1a1a] opacity-60">
                              <p className="text-sm text-[#888] line-through">{a.title}</p>
                              <span className="text-[10px] text-[#555]"><CheckCircle2 size={9} className="inline mr-1" />{formatDate(a.completed_at)}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
