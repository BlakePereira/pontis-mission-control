"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Kanban,
  ListChecks,
  Bot,
} from "lucide-react";

const nav = [
  { href: "/", label: "Command Center", icon: LayoutDashboard, emoji: "🏠" },
  { href: "/pontis", label: "Pontis Hub", icon: Building2, emoji: "🏛️" },
  { href: "/kanban", label: "Kanban", icon: Kanban, emoji: "📋" },
  { href: "/loops", label: "Open Loops", icon: ListChecks, emoji: "🔁" },
  { href: "/clara", label: "Clara Console", icon: Bot, emoji: "🤖" },
];

function ClockDisplay() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!time) return null;

  return (
    <div className="text-center">
      <p className="text-white font-mono text-sm">
        {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-[#555] text-xs mt-0.5">
        {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </p>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0f0f0f] border-r border-[#2a2a2a] flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌸</span>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wider uppercase">Mission Control</h1>
            <p className="text-[10px] text-[#10b981]">Pontis — Online</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20"
                  : "text-[#888] hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#2a2a2a]">
        <ClockDisplay />
      </div>
    </aside>
  );
}
