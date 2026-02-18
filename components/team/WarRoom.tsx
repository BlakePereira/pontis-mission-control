"use client";

import { createClient, type RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

interface Agent {
  emoji: string;
  name: string;
  title: string;
  model: string;
  zone: string;
  status: "online" | "working" | "on-demand" | "available";
  color: {
    bg: string;
    border: string;
    shadow: string;
    dot: string;
    avatarGradient: string;
    text: string;
  };
  activities: string[];
  completedTasks: string[];
  capabilities: string;
  isRoot?: boolean;
}

interface AgentActivityRow {
  agent_name: string;
  status: Agent["status"];
  current_task: string | null;
}

const founders = [
  {
    name: "Blake Pereira",
    role: "Co-Founder",
    flags: "🇧🇷🇺🇸",
    location: "Vineyard, UT",
    bio: "Strategy, sales & vision",
  },
  {
    name: "Joe Duerden",
    role: "Co-Founder",
    flags: "🤝",
    location: "",
    bio: "Product, operations & mission",
  },
];

const codexTerminalLines = [
  "Building WarRoom.tsx...",
  "npx tsc --noEmit ✓",
  "git push origin staging",
  "Running test suite...",
  "Analyzing diff: 847 lines",
];

const agents: Agent[] = [
  {
    emoji: "🌸",
    name: "Clara",
    title: "CSO — Chief Strategy Officer",
    model: "claude-sonnet-4-5",
    zone: "Command Center",
    status: "online",
    isRoot: true,
    color: {
      bg: "bg-[#0a1f12]",
      border: "border-emerald-500/30",
      shadow: "shadow-emerald-500/20",
      dot: "bg-emerald-400 animate-pulse",
      avatarGradient: "from-emerald-600 to-emerald-400",
      text: "text-emerald-400",
    },
    activities: [
      "Orchestrating agent network",
      "Reviewing Pontis strategy",
      "Monitoring kanban board",
      "Reading memory & context",
      "Coordinating sprint priorities",
    ],
    completedTasks: [
      "Built War Room visualization (Feb 17)",
      "Analyzed Pontis codebase — 22KB report (Feb 14)",
      "Researched 149 monument companies overnight (Feb 10)",
    ],
    capabilities: "Strategy, memory, orchestration, sub-agent coordination",
  },
  {
    emoji: "🧠",
    name: "Opus",
    title: "Deep Reasoning Engine",
    model: "claude-opus-4-6",
    zone: "Brain Vault",
    status: "on-demand",
    color: {
      bg: "bg-[#0e0e1f]",
      border: "border-indigo-500/30",
      shadow: "shadow-indigo-500/20",
      dot: "bg-indigo-400",
      avatarGradient: "from-indigo-600 to-purple-500",
      text: "text-indigo-400",
    },
    activities: [
      "Deep strategic reasoning",
      "Formulating go-to-market plan",
      "Analyzing complex decisions",
      "On standby — ready to engage",
      "Processing multi-step problem",
    ],
    completedTasks: [
      "Designed War Room creative concept (Feb 17)",
      "Built Pontis business strategy framework (Feb 12)",
      "Analyzed monument industry positioning (Feb 8)",
    ],
    capabilities: "Complex reasoning, strategy, multi-step analysis",
  },
  {
    emoji: "💻",
    name: "Codex",
    title: "Autonomous Coder",
    model: "gpt-5.3-codex (ChatGPT Plus)",
    zone: "Code Forge",
    status: "working",
    color: {
      bg: "bg-[#0a1a0a]",
      border: "border-green-500/30",
      shadow: "shadow-green-500/20",
      dot: "bg-green-400 animate-[blink_1s_step-end_infinite]",
      avatarGradient: "from-green-700 to-green-400",
      text: "text-green-400",
    },
    activities: [
      "Building War Room visualization",
      "Refactoring auth module",
      "Running test suite",
      "Reviewing staging branch PRs",
      "Fixing edge function bugs",
    ],
    completedTasks: [
      "Built War Room office visualization (Feb 17)",
      "Set up Codex CLI integration (Feb 17)",
      "Refactored kanban API routes (Feb 15)",
    ],
    capabilities: "Code generation, PR review, debugging, autonomous file edits",
  },
  {
    emoji: "🔍",
    name: "Gemini",
    title: "Research Agent",
    model: "gemini-2.0-flash",
    zone: "Research Lab",
    status: "working",
    color: {
      bg: "bg-[#080e1a]",
      border: "border-sky-500/30",
      shadow: "shadow-sky-500/20",
      dot: "bg-sky-400 animate-pulse",
      avatarGradient: "from-sky-600 to-cyan-400",
      text: "text-sky-400",
    },
    activities: [
      "Scanning monument company landscape",
      "Researching competitor pricing",
      "Reading industry reports",
      "Finding market trends",
      "Analyzing prospect database",
    ],
    completedTasks: [
      "Researched 23 Texas monument companies (Feb 16)",
      "Competitor pricing analysis: 8 companies (Feb 14)",
      "Monument industry trends report (Feb 11)",
    ],
    capabilities: "Web research, competitive analysis, market intelligence",
  },
  {
    emoji: "🎯",
    name: "Sales Scout",
    title: "Prospect Research",
    model: "claude-sonnet-4-5",
    zone: "Sales Floor",
    status: "available",
    color: {
      bg: "bg-[#1a0e00]",
      border: "border-amber-500/30",
      shadow: "shadow-amber-500/20",
      dot: "bg-amber-400",
      avatarGradient: "from-amber-600 to-orange-400",
      text: "text-amber-400",
    },
    activities: [
      "Building prospect list",
      "Researching Pierce Memorial",
      "Finding decision maker contacts",
      "Scoring leads by fit score",
      "On standby — waiting for assignment",
    ],
    completedTasks: [
      "Built 149-company prospect database (Feb 10)",
      "Researched Pierce Monument — full profile (Feb 15)",
      "Found 12 Utah monument company contacts (Feb 13)",
    ],
    capabilities: "Lead research, prospect profiling, contact discovery",
  },
  {
    emoji: "✍️",
    name: "Content Creator",
    title: "Memorial Content",
    model: "claude-sonnet-4-5",
    zone: "Content Studio",
    status: "available",
    color: {
      bg: "bg-[#130a1a]",
      border: "border-purple-500/30",
      shadow: "shadow-purple-500/20",
      dot: "bg-purple-400",
      avatarGradient: "from-purple-700 to-violet-400",
      text: "text-purple-400",
    },
    activities: [
      "Drafting memorial page copy",
      "Writing sales proposal",
      "Creating email sequence",
      "Editing family-facing content",
      "On standby — awaiting brief",
    ],
    completedTasks: [
      "Wrote 3 memorial page templates (Feb 16)",
      "Drafted monument company pitch deck copy (Feb 14)",
      "Built email nurture sequence — 5 emails (Feb 12)",
    ],
    capabilities: "Memorial copy, sales proposals, email sequences, family content",
  },
  {
    emoji: "📊",
    name: "Analyst",
    title: "Data & Reporting",
    model: "claude-haiku-4-5",
    zone: "Data Room",
    status: "available",
    color: {
      bg: "bg-[#080e0e]",
      border: "border-teal-500/30",
      shadow: "shadow-teal-500/20",
      dot: "bg-teal-400",
      avatarGradient: "from-teal-700 to-cyan-400",
      text: "text-teal-400",
    },
    activities: [
      "Running Stripe revenue report",
      "Querying Supabase analytics",
      "Calculating weekly MRR",
      "Building dashboard metrics",
      "On standby — request a report",
    ],
    completedTasks: [
      "Weekly revenue report: $2,340 MRR (Feb 16)",
      "Supabase user cohort analysis (Feb 14)",
      "Stripe payout reconciliation (Feb 10)",
    ],
    capabilities: "Stripe analytics, Supabase queries, revenue tracking, dashboards",
  },
];

function ModelTierBadge({ model }: { model: string }) {
  const m = model.toLowerCase();
  if (m.includes("opus")) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        OPUS · Deep Reasoning
      </span>
    );
  }
  if (m.includes("haiku")) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-teal-950/60 border border-teal-500/30 text-teal-300 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
        HAIKU · Fast &amp; Efficient
      </span>
    );
  }
  if (m.includes("sonnet")) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        SONNET · Balanced
      </span>
    );
  }
  // Non-Claude models (Codex, Gemini)
  return (
    <span className="text-[#737373] font-mono truncate">{model}</span>
  );
}

interface AgentStationProps {
  agent: Agent;
  isWide?: boolean;
  liveStatus?: { status: string; current_task: string | null } | null;
}

function AgentStation({ agent, liveStatus }: AgentStationProps) {
  const [expanded, setExpanded] = useState(false);
  const [activityIdx, setActivityIdx] = useState(0);
  const [fade, setFade] = useState(true);
  const [terminalIdx, setTerminalIdx] = useState(0);
  const currentStatus = liveStatus?.status ?? agent.status;

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setActivityIdx((i) => (i + 1) % agent.activities.length);
        setFade(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [agent.activities.length]);

  useEffect(() => {
    if (agent.name !== "Codex") {
      return;
    }

    const interval = setInterval(() => {
      setTerminalIdx((i) => (i + 1) % codexTerminalLines.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [agent.name]);

  return (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className={`w-full text-left rounded-xl border p-4 md:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${agent.color.bg} ${agent.color.border} ${agent.color.shadow} ${agent.isRoot ? "ring-1 ring-emerald-400/20" : ""}`}
      aria-expanded={expanded}
      aria-label={`${agent.name} station`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`h-11 w-11 shrink-0 rounded-full bg-gradient-to-br ${agent.color.avatarGradient} flex items-center justify-center text-lg shadow-lg`}
          >
            {agent.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold leading-tight truncate">{agent.name}</p>
            <p className="text-[11px] text-[#9a9a9a] leading-tight truncate">{agent.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <span className={`h-2.5 w-2.5 rounded-full ${agent.color.dot}`} />
          <span className={`text-[11px] uppercase tracking-wide font-medium ${agent.color.text}`}>
            {currentStatus}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[10px]">
        <ModelTierBadge model={agent.model} />
        <span className="text-[#6f6f6f] uppercase tracking-wide truncate">{agent.zone}</span>
      </div>

      {liveStatus?.current_task && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">Live: {liveStatus.current_task}</span>
        </div>
      )}

      <p
        className={`${liveStatus?.current_task ? "mt-1" : "mt-3"} text-sm text-[#d0d0d0] transition-opacity duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        {agent.activities[activityIdx]}
      </p>

      {agent.name === "Codex" && (
        <div className="mt-2 bg-black/50 border border-green-900/50 rounded p-2 font-mono text-[10px] text-green-400/80">
          <div>$ {codexTerminalLines[terminalIdx]}</div>
          <div className="opacity-60">▌</div>
        </div>
      )}

      {expanded && (
        <div className="mt-4 border-t border-white/10 pt-3 text-xs text-[#cbcbcb] space-y-2 animate-[fadeIn_220ms_ease-out]">
          <p className="font-mono text-[#7f7f7f]">─── Activity Log ──────────</p>
          {agent.completedTasks.map((task) => (
            <p key={task}>✓ {task}</p>
          ))}
          <p className="font-mono text-[#7f7f7f] pt-1">─── Capabilities ──────────</p>
          <p>{agent.capabilities}</p>
        </div>
      )}
    </button>
  );
}

function FounderCard({ founder }: { founder: (typeof founders)[number] }) {
  return (
    <div className="rounded-xl border border-[#2d2d2d] bg-[#141414] p-4 transition-colors hover:border-[#414141]">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-[#272727] text-white font-semibold flex items-center justify-center">
          {founder.name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-white font-semibold truncate">{founder.name}</p>
          <p className="text-[11px] text-[#8a8a8a] truncate">
            {founder.role}
            {founder.flags ? ` · ${founder.flags}` : ""}
            {founder.location ? ` · ${founder.location}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-2 text-xs text-[#9c9c9c]">{founder.bio}</p>
    </div>
  );
}

export default function WarRoom() {
  const [liveStatus, setLiveStatus] = useState<
    Record<string, { status: string; current_task: string | null }>
  >({});

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase
      .from("agent_activity")
      .select("agent_name,status,current_task")
      .then(({ data }) => {
        if (!data) {
          return;
        }

        const map: Record<string, { status: string; current_task: string | null }> = {};
        (data as AgentActivityRow[]).forEach((row) => {
          map[row.agent_name] = { status: row.status, current_task: row.current_task };
        });
        setLiveStatus(map);
      });

    const channel = supabase
      .channel("agent-activity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_activity" },
        (payload: RealtimePostgresChangesPayload<AgentActivityRow>) => {
          if (payload.eventType === "DELETE") {
            const deletedName = payload.old?.agent_name;
            if (deletedName) {
              setLiveStatus((prev) => {
                const next = { ...prev };
                delete next[deletedName];
                return next;
              });
            }
            return;
          }

          const row = payload.new;
          if (!row?.agent_name) {
            return;
          }

          setLiveStatus((prev) => ({
            ...prev,
            [row.agent_name]: { status: row.status, current_task: row.current_task },
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const clara = agents.find((agent) => agent.name === "Clara");
  const opus = agents.find((agent) => agent.name === "Opus");
  const codex = agents.find((agent) => agent.name === "Codex");
  const remainingAgents = agents.filter(
    (agent) =>
      agent.name !== "Clara" && agent.name !== "Opus" && agent.name !== "Codex"
  );

  if (!clara || !opus || !codex) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#262626] bg-[radial-gradient(circle_at_15%_10%,rgba(16,68,45,0.25),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(42,54,97,0.2),transparent_35%),#0b0b0b] p-4 md:p-6 space-y-6">
      <div className="rounded-xl border border-emerald-500/20 bg-[#0d1310] p-4">
        <div className="flex items-center gap-3">
          <span className="text-lg">⚔️ The War Room · Live</span>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <p className="text-sm text-[#8ea697] mt-1">Pontis Agent Network</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
          <span className="text-[9px] uppercase tracking-widest text-[#555] mr-1">Model Tiers</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-teal-950/60 border border-teal-500/30 text-teal-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />HAIKU · Fast &amp; Efficient
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />SONNET · Balanced
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />OPUS · Deep Reasoning
          </span>
        </div>
      </div>

      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#6f6f6f]">Founders</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {founders.map((founder) => (
            <FounderCard key={founder.name} founder={founder} />
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-[#262626]" />
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#6f6f6f]">⚔️ The War Room</p>
        <div className="h-px flex-1 bg-[#262626]" />
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-400/80 mb-2">Command Desk</p>
          <AgentStation agent={clara} liveStatus={liveStatus[clara.name] ?? null} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AgentStation agent={opus} liveStatus={liveStatus[opus.name] ?? null} />
          <AgentStation agent={codex} liveStatus={liveStatus[codex.name] ?? null} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {remainingAgents.map((agent) => (
            <AgentStation key={agent.name} agent={agent} liveStatus={liveStatus[agent.name] ?? null} />
          ))}
        </div>
      </section>
    </div>
  );
}
