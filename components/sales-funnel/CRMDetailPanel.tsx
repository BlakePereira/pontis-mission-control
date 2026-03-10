"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Phone, Mail, Globe, MapPin, Calendar, ChevronRight, Clock,
  Plus, Save, Edit3, Trash2, User, MessageSquare, PhoneCall,
  Video, Target, FileText, Package, ArrowRight, CheckCircle2,
  AlertTriangle, Send,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Partner {
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
  pipeline_status: string;
  health_score: number;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_due: string | null;
  next_action_assignee?: string | null;
  total_medallions_ordered: number;
  mrr: number | string;
  notes: string | null;
  is_tracked: boolean;
  lead_source?: string | null;
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

type TabKey = "activity" | "contacts" | "actions" | "info";

// ─── Constants ──────────────────────────────────────────────────────────────

const INTERACTION_TYPES: Record<string, { icon: typeof Phone; label: string; color: string }> = {
  call: { icon: PhoneCall, label: "Call", color: "#3b82f6" },
  email: { icon: Mail, label: "Email", color: "#10b981" },
  meeting: { icon: Video, label: "Meeting", color: "#8b5cf6" },
  demo: { icon: Target, label: "Demo", color: "#f59e0b" },
  note: { icon: FileText, label: "Note", color: "#6b7280" },
  follow_up: { icon: ArrowRight, label: "Follow-up", color: "#ec4899" },
  order: { icon: Package, label: "Order", color: "#10b981" },
  other: { icon: MessageSquare, label: "Other", color: "#52525b" },
};

const STAGES = [
  { key: "prospect", label: "Prospect" },
  { key: "warm", label: "Warm" },
  { key: "demo_scheduled", label: "Demo Scheduled" },
  { key: "demo_done", label: "Demo Done" },
  { key: "negotiating", label: "Negotiating" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "lost", label: "Lost" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function healthColor(score: number): string {
  if (score > 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
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

// ─── Editable Field ─────────────────────────────────────────────────────────

function EditableField({ value, onSave, label, type = "text", placeholder }: {
  value: string | null | undefined;
  onSave: (val: string) => void;
  label: string;
  type?: string;
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
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        className="flex-1 bg-[#222] border border-[#444] rounded px-2 py-1 text-sm text-white outline-none focus:border-[#10b981]"
        placeholder={placeholder || label}
      />
      <button
        onClick={() => { onSave(draft); setEditing(false); }}
        className="text-[#10b981] hover:text-white transition-colors"
      >
        <Save size={14} />
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-[#555] hover:text-white transition-colors"
      >
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
              type === key
                ? "ring-1 ring-offset-1 ring-offset-[#111]"
                : "opacity-50 hover:opacity-80"
            }`}
            style={{
              backgroundColor: `${color}20`,
              color: color,
              ...(type === key ? { ringColor: color } : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <input
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="What happened? (required)"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981] placeholder-[#555]"
        autoFocus
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes / details (optional)"
        rows={2}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981] placeholder-[#555] resize-none"
      />

      <select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981]"
      >
        <option value="">Outcome (optional)</option>
        <option value="positive">✅ Positive</option>
        <option value="neutral">➖ Neutral</option>
        <option value="negative">❌ Negative</option>
      </select>

      {contacts.length > 0 && (
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981]"
        >
          <option value="">No specific contact</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.role ? ` (${c.role})` : ""}</option>
          ))}
        </select>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-[#888] hover:text-white transition-colors">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={!summary.trim() || saving}
          className="px-4 py-1.5 text-xs bg-[#10b981] text-white rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50"
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
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981] placeholder-[#555]" />
      <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. Owner, Office Manager)"
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981] placeholder-[#555]" />
      <div className="grid grid-cols-2 gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981] placeholder-[#555]" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981] placeholder-[#555]" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-[#888] hover:text-white">Cancel</button>
        <button onClick={handleSubmit} disabled={!name.trim() || saving}
          className="px-4 py-1.5 text-xs bg-[#10b981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-50">
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
      // Create action item
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
      // Also update partner's next_action
      await fetch(`/api/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          next_action: title.trim(),
          next_action_due: dueDate || null,
          next_action_assignee: assignee,
        }),
      });
      // Log as interaction
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
        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981] placeholder-[#555]" />
      <div className="grid grid-cols-3 gap-2">
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981]" />
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981]">
          <option value="Joe">Joe</option>
          <option value="Blake">Blake</option>
          <option value="Clara">Clara</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#10b981]">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs text-[#888] hover:text-white">Cancel</button>
        <button onClick={handleSubmit} disabled={!title.trim() || saving}
          className="px-4 py-1.5 text-xs bg-[#10b981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-50">
          {saving ? "Saving..." : "Schedule"}
        </button>
      </div>
    </div>
  );
}

// ─── Main CRM Detail Panel ──────────────────────────────────────────────────

export default function CRMDetailPanel({ partner: initialPartner, onClose, onUpdated }: {
  partner: Partner;
  onClose: () => void;
  onUpdated: (p: Partner) => void;
}) {
  const [partner, setPartner] = useState(initialPartner);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("activity");
  const [showLogForm, setShowLogForm] = useState(false);
  const [logPrefillType, setLogPrefillType] = useState<string | undefined>();
  const [showContactForm, setShowContactForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(partner.notes || "");

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/partners/${partner.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.partner) {
          setPartner(data.partner);
        }
        setInteractions(data.interactions || []);
        setContacts(data.contacts || []);
        setActions(data.actions || []);
      }
    } finally {
      setLoading(false);
    }
  }, [partner.id]);

  // Only fetch on mount or when partner ID changes
  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Notify parent of updates without causing re-render loops
  const notifyParent = useCallback((p: Partner) => {
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
        setPartner(data.partner);
        notifyParent(data.partner);
      }
    }
  }

  async function saveNotes() {
    await updateField("notes", notesDraft);
    setEditingNotes(false);
  }

  async function updateStage(newStage: string) {
    // Update stage
    await fetch(`/api/partners/${partner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_status: newStage }),
    });
    // Log the stage change
    await fetch(`/api/partners/${partner.id}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "other",
        summary: `Stage changed to ${STAGES.find(s => s.key === newStage)?.label || newStage}`,
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

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "activity", label: "Activity", count: interactions.length },
    { key: "contacts", label: "Contacts", count: contacts.length },
    { key: "actions", label: "Actions", count: actions.filter(a => a.status !== "completed").length },
    { key: "info", label: "Info" },
  ];

  return (
    <>
    {/* Backdrop overlay */}
    <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
    <div className="fixed inset-y-0 right-0 w-[520px] max-w-[90vw] bg-[#0f0f0f] border-l border-[#2a2a2a] z-[60] flex flex-col shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a2a] flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: healthColor(partner.health_score) }} />
              <h2 className="text-lg font-bold text-white truncate">{partner.name}</h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span style={{ color: healthColor(partner.health_score) }}>Health {partner.health_score}</span>
              {partner.city && <span className="text-[#555]">📍 {[partner.city, partner.state].filter(Boolean).join(", ")}</span>}
              <span className="text-[#555]">Last contact: {formatRelative(partner.last_contact_at)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors mt-1">
            <X size={20} />
          </button>
        </div>

        {/* Stage Selector */}
        <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
          {STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => updateStage(s.key)}
              className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all ${
                partner.pipeline_status === s.key
                  ? "bg-[#10b981] text-white"
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
          <button onClick={() => quickLog("note")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded-lg hover:text-white hover:border-[#444] transition-colors">
            <FileText size={12} /> Note
          </button>
        </div>
      </div>

      {/* Next Action Banner */}
      {partner.next_action && (
        <div className={`mx-4 mt-3 p-3 rounded-lg border ${urgStyle.bg} border-[#2a2a2a]`}>
          <div className="flex items-center gap-2 mb-1">
            <ChevronRight size={12} className="text-[#10b981]" />
            <span className="text-[10px] text-[#555] uppercase tracking-wider">Next Action</span>
            {urgStyle.label && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${urgStyle.bg} ${urgStyle.text}`}>
                {urgStyle.label}
              </span>
            )}
          </div>
          <p className="text-sm text-white">{partner.next_action}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-[#666]">
            {partner.next_action_due && <span>📅 {formatDate(partner.next_action_due)}</span>}
            {partner.next_action_assignee && <span>👤 {partner.next_action_assignee}</span>}
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
                ? "border-[#10b981] text-[#10b981]"
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#10b981]" />
          </div>
        ) : (
          <>
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#2a2a2a] rounded-lg text-xs text-[#666] hover:text-[#10b981] hover:border-[#10b981]/30 transition-colors"
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
                                  {ix.outcome === "positive" ? "✅" : ix.outcome === "negative" ? "❌" : "➖"} {ix.outcome}
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#2a2a2a] rounded-lg text-xs text-[#666] hover:text-[#10b981] hover:border-[#10b981]/30 transition-colors"
                  >
                    <Plus size={14} /> Add Contact
                  </button>
                )}

                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-[#555] text-xs">
                    No contacts yet. Add your first contact at this company.
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
                                <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-[#10b981]">
                                  <Phone size={10} /> {c.phone}
                                </a>
                              )}
                              {c.email && (
                                <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-[#10b981]">
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#2a2a2a] rounded-lg text-xs text-[#666] hover:text-[#10b981] hover:border-[#10b981]/30 transition-colors"
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
                                {a.due_date && <span className={us.text}>📅 {formatDate(a.due_date)}</span>}
                                {a.assignee && <span>👤 {a.assignee}</span>}
                                {a.priority && (
                                  <span className={a.priority === "high" ? "text-red-400" : a.priority === "medium" ? "text-yellow-400" : "text-[#666]"}>
                                    {a.priority === "high" ? "🔴" : a.priority === "medium" ? "🟡" : "⚪"} {a.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => completeAction(a.id)}
                              className="text-[#555] hover:text-[#10b981] transition-colors"
                              title="Mark complete"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Completed actions */}
                    {actions.filter(a => a.status === "completed").length > 0 && (
                      <>
                        <p className="text-[10px] text-[#555] uppercase tracking-wider pt-2">Completed</p>
                        {actions.filter(a => a.status === "completed").map((a) => (
                          <div key={a.id} className="bg-[#111] rounded-xl p-3 border border-[#1a1a1a] opacity-60">
                            <p className="text-sm text-[#888] line-through">{a.title}</p>
                            <span className="text-[10px] text-[#555]">✅ {formatDate(a.completed_at)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Info Tab */}
            {activeTab === "info" && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Company Details</p>
                  <div className="bg-[#1a1a1a] rounded-xl p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-[#555] flex-shrink-0" />
                      <EditableField value={partner.phone} onSave={(v) => updateField("phone", v)} label="Phone" placeholder="Add phone" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-[#555] flex-shrink-0" />
                      <EditableField value={partner.email} onSave={(v) => updateField("email", v)} label="Email" type="email" placeholder="Add email" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe size={12} className="text-[#555] flex-shrink-0" />
                      <EditableField value={partner.website} onSave={(v) => updateField("website", v)} label="Website" placeholder="Add website" />
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-[#555] flex-shrink-0" />
                      <EditableField value={[partner.city, partner.state].filter(Boolean).join(", ")} onSave={(v) => {
                        const parts = v.split(",").map(s => s.trim());
                        updateField("city", parts[0] || "");
                        if (parts[1]) updateField("state", parts[1]);
                      }} label="Location" placeholder="City, State" />
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div>
                  <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Metrics</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#1a1a1a] rounded-xl p-3">
                      <p className="text-[10px] text-[#555] uppercase mb-0.5">Territory</p>
                      <EditableField value={partner.territory} onSave={(v) => updateField("territory", v)} label="Territory" />
                    </div>
                    <div className="bg-[#1a1a1a] rounded-xl p-3">
                      <p className="text-[10px] text-[#555] uppercase mb-0.5">Medallions Ordered</p>
                      <p className="text-2xl font-bold text-white">{partner.total_medallions_ordered}</p>
                    </div>
                    <div className="bg-[#1a1a1a] rounded-xl p-3">
                      <p className="text-[10px] text-[#555] uppercase mb-0.5">Lead Source</p>
                      <EditableField value={partner.lead_source} onSave={(v) => updateField("lead_source", v)} label="Lead Source" />
                    </div>
                    <div className="bg-[#1a1a1a] rounded-xl p-3">
                      <p className="text-[10px] text-[#555] uppercase mb-0.5">MRR</p>
                      <p className="text-2xl font-bold text-[#10b981]">
                        {typeof partner.mrr === "number" ? `$${partner.mrr}` : partner.mrr || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-[#555] uppercase tracking-wider">Notes</p>
                    {!editingNotes && (
                      <button onClick={() => { setNotesDraft(partner.notes || ""); setEditingNotes(true); }}
                        className="text-[10px] text-[#555] hover:text-[#10b981]">Edit</button>
                    )}
                  </div>
                  {editingNotes ? (
                    <div className="space-y-2">
                      <textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        rows={5}
                        autoFocus
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 text-sm text-white outline-none focus:border-[#10b981] resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingNotes(false)} className="px-3 py-1 text-xs text-[#888]">Cancel</button>
                        <button onClick={saveNotes} className="px-3 py-1 text-xs bg-[#10b981] text-white rounded-lg">Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] min-h-[60px]">
                      <p className="text-sm text-[#aaa] whitespace-pre-wrap">{partner.notes || <span className="text-[#555] italic">No notes yet</span>}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}
