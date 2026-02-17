"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";

interface LoopItem {
  id: string;
  text: string;
  checked: boolean;
}

function parsePontisSection(content: string): LoopItem[] {
  const lines = content.split("\n");
  let inPontis = false;
  const items: LoopItem[] = [];

  for (const line of lines) {
    if (line.match(/^##\s+Pontis/)) {
      inPontis = true;
      continue;
    }
    if (inPontis && line.match(/^##\s+/)) {
      break; // stop at next H2
    }
    if (inPontis) {
      const unchecked = line.match(/^- \[ \]\s+(.+)/);
      const checked = line.match(/^- \[x\]\s+(.+)/i);
      if (unchecked) {
        items.push({ id: `item-${items.length}`, text: unchecked[1], checked: false });
      } else if (checked) {
        items.push({ id: `item-${items.length}`, text: checked[1], checked: true });
      }
    }
  }

  return items;
}

const STORAGE_KEY = "pontis-loops-checked";

function loadChecked(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveChecked(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export default function LoopsClient() {
  const [items, setItems] = useState<LoopItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadChecked();
    setChecked(stored);

    fetch("/api/loops")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setItems([]);
        } else {
          const parsed = parsePontisSection(d.content || "");
          // Merge: if the file already marks something [x], it's checked
          const initialChecked = new Set(stored);
          parsed.forEach((item) => {
            if (item.checked) initialChecked.add(item.id);
          });
          setChecked(initialChecked);
          setItems(parsed);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveChecked(next);
      return next;
    });
  };

  const totalItems = items.length;
  const checkedCount = items.filter((i) => checked.has(i.id)).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-[#161616] border border-[#2a2a2a] rounded-xl h-14 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {error && (
        <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
          <AlertCircle size={14} />
          <span>Could not load open-loops.md: {error}</span>
        </div>
      )}

      {/* Progress summary */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white">Pontis Completion</span>
          <span className="text-[#10b981] font-bold text-sm">{checkedCount}/{totalItems} done • {pct}%</span>
        </div>
        <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#10b981] rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && (
          <p className="text-xs text-[#10b981] mt-2">🎉 All Pontis loops closed!</p>
        )}
      </div>

      {/* Checklist */}
      {items.length === 0 && !error ? (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 text-center text-[#555] text-sm">
          No open loops found in Pontis section.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isChecked = checked.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                  isChecked
                    ? "bg-[#0f1a14] border-[#10b981]/20 opacity-60"
                    : "bg-[#161616] border-[#2a2a2a] hover:border-[#3a3a3a]"
                }`}
              >
                {isChecked ? (
                  <CheckCircle2 size={18} className="text-[#10b981] mt-0.5 shrink-0" />
                ) : (
                  <Circle size={18} className="text-[#555] mt-0.5 shrink-0" />
                )}
                <span
                  className={`text-sm leading-snug ${
                    isChecked ? "line-through text-[#555]" : "text-white"
                  }`}
                  dangerouslySetInnerHTML={{ __html: item.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
                />
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-[#444] text-center">
        ✦ Checkbox state saved locally in your browser. Source: open-loops.md (Pontis section only)
      </p>
    </div>
  );
}
