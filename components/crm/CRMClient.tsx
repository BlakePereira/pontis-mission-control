"use client";

import { useMemo, useState } from "react";
import SalesFunnelClient from "@/components/sales-funnel/SalesFunnelClient";
import PartnersClient from "@/components/partners/PartnersClient";
import CRMTasksClient from "@/components/crm/CRMTasksClient";

type TabKey = "pipeline" | "accounts" | "tasks" | "analytics";

const tabs: { key: TabKey; label: string; description: string }[] = [
  { key: "pipeline", label: "Pipeline", description: "Stage movement, follow-up visibility, and active funnel momentum." },
  { key: "accounts", label: "Accounts", description: "Tracked companies, contacts, activity, and account-level CRM records." },
  { key: "tasks", label: "Tasks", description: "Overdue tasks, due-soon action items, and stale follow-up cleanup." },
  { key: "analytics", label: "Analytics", description: "Lightweight placeholder while the core workflow consolidates." },
];

export default function CRMClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("pipeline");
  const active = useMemo(() => tabs.find((tab) => tab.key === activeTab) || tabs[0], [activeTab]);

  return (
    <div className="space-y-6">
      <div className="border border-[#2a2a2a] rounded-2xl bg-[#0d0d0d] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#2a2a2a] bg-[#0a0a0a]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">CRM</h1>
              <p className="text-sm text-[#555] mt-1 max-w-2xl">
                Monument-company CRM for pipeline, accounts, and action discipline. Fulfillment partners now live in their own separate CRM.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                    activeTab === tab.key
                      ? "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]"
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
          {activeTab === "pipeline" && <SalesFunnelClient embedded />}
          {activeTab === "accounts" && <PartnersClient embedded partnerMode="monument_company" />}
          {activeTab === "tasks" && <CRMTasksClient />}
          {activeTab === "analytics" && (
            <div className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-8 max-w-3xl">
              <h2 className="text-xl font-semibold text-white mb-2">Analytics coming next</h2>
              <p className="text-sm text-[#888] leading-relaxed">
                I left this intentionally lightweight. Right now the higher-value move is consolidating navigation, exposing action items, and improving follow-up discipline before adding a bigger analytics surface.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
