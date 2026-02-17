"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Bot, Clock } from "lucide-react";

interface SkillsData {
  content: string;
  error?: string;
}

interface SkillRow {
  priority: string;
  skill: string;
  why: string;
}

const CRON_JOBS = [
  {
    name: "Daily Morning Brief",
    schedule: "0 6 * * *",
    timezone: "America/Denver",
    lastRun: "Today 6:01 AM",
    status: "active",
  },
  {
    name: "Clara's Edge Research",
    schedule: "0 8 * * *",
    timezone: "America/Denver",
    lastRun: "Today 8:00 AM",
    status: "active",
  },
  {
    name: "Clara's Edge Picks Delivery",
    schedule: "0 14 * * *",
    timezone: "America/Denver",
    lastRun: "Today 2:00 PM",
    status: "active",
  },
  {
    name: "Weekly Sprint Review",
    schedule: "0 9 * * 1",
    timezone: "America/Denver",
    lastRun: "Today 9:03 AM",
    status: "active",
  },
];

function parseSkillsTable(content: string): SkillRow[] {
  const lines = content.split("\n");
  const rows: SkillRow[] = [];
  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    if (line.includes("| Priority |") || line.includes("| Priority|")) {
      inTable = true;
      continue;
    }
    if (inTable && line.match(/^\|[-| ]+\|/)) {
      headerPassed = true;
      continue;
    }
    if (inTable && headerPassed && line.startsWith("|")) {
      const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        rows.push({
          priority: cols[0],
          skill: cols[1].replace(/`/g, ""),
          why: cols[2],
        });
      }
    }
    if (inTable && headerPassed && !line.startsWith("|") && line.trim() !== "") {
      break;
    }
  }

  return rows;
}

export default function ClaraClient() {
  const [skills, setSkills] = useState<SkillsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((d) => {
        setSkills(d);
        setLoading(false);
      })
      .catch(() => {
        setSkills({ content: "", error: "Failed to load skills" });
        setLoading(false);
      });
  }, []);

  const skillRows = skills ? parseSkillsTable(skills.content) : [];

  const priorityColor: Record<string, string> = {
    "🔴 Now": "bg-red-500/10 text-red-400 border-red-500/20",
    "🟠 Soon": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "🟡 Later": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "🟢 Future": "bg-green-500/10 text-green-400 border-green-500/20",
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Clara Info Card */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#10b981]/10 rounded-lg">
            <Bot size={20} className="text-[#10b981]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Clara 🌸</h2>
            <p className="text-xs text-[#555]">AI Assistant for Pontis</p>
          </div>
          <Badge className="ml-auto bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20">
            ● Online
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0f0f0f] rounded-lg p-3">
            <p className="text-[#555] text-xs mb-1">Name</p>
            <p className="text-white text-sm font-medium">Clara 🌸</p>
          </div>
          <div className="bg-[#0f0f0f] rounded-lg p-3">
            <p className="text-[#555] text-xs mb-1">Online Since</p>
            <p className="text-white text-sm font-medium">Jan 27, 2026</p>
          </div>
          <div className="bg-[#0f0f0f] rounded-lg p-3">
            <p className="text-[#555] text-xs mb-1">Model</p>
            <p className="text-white text-sm font-medium">Claude Sonnet</p>
          </div>
        </div>
      </div>

      {/* Active Cron Jobs */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-[#10b981]" />
          <h2 className="text-sm font-semibold text-white">Active Cron Jobs</h2>
          <Badge className="bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20 text-xs">
            {CRON_JOBS.length} running
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Job</th>
                <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Schedule</th>
                <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Timezone</th>
                <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Last Run</th>
                <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {CRON_JOBS.map((job) => (
                <tr
                  key={job.name}
                  className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors"
                >
                  <td className="py-3 px-3 text-white font-medium">{job.name}</td>
                  <td className="py-3 px-3">
                    <code className="text-[#10b981] text-xs bg-[#0f1a14] px-1.5 py-0.5 rounded">
                      {job.schedule}
                    </code>
                  </td>
                  <td className="py-3 px-3 text-[#888] text-xs">{job.timezone}</td>
                  <td className="py-3 px-3 text-[#666] text-xs">{job.lastRun}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={12} className="text-[#10b981]" />
                      <span className="text-[#10b981] text-xs">Active</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skills Wishlist */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Skills Wishlist — Priority Queue</h2>
        {skills?.error && (
          <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm mb-4">
            <AlertCircle size={14} />
            <span>{skills.error}</span>
          </div>
        )}
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-[#2a2a2a] rounded animate-pulse" />
            ))}
          </div>
        ) : skillRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Priority</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Skill</th>
                  <th className="text-left py-2 px-3 text-[#666] font-medium text-xs uppercase">Why</th>
                </tr>
              </thead>
              <tbody>
                {skillRows.map((row, i) => (
                  <tr key={i} className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors">
                    <td className="py-2.5 px-3">
                      <Badge
                        className={`text-xs ${priorityColor[row.priority] || "bg-[#2a2a2a] text-[#888]"}`}
                      >
                        {row.priority}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <code className="text-[#3b82f6] text-xs bg-[#0f1020] px-1.5 py-0.5 rounded">
                        {row.skill}
                      </code>
                    </td>
                    <td className="py-2.5 px-3 text-[#888] text-xs">{row.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[#555] text-sm">No skills data available</p>
        )}
      </div>
    </div>
  );
}
