"use client";

import { useMemo, useState } from "react";
import FulfillmentPipeline from "./FulfillmentPipeline";
import FulfillmentPartnersList from "./FulfillmentPartnersList";
import FulfillmentTasksClient from "./FulfillmentTasksClient";

type TabKey = "pipeline" | "partners" | "tasks" | "coverage";

const tabs: { key: TabKey; label: string; description: string }[] = [
  { key: "pipeline", label: "Pipeline", description: "Fulfillment readiness stages: lead through active, with onboarding and quality signals." },
  { key: "partners", label: "Partners", description: "All fulfillment partners: florists, cleaners, territory, pricing, and contract status." },
  { key: "tasks", label: "Tasks", description: "Overdue tasks, stale follow-ups, and action items for fulfillment partners." },
  { key: "coverage", label: "Coverage", description: "Territory and cemetery coverage gaps (coming soon)." },
];

export default function FulfillmentCRMClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("pipeline");
  const active = useMemo(() => tabs.find((tab) => tab.key === activeTab) || tabs[0], [activeTab]);

  return (
    <div className="space-y-6">
      <div className="border border-[#2a2a2a] rounded-2xl bg-[#0d0d0d] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#2a2a2a] bg-[#0a0a0a]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Fulfillment CRM</h1>
              <p className="text-sm text-[#555] mt-1 max-w-2xl">
                Florist and cleaner network: recruiting, onboarding, territory coverage, and service readiness.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                    activeTab === tab.key
                      ? "bg-[#f97316]/10 border-[#f97316]/30 text-[#f97316]"
                      : "bg-[#111] border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#666] mt-3">{active.description}</p>
        </div>

        <div className="p-6">
          {activeTab === "pipeline" && <FulfillmentPipeline />}
          {activeTab === "partners" && <FulfillmentPartnersList />}
          {activeTab === "tasks" && <FulfillmentTasksClient />}
          {activeTab === "coverage" && (
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-8 max-w-3xl">
              <h2 className="text-xl font-semibold text-white mb-2">Coverage mapping coming next</h2>
              <p className="text-sm text-[#888] leading-relaxed">
                Territory and cemetery coverage analysis will help identify gaps and ensure service readiness across regions.
                For now, coverage notes are visible in partner detail panels.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
