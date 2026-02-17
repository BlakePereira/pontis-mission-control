"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Building2,
  ListChecks,
  Bot,
  AlertCircle,
  Activity,
} from "lucide-react";

interface StripeData {
  mrr: number;
  customerCount: number;
  activeSubscriptions: number;
  error?: string;
}

interface LoopData {
  content: string;
  error?: string;
}

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
  children,
  error,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  children?: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#3a3a3a] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${accent || "bg-[#10b981]/10"}`}>
            <Icon size={16} className={error ? "text-red-400" : "text-[#10b981]"} />
          </div>
          <span className="text-xs text-[#666] uppercase tracking-wider">{title}</span>
        </div>
        {error && <AlertCircle size={14} className="text-yellow-500" />}
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {sub && <p className="text-xs text-[#555]">{sub}</p>}
      {children}
    </div>
  );
}

/**
 * Count unchecked items only from the "## Pontis" section of open-loops.md.
 * Stops counting when it hits another "## " heading.
 */
function countPontisOpenLoops(content: string): number {
  const lines = content.split("\n");
  let inPontis = false;
  let count = 0;
  for (const line of lines) {
    if (line.match(/^##\s+Pontis/)) {
      inPontis = true;
      continue;
    }
    if (inPontis && line.match(/^##\s+/)) {
      // Hit a new H2 section — stop
      break;
    }
    if (inPontis && line.match(/^- \[ \]/)) {
      count++;
    }
  }
  return count;
}

export default function DashboardClient() {
  const [stripe, setStripe] = useState<StripeData | null>(null);
  const [loops, setLoops] = useState<LoopData | null>(null);
  const [heartbeat] = useState(new Date());

  useEffect(() => {
    fetch("/api/stripe")
      .then((r) => r.json())
      .then(setStripe)
      .catch(() => setStripe({ mrr: 0, customerCount: 0, activeSubscriptions: 0, error: "Failed" }));

    fetch("/api/loops")
      .then((r) => r.json())
      .then(setLoops)
      .catch(() => setLoops({ content: "", error: "Failed" }));
  }, []);

  const mrr = stripe?.mrr || 0;
  const goalAmount = 100000;
  const annualRevenue = mrr * 12;
  const goalProgress = Math.min((annualRevenue / goalAmount) * 100, 100);

  const openLoopCount = loops ? countPontisOpenLoops(loops.content) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
      {/* Pontis MRR */}
      <MetricCard
        title="Pontis MRR"
        value={
          stripe
            ? `$${mrr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "Loading..."
        }
        sub={`Annual run rate: $${(mrr * 12).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        icon={DollarSign}
        error={!!stripe?.error}
      >
        <div className="mt-3">
          <div className="flex justify-between text-xs text-[#555] mb-1">
            <span>Goal: $100k ARR</span>
            <span>{goalProgress.toFixed(1)}%</span>
          </div>
          <Progress value={goalProgress} className="h-1.5 bg-[#2a2a2a]" />
        </div>
      </MetricCard>

      {/* Monument Companies */}
      <MetricCard
        title="Monument Companies"
        value={stripe ? String(stripe.customerCount) : "—"}
        sub={`${stripe?.activeSubscriptions || 0} active subscriptions • Goal: 20`}
        icon={Building2}
        error={!!stripe?.error}
      >
        <div className="mt-3">
          <div className="flex justify-between text-xs text-[#555] mb-1">
            <span>Goal: 20 companies</span>
            <span>{Math.min(((stripe?.customerCount || 0) / 20) * 100, 100).toFixed(0)}%</span>
          </div>
          <Progress
            value={Math.min(((stripe?.customerCount || 0) / 20) * 100, 100)}
            className="h-1.5 bg-[#2a2a2a]"
          />
        </div>
      </MetricCard>

      {/* Open Loops — Pontis only */}
      <MetricCard
        title="Open Loops"
        value={loops ? String(openLoopCount) : "—"}
        sub="Unchecked items in Pontis section"
        icon={ListChecks}
        accent="bg-blue-500/10"
        error={!!loops?.error}
      >
        <div className="mt-3">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
            {openLoopCount > 0 ? `${openLoopCount} need attention` : "All clear ✓"}
          </Badge>
        </div>
      </MetricCard>

      {/* Clara Status */}
      <MetricCard
        title="Clara Status"
        value="Online — Monitoring"
        sub={`Last heartbeat: ${heartbeat.toLocaleTimeString()}`}
        icon={Bot}
        accent="bg-[#10b981]/10"
      >
        <div className="mt-3 flex gap-2 flex-wrap">
          <Badge className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20 text-xs">
            ● Active
          </Badge>
          <Badge className="bg-[#2a2a2a] text-[#888] border-[#3a3a3a] text-xs">
            Since Jan 27, 2026
          </Badge>
        </div>
      </MetricCard>

      {/* Clara's Focus */}
      <MetricCard
        title="Clara's Focus"
        value="Monitoring"
        sub="Next: Daily Brief at 6:00 AM MT"
        icon={Activity}
        accent="bg-purple-500/10"
      >
        <div className="mt-3 flex gap-2 flex-wrap">
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
            ● Strategy Mode
          </Badge>
        </div>
      </MetricCard>
    </div>
  );
}
