"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, DollarSign, Building2, TrendingUp, Heart, Edit3, Check } from "lucide-react";

interface GoalState {
  streakDays: number;
  portfolio: number;
  datingWeekly: number;
}

const DEFAULT_STATE: GoalState = {
  streakDays: 35,
  portfolio: 12000,
  datingWeekly: 0,
};

function EditableGoal({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const save = () => {
    const n = parseFloat(draft);
    if (!isNaN(n)) onChange(n);
    setEditing(false);
  };

  return editing ? (
    <div className="flex items-center gap-2">
      {prefix && <span className="text-[#888]">{prefix}</span>}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        className="bg-[#0f0f0f] border-[#10b981] text-white h-8 w-28 text-sm"
        autoFocus
      />
      {suffix && <span className="text-[#888]">{suffix}</span>}
      <Button size="sm" onClick={save} className="h-7 w-7 p-0 bg-[#10b981] hover:bg-[#0ea572] text-black">
        <Check size={12} />
      </Button>
    </div>
  ) : (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="group flex items-center gap-1.5 text-2xl font-bold text-white hover:text-[#10b981] transition-colors"
    >
      {prefix}{value.toLocaleString()}{suffix}
      <Edit3 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export default function GoalsClient() {
  const [state, setState] = useState<GoalState>(DEFAULT_STATE);
  const [stripeData, setStripeData] = useState<{ mrr: number; customerCount: number; error?: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load from localStorage
    try {
      const stored = localStorage.getItem("goals-state");
      if (stored) setState(JSON.parse(stored));
    } catch {}
    setLoaded(true);

    // Load Stripe data
    fetch("/api/stripe")
      .then((r) => r.json())
      .then(setStripeData)
      .catch(() => setStripeData({ mrr: 0, customerCount: 0, error: "Failed" }));
  }, []);

  const updateState = (updates: Partial<GoalState>) => {
    const next = { ...state, ...updates };
    setState(next);
    try { localStorage.setItem("goals-state", JSON.stringify(next)); } catch {}
  };

  if (!loaded) return null;

  const mrr = stripeData?.mrr || 0;
  const annualRevenue = mrr * 12;
  const customerCount = stripeData?.customerCount || 0;

  const goals = [
    {
      id: "streak",
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      label: "5K Running Streak",
      sub: "Run 5K every single day",
      value: (
        <EditableGoal
          label="streak"
          value={state.streakDays}
          onChange={(v) => updateState({ streakDays: v })}
          suffix=" days"
        />
      ),
      progress: Math.min((state.streakDays / 365) * 100, 100),
      progressLabel: `${state.streakDays} / 365 days`,
    },
    {
      id: "revenue",
      icon: DollarSign,
      color: "text-[#10b981]",
      bg: "bg-[#10b981]/10",
      label: "Pontis Revenue",
      sub: "Annual recurring revenue goal",
      value: (
        <p className="text-2xl font-bold text-white">
          ${annualRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          <span className="text-[#555] text-base font-normal"> / $100,000</span>
        </p>
      ),
      progress: Math.min((annualRevenue / 100000) * 100, 100),
      progressLabel: `$${annualRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })} / $100,000 ARR`,
    },
    {
      id: "companies",
      icon: Building2,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      label: "Monument Companies",
      sub: "Active Pontis customers",
      value: (
        <p className="text-2xl font-bold text-white">
          {customerCount}
          <span className="text-[#555] text-base font-normal"> / 20 companies</span>
        </p>
      ),
      progress: Math.min((customerCount / 20) * 100, 100),
      progressLabel: `${customerCount} / 20 companies`,
    },
    {
      id: "portfolio",
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      label: "Investment Portfolio",
      sub: "Year-end target: $27,000",
      value: (
        <EditableGoal
          label="portfolio"
          value={state.portfolio}
          onChange={(v) => updateState({ portfolio: v })}
          prefix="$"
        />
      ),
      progress: Math.min((state.portfolio / 27000) * 100, 100),
      progressLabel: `$${state.portfolio.toLocaleString()} / $27,000`,
    },
    {
      id: "dating",
      icon: Heart,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      label: "Dating Goal",
      sub: "Ask someone out ~1x/week",
      value: (
        <EditableGoal
          label="dating"
          value={state.datingWeekly}
          onChange={(v) => updateState({ datingWeekly: Math.round(v) })}
          suffix=" this week"
        />
      ),
      progress: Math.min(state.datingWeekly * 100, 100),
      progressLabel: `${state.datingWeekly} / 1 this week`,
    },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-xs text-[#555] mb-2">
        💡 Click any editable value to update it. Stored locally in your browser.
      </p>

      {goals.map((goal) => (
        <div key={goal.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl ${goal.bg} flex-shrink-0`}>
              <goal.icon size={20} className={goal.color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-[#666] uppercase tracking-wider mb-1">{goal.label}</p>
                  {goal.value}
                  <p className="text-xs text-[#555] mt-1">{goal.sub}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-[#555] mb-1">
                  <span>{goal.progressLabel}</span>
                  <span>{goal.progress.toFixed(1)}%</span>
                </div>
                <Progress value={goal.progress} className="h-1.5 bg-[#2a2a2a]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
