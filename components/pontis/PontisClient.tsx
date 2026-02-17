"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, DollarSign, Users, TrendingUp, BarChart2 } from "lucide-react";

interface MonthRevenue {
  key: string;
  label: string;
  revenue: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  created: number;
  subscriptionStatus: string;
}

interface StripeData {
  mrr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  customerCount: number;
  monthlyRevenue: MonthRevenue[];
  customers: Customer[];
  error?: string;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-[#10b981]" />
        <span className="text-xs text-[#666] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-[#555] mt-1">{sub}</p>}
    </div>
  );
}

export default function PontisClient() {
  const [data, setData] = useState<StripeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stripe")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setData({
          mrr: 0, totalRevenue: 0, activeSubscriptions: 0,
          customerCount: 0, monthlyRevenue: [], customers: [],
          error: "Failed to load Stripe data"
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-[#555] text-sm">Loading Stripe data...</div>;
  }

  const mrr = data?.mrr || 0;
  const annualRevenue = mrr * 12;
  const goalProgress = Math.min((annualRevenue / 100000) * 100, 100);
  const avgRevPerCustomer = data?.customerCount
    ? mrr / data.customerCount
    : 0;

  return (
    <div className="space-y-6">
      {data?.error && (
        <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
          <AlertCircle size={14} />
          <span>Stripe API: {data.error}. Showing placeholder data.</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="MRR"
          value={`$${mrr.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Monthly recurring revenue"
          icon={DollarSign}
        />
        <StatCard
          label="Total Revenue"
          value={`$${(data?.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Last 6 months"
          icon={TrendingUp}
        />
        <StatCard
          label="Active Subscriptions"
          value={String(data?.activeSubscriptions || 0)}
          sub="Paying customers"
          icon={BarChart2}
        />
        <StatCard
          label="Avg Rev / Customer"
          value={`$${avgRevPerCustomer.toFixed(2)}`}
          sub="MRR / total customers"
          icon={Users}
        />
      </div>

      {/* Goal Progress */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">Annual Revenue Goal</h2>
          <span className="text-[#10b981] font-bold">${annualRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })} / $100,000</span>
        </div>
        <Progress value={goalProgress} className="h-3 bg-[#2a2a2a] mb-2" />
        <p className="text-xs text-[#555]">{goalProgress.toFixed(1)}% of annual goal • {goalProgress < 100 ? `$${(100000 - annualRevenue).toLocaleString("en-US", { maximumFractionDigits: 0 })} remaining` : "Goal reached! 🎉"}</p>
      </div>

      {/* MRR Chart */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Revenue — Last 6 Months</h2>
        {data?.monthlyRevenue && data.monthlyRevenue.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthlyRevenue} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="label" tick={{ fill: "#666", fontSize: 12 }} />
              <YAxis tick={{ fill: "#666", fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
                formatter={(v: unknown) => [`$${(v as number).toFixed(2)}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-[#555] text-sm">
            No revenue data available
          </div>
        )}
      </div>

      {/* Customer List */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Customers ({data?.customerCount || 0})</h2>
        {data?.customers && data.customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Name</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Email</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Joined</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.customers.map((c) => (
                  <tr key={c.id} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-2.5 px-3 text-white">{c.name}</td>
                    <td className="py-2.5 px-3 text-[#888]">{c.email}</td>
                    <td className="py-2.5 px-3 text-[#666]">
                      {new Date(c.created * 1000).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        className={
                          c.subscriptionStatus === "active"
                            ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20"
                            : "bg-[#2a2a2a] text-[#666] border-[#3a3a3a]"
                        }
                      >
                        {c.subscriptionStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[#555] text-sm">No customers found</p>
        )}
      </div>
    </div>
  );
}
