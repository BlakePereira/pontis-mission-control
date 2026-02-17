"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

/* ──────────────────────────────────────────────
   Simple markdown → styled HTML renderer
────────────────────────────────────────────── */

function renderMarkdown(md: string): string {
  if (!md) return "";
  return md
    // h1
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-white mt-6 mb-2">$1</h1>')
    // h2
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-emerald-400 mt-5 mb-2 border-b border-[#2a2a2a] pb-1">$1</h2>')
    // h3
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-[#aaa] mt-4 mb-1">$1</h3>')
    // bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    // italic
    .replace(/\*(.+?)\*/g, '<em class="text-[#aaa]">$1</em>')
    // unchecked checkbox
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex items-start gap-2 text-[#888] ml-4 my-0.5"><span class="mt-1 shrink-0 w-3.5 h-3.5 border border-[#444] rounded-sm inline-block"></span><span>$1</span></li>')
    // checked checkbox
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex items-start gap-2 text-[#555] line-through ml-4 my-0.5"><span class="mt-1 shrink-0 w-3.5 h-3.5 border border-emerald-700 bg-emerald-900 rounded-sm inline-block"></span><span>$1</span></li>')
    // bullet
    .replace(/^- (.+)$/gm, '<li class="text-[#888] ml-4 list-disc my-0.5">$1</li>')
    // numbered list
    .replace(/^\d+\. (.+)$/gm, '<li class="text-[#888] ml-4 list-decimal my-0.5">$1</li>')
    // horizontal rule
    .replace(/^---$/gm, '<hr class="border-[#2a2a2a] my-4" />')
    // blank lines → paragraph breaks
    .replace(/\n\n/g, '<p class="mb-3"></p>');
}

/* ──────────────────────────────────────────────
   Correction log parser
────────────────────────────────────────────── */

interface Correction {
  date: string;
  wrong: string;
  correct: string;
  raw: string;
}

function parseCorrections(content: string): Correction[] {
  if (!content) return [];
  // Split on "##" headers or date patterns
  const entries: Correction[] = [];
  const lines = content.split("\n");
  let current: Partial<Correction> & { lines: string[] } = { lines: [] };

  for (const line of lines) {
    if (line.startsWith("## ") || line.match(/^\*\*\d{4}-\d{2}-\d{2}/)) {
      if (current.lines.length > 0) {
        const raw = current.lines.join("\n");
        const dateMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
        const wrongMatch = raw.match(/(?:Wrong|Incorrect|Was|Before)[:\s]+([^\n]+)/i);
        const correctMatch = raw.match(/(?:Correct|Right|Now|After|Fixed)[:\s]+([^\n]+)/i);
        entries.push({
          date: dateMatch?.[1] || "",
          wrong: wrongMatch?.[1]?.trim() || "",
          correct: correctMatch?.[1]?.trim() || "",
          raw,
        });
      }
      current = { lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  // last entry
  if (current.lines.length > 0) {
    const raw = current.lines.join("\n");
    if (raw.trim()) {
      const dateMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
      entries.push({ date: dateMatch?.[1] || "", wrong: "", correct: "", raw });
    }
  }
  return entries.filter((e) => e.raw.trim().length > 3);
}

/* ──────────────────────────────────────────────
   Main Component
────────────────────────────────────────────── */

export default function BibleClient() {
  const [bibleContent, setBibleContent] = useState<string>("");
  const [bibleModified, setBibleModified] = useState<string | null>(null);
  const [bibleError, setBibleError] = useState<string | null>(null);

  const [correctionContent, setCorrectionContent] = useState<string>("");
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const [updateText, setUpdateText] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    // Fetch bible
    fetch("/api/bible")
      .then((r) => r.json())
      .then((data) => {
        setBibleContent(data.content || "");
        setBibleModified(data.lastModified || null);
        if (data.error) setBibleError(data.error);
      })
      .catch(() => setBibleError("Failed to fetch"));

    // Fetch correction log
    fetch("/api/correction-log")
      .then((r) => r.json())
      .then((data) => {
        setCorrectionContent(data.content || "");
        if (data.error) setCorrectionError(data.error);
      })
      .catch(() => setCorrectionError("Failed to fetch"));
  }, []);

  const corrections = parseCorrections(correctionContent);

  const handleSubmit = async () => {
    if (!updateText.trim()) return;
    setSubmitState("loading");
    try {
      const res = await fetch("/api/bible-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: updateText }),
      });
      if (res.ok) {
        setSubmitState("success");
        setUpdateText("");
      } else {
        setSubmitState("error");
      }
    } catch {
      setSubmitState("error");
    }
  };

  const formattedDate = bibleModified
    ? new Date(bibleModified).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Top two panels */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Panel 1: Pontis Bible (60%) */}
        <div className="flex-1 lg:w-3/5 bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
            <div>
              <h2 className="text-sm font-semibold text-white">📖 Pontis Bible</h2>
              {formattedDate && (
                <p className="text-xs text-[#555] mt-0.5">Last verified: {formattedDate}</p>
              )}
              <p className="text-[10px] text-emerald-600 mt-0.5 italic">
                Clara reads this before every strategy conversation
              </p>
            </div>
            <RefreshCw size={14} className="text-[#444]" />
          </div>

          {/* Content */}
          <div className="p-5 max-h-[600px] overflow-y-auto">
            {bibleError ? (
              <div className="flex items-center gap-2 text-yellow-500 text-sm">
                <AlertCircle size={14} />
                <span>File access only available on local instance</span>
              </div>
            ) : bibleContent ? (
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(bibleContent) }}
              />
            ) : (
              <div className="text-[#444] text-sm">Loading...</div>
            )}
          </div>
        </div>

        {/* Panel 2: Correction Log (40%) */}
        <div className="lg:w-2/5 bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#2a2a2a]">
            <h2 className="text-sm font-semibold text-white">🔴 Correction Log</h2>
            <p className="text-xs text-[#555] mt-0.5">
              {corrections.length} correction{corrections.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Content */}
          <div className="p-5 max-h-[600px] overflow-y-auto space-y-3">
            {correctionError ? (
              <div className="flex items-center gap-2 text-yellow-500 text-sm">
                <AlertCircle size={14} />
                <span>File access only available on local instance</span>
              </div>
            ) : corrections.length === 0 && !correctionContent ? (
              <div className="text-[#444] text-sm">Loading...</div>
            ) : corrections.length === 0 ? (
              <div className="text-[#444] text-sm">No corrections logged yet.</div>
            ) : (
              corrections.map((c, i) => (
                <div key={i} className="border border-[#222] rounded-lg p-3 bg-[#111]">
                  {c.date && (
                    <p className="text-[10px] text-[#555] mb-1 font-mono">{c.date}</p>
                  )}
                  {c.wrong && (
                    <p className="text-xs text-red-400/80 mb-1">
                      <span className="text-[#555]">Was: </span>{c.wrong}
                    </p>
                  )}
                  {c.correct && (
                    <p className="text-xs text-emerald-400/80">
                      <span className="text-[#555]">Now: </span>{c.correct}
                    </p>
                  )}
                  {!c.wrong && !c.correct && (
                    <pre className="text-[10px] text-[#666] whitespace-pre-wrap leading-relaxed">
                      {c.raw.substring(0, 300)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Panel 3: Update Request (full width) */}
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-1">📝 Request a Bible Update</h2>
        <p className="text-xs text-[#555] mb-4">
          Clara checks update requests and applies them in the next session.
        </p>

        <textarea
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          placeholder="Describe what should be updated in the Bible..."
          className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg p-3 text-sm text-white placeholder-[#444] resize-none focus:outline-none focus:border-[#10b981]/40 transition-colors"
          rows={4}
        />

        <div className="flex items-center gap-4 mt-3">
          <button
            onClick={handleSubmit}
            disabled={!updateText.trim() || submitState === "loading"}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {submitState === "loading" ? "Sending..." : "Send to Clara"}
          </button>

          {submitState === "success" && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
              <CheckCircle2 size={14} />
              <span>✅ Clara will update the Bible shortly</span>
            </div>
          )}
          {submitState === "error" && (
            <div className="flex items-center gap-1.5 text-red-400 text-sm">
              <AlertCircle size={14} />
              <span>Failed to send — try again</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
