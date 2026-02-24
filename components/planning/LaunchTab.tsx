"use client";

import { Activity, CheckCircle2, Circle, AlertCircle } from "lucide-react";

interface LaunchKPI {
  label: string;
  current: number;
  target: number;
  unit?: string;
  status: "good" | "warning" | "critical";
}

interface GateMilestone {
  id: string;
  title: string;
  completed: boolean;
  blockers?: string[];
}

interface Gate {
  number: 1 | 2 | 3;
  title: string;
  dateRange: string;
  status: "pending" | "active" | "completed";
  milestones: GateMilestone[];
  daysRemaining?: number;
}

export default function LaunchTab() {
  // Live KPIs
  const kpis: LaunchKPI[] = [
    { label: "Companies Signed", current: 4, target: 5, status: "warning" },
    { label: "Medallions Installed", current: 0, target: 50, status: "critical" },
    { label: "Activation Rate", current: 0, target: 20, unit: "%", status: "critical" },
    { label: "Reorders", current: 0, target: 1, status: "critical" },
    { label: "MRR", current: 0, target: 0, unit: "$", status: "good" },
    { label: "Support Load", current: 0, target: 2, unit: "hrs/day", status: "good" },
  ];

  const gates: Gate[] = [
    {
      number: 1,
      title: "Proof of Concept",
      dateRange: "March 1-24, 2026",
      status: "active",
      daysRemaining: 6,
      milestones: [
        { id: "g1-m1", title: "5+ paying monument companies (actual orders)", completed: false },
        { id: "g1-m2", title: "50+ medallions installed in real cemeteries", completed: false },
        { id: "g1-m3", title: "20%+ family activation rate (10+ active memorials)", completed: false },
        { id: "g1-m4", title: "1 company reorders (proves the cycle works)", completed: false },
        { id: "g1-m5", title: "Fulfillment partner network live (flowers + cleaning delivered)", completed: false },
      ],
    },
    {
      number: 2,
      title: "Repeatable Model",
      dateRange: "March 25 - April 21, 2026",
      status: "pending",
      milestones: [
        { id: "g2-m1", title: "10+ companies with 2nd order placed", completed: false },
        { id: "g2-m2", title: "40%+ activation rate (UX bottlenecks fixed)", completed: false },
        { id: "g2-m3", title: "5%+ subscription conversion (families paying for services)", completed: false },
        { id: "g2-m4", title: "CI/CD pipeline works (ship fixes fast)", completed: false },
        { id: "g2-m5", title: "Support load manageable (<2 hrs/day)", completed: false },
      ],
    },
    {
      number: 3,
      title: "Ready to Scale",
      dateRange: "April 22 - May 19, 2026",
      status: "pending",
      milestones: [
        { id: "g3-m1", title: "One company doing 100+ units (back-catalog outreach worked)", completed: false },
        { id: "g3-m2", title: "$5k+ MRR from Utah alone (proves unit economics)", completed: false },
        { id: "g3-m3", title: "Churn < 10% (companies aren't bailing)", completed: false },
        { id: "g3-m4", title: "Onboarding playbook validated (know what works)", completed: false },
        { id: "g3-m5", title: "Support handoff ready (not founder-dependent)", completed: false },
      ],
    },
  ];

  const activeGate = gates.find((g) => g.status === "active") || gates[0];
  const completedCount = activeGate.milestones.filter((m) => m.completed).length;
  const totalCount = activeGate.milestones.length;
  const gateProgress = (completedCount / totalCount) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/20 to-emerald-800/10 border border-emerald-800/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">🚀 Utah Launch & Validation</h2>
            <p className="text-sm text-emerald-300">
              8-12 week sprint to validate model before Pennsylvania expansion
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">Gate {activeGate.number}</p>
            <p className="text-xs text-[#999]">{activeGate.dateRange}</p>
            {activeGate.daysRemaining !== undefined && (
              <p className="text-sm text-emerald-400 mt-1">
                {activeGate.daysRemaining} days remaining
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Live KPI Dashboard */}
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-emerald-400" />
          <h3 className="text-white font-semibold">Live KPIs</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((kpi) => {
            const percentage = (kpi.current / kpi.target) * 100;
            const statusColor =
              kpi.status === "good"
                ? "text-emerald-400"
                : kpi.status === "warning"
                  ? "text-amber-400"
                  : "text-red-400";
            const barColor =
              kpi.status === "good"
                ? "bg-emerald-500"
                : kpi.status === "warning"
                  ? "bg-amber-500"
                  : "bg-red-500";

            return (
              <div key={kpi.label} className="bg-[#0a0a0a] rounded-lg p-3 border border-[#222]">
                <p className="text-[10px] uppercase tracking-wider text-[#666] mb-1">
                  {kpi.label}
                </p>
                <p className={`text-xl font-bold ${statusColor} tabular-nums`}>
                  {kpi.current}
                  {kpi.unit || ""}
                </p>
                <p className="text-xs text-[#555] mb-2">
                  of {kpi.target}
                  {kpi.unit || ""}
                </p>
                <div className="h-1 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all duration-300`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Gate Focus */}
      <div className="bg-[#111] border border-emerald-800/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-lg">
              Gate {activeGate.number}: {activeGate.title}
            </h3>
            <p className="text-sm text-[#999]">{activeGate.dateRange}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#999]">Progress</p>
            <p className="text-2xl font-bold text-emerald-400">
              {completedCount}/{totalCount}
            </p>
          </div>
        </div>

        <div className="h-3 w-full bg-[#0a0a0a] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${gateProgress}%` }}
          />
        </div>

        <div className="space-y-2">
          {activeGate.milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="flex items-start gap-3 p-3 bg-[#0a0a0a] rounded-lg border border-[#222] hover:border-[#333] transition-colors"
            >
              {milestone.completed ? (
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Circle size={20} className="text-[#555] shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    milestone.completed ? "text-[#999] line-through" : "text-white"
                  }`}
                >
                  {milestone.title}
                </p>
                {milestone.blockers && milestone.blockers.length > 0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <AlertCircle size={12} className="text-amber-400" />
                    <p className="text-xs text-amber-400">
                      Blocked: {milestone.blockers.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Gates Roadmap */}
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
        <h3 className="text-white font-semibold mb-4">Full Roadmap to Pennsylvania Expansion</h3>
        <div className="space-y-4">
          {gates.map((gate, idx) => {
            const gateCompleted = gate.milestones.filter((m) => m.completed).length;
            const gateTotal = gate.milestones.length;
            const gatePercentage = (gateCompleted / gateTotal) * 100;

            return (
              <div key={gate.number} className="relative">
                {idx < gates.length - 1 && (
                  <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-[#2a2a2a]" />
                )}
                <div
                  className={`p-4 rounded-lg border ${
                    gate.status === "active"
                      ? "bg-emerald-900/10 border-emerald-800/30"
                      : gate.status === "completed"
                        ? "bg-[#0a0a0a] border-emerald-700/20"
                        : "bg-[#0a0a0a] border-[#222]"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        gate.status === "active"
                          ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500"
                          : gate.status === "completed"
                            ? "bg-emerald-900/30 text-emerald-300 border-2 border-emerald-700"
                            : "bg-[#1a1a1a] text-[#666] border-2 border-[#333]"
                      }`}
                    >
                      {gate.number}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">{gate.title}</h4>
                      <p className="text-xs text-[#999]">{gate.dateRange}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#999]">
                        {gateCompleted}/{gateTotal}
                      </p>
                      {gate.status === "active" && gate.daysRemaining !== undefined && (
                        <p className="text-xs text-emerald-400">{gate.daysRemaining}d left</p>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        gate.status === "completed"
                          ? "bg-emerald-500"
                          : gate.status === "active"
                            ? "bg-emerald-500"
                            : "bg-[#333]"
                      } transition-all duration-300`}
                      style={{ width: `${gatePercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pennsylvania Expansion Unlock */}
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[#2a2a2a]" />
            <div className="p-4 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-[#1a1a1a] text-[#666] border-2 border-[#333]">
                  🚀
                </div>
                <div>
                  <h4 className="text-white font-semibold">Pennsylvania Expansion</h4>
                  <p className="text-xs text-[#999]">May 2026 (unlocks after Gate 3)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
