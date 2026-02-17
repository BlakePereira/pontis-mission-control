"use client";

import { Badge } from "@/components/ui/badge";

/* ──────────────────────────────────────────────
   Data
────────────────────────────────────────────── */

const humans = [
  {
    name: "Blake Pereira",
    role: "Co-Founder",
    flags: "🇧🇷🇺🇸",
    location: "Vineyard, UT",
    description: "Driving sales, strategy, and the vision for Pontis.",
  },
  {
    name: "Joe Duerden",
    role: "Co-Founder",
    flags: "",
    location: "",
    description: "Building the future of memorialization.",
  },
];

type StatusType = "online" | "on-demand" | "active" | "available" | "setup";

interface Agent {
  emoji: string;
  name: string;
  title: string;
  description: string;
  model: string;
  status: StatusType;
  children?: Agent[];
}

const claraTree: Agent = {
  emoji: "🌸",
  name: "Clara",
  title: "CSO — Chief Strategy Officer",
  description: "Orchestrates the Pontis agent network. Manages strategy, memory, and operations.",
  model: "claude-sonnet-4-5",
  status: "online",
  children: [
    {
      emoji: "🧠",
      name: "BRAIN",
      title: "Deep Reasoning",
      description: "",
      model: "",
      status: "on-demand",
      children: [
        {
          emoji: "🧠",
          name: "Opus 4.6",
          title: "Complex Reasoning",
          description: "Complex reasoning, strategy, deep thinking",
          model: "anthropic/claude-opus-4-6",
          status: "on-demand",
        },
      ],
    },
    {
      emoji: "💪",
      name: "MUSCLES",
      title: "Execution Agents",
      description: "",
      model: "",
      status: "available",
      children: [
        {
          emoji: "💻",
          name: "Codex",
          title: "Coding",
          description: "Writes, reviews, and debugs code autonomously",
          model: "OpenAI Codex CLI",
          status: "setup",
        },
        {
          emoji: "🔍",
          name: "Gemini",
          title: "Research",
          description: "Web research, competitive analysis, industry trends",
          model: "google/gemini-2.0-flash",
          status: "active",
        },
        {
          emoji: "🎯",
          name: "Sales Scout",
          title: "Prospect Research",
          description: "Researches monument companies, builds prospect profiles, finds contacts",
          model: "claude-sonnet-4-5",
          status: "available",
        },
        {
          emoji: "✍️",
          name: "Content Creator",
          title: "Memorial Pages",
          description: "Drafts memorial copy, marketing materials, family-facing content",
          model: "claude-sonnet-4-5",
          status: "available",
        },
        {
          emoji: "📊",
          name: "Analyst",
          title: "Data & Reporting",
          description: "Runs Stripe/Supabase queries, weekly revenue reports, growth tracking",
          model: "claude-haiku-3-5",
          status: "available",
        },
      ],
    },
  ],
};

/* ──────────────────────────────────────────────
   Status helpers
────────────────────────────────────────────── */

const statusConfig: Record<StatusType, { dot: string; label: string; badgeClass: string }> = {
  online:    { dot: "bg-emerald-400",  label: "🟢 Online",    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  "on-demand": { dot: "bg-yellow-400", label: "🟡 On-demand", badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  active:    { dot: "bg-yellow-400",   label: "🟡 Active",    badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  available: { dot: "bg-yellow-400",   label: "🟡 Available", badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  setup:     { dot: "bg-red-400",      label: "🔴 Setup needed", badgeClass: "bg-red-500/10 text-red-400 border-red-500/20" },
};

/* ──────────────────────────────────────────────
   Agent Card
────────────────────────────────────────────── */

function AgentCard({ agent, isRoot = false }: { agent: Agent; isRoot?: boolean }) {
  const sc = statusConfig[agent.status];
  return (
    <div
      className={`relative rounded-xl border p-4 ${
        isRoot
          ? "bg-[#0f1f16] border-emerald-500/30 shadow-lg shadow-emerald-900/20"
          : "bg-[#161616] border-[#2a2a2a] hover:border-[#3a3a3a]"
      } transition-colors`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{agent.emoji}</span>
          <div>
            <p className={`font-bold ${isRoot ? "text-white text-base" : "text-white text-sm"}`}>{agent.name}</p>
            <p className="text-xs text-[#666]">{agent.title}</p>
          </div>
        </div>
        {/* Status dot */}
        <div className="flex items-center gap-1.5 mt-0.5 shrink-0">
          <span className={`inline-block w-2 h-2 rounded-full ${sc.dot}`} />
          <span className="text-xs text-[#666]">{sc.label}</span>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="text-xs text-[#888] mb-3 italic">&ldquo;{agent.description}&rdquo;</p>
      )}

      {/* Model badge */}
      {agent.model && (
        <Badge className="text-[10px] bg-[#1e1e1e] text-[#777] border-[#333] font-mono">
          {agent.model}
        </Badge>
      )}

      {/* Setup CTA */}
      {agent.status === "setup" && (
        <p className="mt-2 text-[10px] text-red-400/70 italic">→ Ask Clara to activate</p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Org Tree
────────────────────────────────────────────── */

function OrgTree({ agent }: { agent: Agent }) {
  const hasChildren = agent.children && agent.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <AgentCard agent={agent} isRoot={!agent.children?.some((c) => c.children)} />

      {hasChildren && (
        <>
          {/* vertical line down from card */}
          <div className="w-px h-6 bg-[#2a2a2a]" />

          {/* horizontal bar + branches */}
          <div className="relative flex gap-6 items-start">
            {/* horizontal line across all children */}
            {(agent.children?.length ?? 0) > 1 && (
              <div
                className="absolute top-0 left-0 right-0 h-px bg-[#2a2a2a]"
                style={{ width: "100%" }}
              />
            )}

            {agent.children!.map((child, idx) => (
              <div key={idx} className="flex flex-col items-center">
                {/* vertical line down to child card */}
                <div className="w-px h-6 bg-[#2a2a2a]" />
                <OrgTree agent={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Human Card
────────────────────────────────────────────── */

function HumanCard({ human }: { human: (typeof humans)[0] }) {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center text-sm font-bold text-white">
          {human.name.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-white text-sm">{human.name}</p>
          <p className="text-xs text-[#666]">{human.role}{human.flags ? ` · ${human.flags}` : ""}{human.location ? ` · ${human.location}` : ""}</p>
        </div>
      </div>
      <p className="text-xs text-[#888]">{human.description}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Export
────────────────────────────────────────────── */

export default function TeamClient() {
  return (
    <div className="space-y-10">
      {/* Humans */}
      <section>
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-4">
          👥 Founders
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {humans.map((h) => (
            <HumanCard key={h.name} human={h} />
          ))}
        </div>
      </section>

      {/* Agent Network */}
      <section>
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-4">
          🤖 Clara&apos;s Agent Network
        </h2>

        {/* Clara (root) */}
        <div className="flex flex-col items-center">
          {/* Root Clara card — full width-ish */}
          <div className="w-full max-w-sm">
            <AgentCard agent={claraTree} isRoot />
          </div>

          {/* Connector down */}
          <div className="w-px h-8 bg-[#2a2a2a]" />

          {/* Two branches: BRAIN and MUSCLES */}
          <div className="w-full flex flex-col md:flex-row gap-0 items-start justify-center">
            {/* horizontal bar */}
            <div className="hidden md:block absolute" />

            {/* BRAIN branch */}
            <div className="flex-1 flex flex-col items-center">
              {/* branch header */}
              <div className="w-px h-6 bg-[#2a2a2a]" />
              <div className="w-56">
                <div className="bg-[#111] border border-[#222] rounded-lg px-4 py-2 text-center mb-2">
                  <span className="text-sm font-bold text-[#888]">🧠 BRAIN</span>
                </div>
              </div>
              <div className="w-px h-4 bg-[#2a2a2a]" />
              {/* Opus */}
              <div className="w-56">
                <AgentCard agent={claraTree.children![0].children![0]} />
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px min-h-full bg-[#1e1e1e] mx-4 self-stretch" />

            {/* MUSCLES branch */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-px h-6 bg-[#2a2a2a]" />
              <div className="w-72">
                <div className="bg-[#111] border border-[#222] rounded-lg px-4 py-2 text-center mb-2">
                  <span className="text-sm font-bold text-[#888]">💪 MUSCLES</span>
                </div>
              </div>
              <div className="w-px h-4 bg-[#2a2a2a]" />
              <div className="w-72 flex flex-col gap-3">
                {claraTree.children![1].children!.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
