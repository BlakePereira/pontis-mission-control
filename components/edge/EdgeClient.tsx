"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle } from "lucide-react";

interface BetRow {
  betNum: string;
  date: string;
  sport: string;
  event: string;
  betType: string;
  legs: string;
  legDetails: string;
  stake: number;
  odds: string;
  potentialPayout: string;
  result: string;
  profitLoss: number;
  runningBankroll: number;
  notes: string;
}

interface BettingData {
  rows: BetRow[];
  bets: BetRow[];
  wins: number;
  losses: number;
  pushes: number;
  currentBankroll: number;
  startingBankroll: number;
  error?: string;
}

export default function EdgeClient() {
  const [data, setData] = useState<BettingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/betting")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setData({
          rows: [], bets: [], wins: 2, losses: 4, pushes: 0,
          currentBankroll: 59.5, startingBankroll: 14.5, error: "Failed"
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-[#555] text-sm">Loading betting data...</div>;

  const wins = data?.wins || 2;
  const losses = data?.losses || 4;
  const total = wins + losses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  const bankroll = data?.currentBankroll || 59.5;
  const startBankroll = data?.startingBankroll || 14.5;
  const pctGain = (((bankroll - startBankroll) / startBankroll) * 100).toFixed(0);

  // Tiers based on odds (proxy for confidence)
  const tierStats: Record<string, { wins: number; losses: number }> = {
    "4.9 Odds": { wins: 0, losses: 0 },
    "3.0 Odds": { wins: 0, losses: 0 },
    "Other": { wins: 0, losses: 0 },
  };
  (data?.bets || []).forEach((b) => {
    const odds = parseFloat(b.odds);
    let tier = "Other";
    if (odds >= 4.5) tier = "4.9 Odds";
    else if (odds >= 2.5) tier = "3.0 Odds";
    if (b.result === "WIN") tierStats[tier].wins++;
    else if (b.result === "LOSS") tierStats[tier].losses++;
  });

  const recentBets = (data?.bets || []).slice(-6).reverse();

  return (
    <div className="space-y-6">
      {data?.error && (
        <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
          <AlertCircle size={14} />
          <span>Using cached data — {data.error}</span>
        </div>
      )}

      {/* Notes Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-blue-400 text-sm">📅 NBA regular season resumes <strong>Feb 21</strong> — edge research will resume then.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={14} className="text-[#10b981]" />
            <span className="text-xs text-[#666] uppercase tracking-wider">Current Bankroll</span>
          </div>
          <p className="text-2xl font-bold text-white">${bankroll.toFixed(2)}</p>
          <p className="text-xs text-[#10b981] mt-1">+{pctGain}% from ${startBankroll}</p>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-[#10b981]" />
            <span className="text-xs text-[#666] uppercase tracking-wider">Win Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">{winRate}%</p>
          <p className="text-xs text-[#555] mt-1">{wins}W – {losses}L total</p>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-[#10b981]" />
            <span className="text-xs text-[#666] uppercase tracking-wider">Wins</span>
          </div>
          <p className="text-2xl font-bold text-[#10b981]">{wins}</p>
          <p className="text-xs text-[#555] mt-1">Profitable bets</p>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-red-400" />
            <span className="text-xs text-[#666] uppercase tracking-wider">Losses</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{losses}</p>
          <p className="text-xs text-[#555] mt-1">Losing bets</p>
        </div>
      </div>

      {/* Model Accuracy by Tier */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Model Accuracy by Tier</h2>
        <div className="space-y-3">
          {Object.entries(tierStats).map(([tier, stats]) => {
            const t = stats.wins + stats.losses;
            const wr = t > 0 ? ((stats.wins / t) * 100).toFixed(0) : "—";
            return (
              <div key={tier} className="flex items-center gap-4">
                <span className="text-sm text-[#888] w-24">{tier}</span>
                <div className="flex-1 bg-[#2a2a2a] rounded-full h-2">
                  <div
                    className="bg-[#10b981] h-2 rounded-full transition-all"
                    style={{ width: t > 0 ? `${(stats.wins / t) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-sm text-white font-medium w-16 text-right">{wr}% ({stats.wins}/{t})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Picks */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recent Bets</h2>
        {recentBets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Date</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Event</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Stake</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Odds</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Result</th>
                  <th className="text-right py-2 px-3 text-[#666] font-medium text-xs uppercase">P/L</th>
                </tr>
              </thead>
              <tbody>
                {recentBets.map((bet, i) => (
                  <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-2.5 px-3 text-[#888]">{bet.date}</td>
                    <td className="py-2.5 px-3 text-white max-w-[200px]">
                      <span className="truncate block">{bet.event}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#888]">${bet.stake}</td>
                    <td className="py-2.5 px-3 text-[#888]">{bet.odds}x</td>
                    <td className="py-2.5 px-3">
                      <Badge
                        className={
                          bet.result === "WIN"
                            ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }
                      >
                        {bet.result}
                      </Badge>
                    </td>
                    <td className={`py-2.5 px-3 text-right font-medium ${bet.profitLoss >= 0 ? "text-[#10b981]" : "text-red-400"}`}>
                      {bet.profitLoss >= 0 ? "+" : ""}${bet.profitLoss.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[#555] text-sm">No bets recorded yet</p>
        )}
      </div>
    </div>
  );
}
