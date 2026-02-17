"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, X, ExternalLink, Trash2, Sparkles, Target, BookOpen } from "lucide-react";

interface KnowledgeItem {
  id: string;
  url: string;
  title: string;
  type: "article" | "youtube" | "twitter" | "pdf" | "note" | "other";
  summary: string;
  author: string;
  tags: string[];
  entities?: {
    companies?: string[];
    people?: string[];
    concepts?: string[];
  };
  added_by: string;
  added_at: string;
}

interface RadarItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  added_at: string;
  tags: string[];
  matched_signals: string[];
}

type IngestStatus = "idle" | "loading" | "success" | "error" | "duplicate";
type ActiveTab = "browse" | "ask" | "radar";

const typeStyles: Record<KnowledgeItem["type"], string> = {
  article: "border-blue-500/30 bg-[#080e1a]",
  youtube: "border-red-500/30 bg-[#1a0808]",
  twitter: "border-sky-400/30 bg-[#080d1a]",
  pdf: "border-amber-500/30 bg-[#1a1208]",
  note: "border-purple-500/30 bg-[#120a1a]",
  other: "border-[#2a2a2a] bg-[#111]",
};

const typeIcons: Record<KnowledgeItem["type"], string> = {
  article: "📰",
  youtube: "🎥",
  twitter: "🐦",
  pdf: "📄",
  note: "📝",
  other: "🔗",
};

const typeLabels: Record<KnowledgeItem["type"], string> = {
  article: "Article",
  youtube: "YouTube",
  twitter: "Twitter",
  pdf: "PDF",
  note: "Note",
  other: "Other",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): ReactNode {
  const cleaned = query.trim();
  if (!cleaned) return text;

  const parts = cleaned
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => escapeRegExp(p));

  if (parts.length === 0) return text;
  const regex = new RegExp(`(${parts.join("|")})`, "gi");
  const chunks = text.split(regex);

  return chunks.map((chunk, i) => {
    if (parts.some((part) => new RegExp(`^${part}$`, "i").test(chunk))) {
      return (
        <mark key={`${chunk}-${i}`} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">
          {chunk}
        </mark>
      );
    }
    return <span key={`${chunk}-${i}`}>{chunk}</span>;
  });
}

// Competitor signal keywords (mirrors backend)
const COMPETITOR_SIGNALS = [
  "granite links", "forever marker", "qr code memorial", "memorial qr", "smartstone",
  "everhere", "lasting tribute", "digital memorial", "memorial tech",
  "cemetery technology", "funeral tech", "grief tech", "memorialization",
  "monument company", "headstone", "gravestone", "mausoleum", "columbarium",
  "monument industry", "memorial industry", "death care", "bereavement technology",
];

function hasCompetitorSignal(item: KnowledgeItem): boolean {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  return COMPETITOR_SIGNALS.some((s) => text.includes(s));
}

// --- Ask Clara Section ---
function AskClaraPanel() {
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<KnowledgeItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    const q = question.trim();
    if (!q) return;
    setIsAsking(true);
    setAnswer(null);
    setSources([]);
    setError(null);

    try {
      const res = await fetch("/api/knowledge/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to get answer");
        return;
      }
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch {
      setError("Failed to reach Ask Clara");
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-5 text-[#10b981]" />
          <h2 className="text-lg font-bold text-white">Ask Clara</h2>
          <span className="text-xs text-[#555] ml-auto">Powered by your knowledge base</span>
        </div>

        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
            placeholder="What do competitors charge for QR memorials?"
            className="bg-[#0c0c0c] border-[#2a2a2a] text-white placeholder:text-[#555]"
          />
          <Button
            onClick={handleAsk}
            disabled={isAsking || !question.trim()}
            className="bg-[#10b981] hover:bg-[#0ea572] text-black font-semibold whitespace-nowrap"
          >
            {isAsking ? <Loader2 className="size-4 animate-spin" /> : "Ask →"}
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "What are our competitors doing?",
            "What's the market size for memorial tech?",
            "Who are key people in the monument industry?",
          ].map((q) => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="text-xs px-2 py-1 rounded border border-[#2a2a2a] bg-[#0d0d0d] text-[#777] hover:text-white hover:border-[#3a3a3a] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {answer && (
        <div className="space-y-3">
          <div className="bg-[#111] border border-[#10b981]/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-[#10b981]" />
              <span className="text-xs text-[#10b981] font-medium uppercase tracking-wider">Clara&apos;s Answer</span>
            </div>
            <p className="text-[#ddd] leading-relaxed whitespace-pre-wrap">{answer}</p>
          </div>

          {sources.length > 0 && (
            <div>
              <p className="text-xs text-[#666] uppercase tracking-wider mb-2">Sources</p>
              <div className="space-y-2">
                {sources.map((source, i) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] hover:border-[#3a3a3a] transition-colors group"
                  >
                    <span className="text-[#555] text-sm font-mono">[{i + 1}]</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate group-hover:text-[#10b981] transition-colors">
                        {source.title}
                      </p>
                      {source.summary && (
                        <p className="text-[#666] text-xs mt-0.5 line-clamp-2">{source.summary}</p>
                      )}
                    </div>
                    <ExternalLink className="size-3.5 text-[#555] group-hover:text-[#888] flex-shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Competitor Radar Section ---
function RadarPanel() {
  const [flagged, setFlagged] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalScanned, setTotalScanned] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/knowledge/competitor-radar")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setFlagged(data.flagged || []);
        setTotalScanned(data.total_scanned || 0);
      })
      .catch(() => setError("Failed to load radar"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Target className="size-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Competitor Radar</h2>
        </div>
        <p className="text-sm text-[#666]">
          Knowledge items mentioning industry signals, competitors, or market terms.
        </p>
        {!loading && (
          <p className="text-xs text-[#555] mt-2">
            Scanned {totalScanned} items · Found {flagged.length} match{flagged.length !== 1 ? "es" : ""}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 p-10 text-[#666] text-sm">
          <Loader2 className="size-4 animate-spin" />
          Scanning knowledge base...
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && flagged.length === 0 && (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-10 text-center text-[#666] text-sm">
          No competitor signals detected in your knowledge base yet.
        </div>
      )}

      {!loading && flagged.length > 0 && (
        <div className="space-y-3">
          {flagged.map((item) => (
            <div key={item.id} className="bg-[#111] border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-400 text-xs">🎯 SIGNAL</span>
                    <span className="text-xs text-[#555]">{timeAgo(item.added_at)}</span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white font-semibold hover:text-amber-400 transition-colors line-clamp-2"
                  >
                    {item.title}
                  </a>
                  {item.summary && (
                    <p className="text-sm text-[#888] mt-1 line-clamp-2">{item.summary}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.matched_signals.slice(0, 5).map((signal) => (
                  <span
                    key={signal}
                    className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  >
                    {signal}
                  </span>
                ))}
                {item.matched_signals.length > 5 && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#666]">
                    +{item.matched_signals.length - 5} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Component ---
export default function KnowledgeClient() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeItem[] | null>(null);
  const [searchMode, setSearchMode] = useState<"semantic" | "text" | "list" | null>(null);
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>("idle");
  const [ingestMessage, setIngestMessage] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [activeTab, setActiveTab] = useState<ActiveTab>("browse");

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchResults, filterType]);

  async function fetchItems() {
    setLoadingItems(true);
    setLoadError("");
    try {
      const res = await fetch("/api/knowledge/items?limit=200");
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data?.error || "Failed to load items");
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch {
      setLoadError("Failed to load items");
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  async function handleIngest() {
    const url = ingestUrl.trim();
    if (!url) return;

    setIngestStatus("loading");
    setIngestMessage("Ingesting...");

    try {
      const res = await fetch("/api/knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, added_by: "mission-control", tags: [] }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIngestStatus("error");
        setIngestMessage(data?.error || "Failed to ingest URL");
        return;
      }

      if (data?.duplicate) {
        setIngestStatus("duplicate");
        setIngestMessage("Already in knowledge base");
        setTimeout(() => { setIngestStatus("idle"); setIngestMessage(""); }, 3000);
        return;
      }

      const newItem = data?.item as KnowledgeItem;
      setItems((prev) => [newItem, ...prev]);
      setIngestStatus("success");
      setIngestMessage(`Added: ${newItem.title}`);
      setIngestUrl("");
      setTimeout(() => { setIngestStatus("idle"); setIngestMessage(""); }, 3000);
    } catch {
      setIngestStatus("error");
      setIngestMessage("Failed to ingest URL");
    }
  }

  async function handleSearch() {
    setIsSearching(true);
    setSearchMode(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (filterType) params.set("type", filterType);
      params.set("limit", "200");

      const res = await fetch(`/api/knowledge/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) return;
      setSearchResults(data?.results || []);
      setSearchMode(data?.mode || null);
    } finally {
      setIsSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
    setSearchMode(null);
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/knowledge/items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) return;

    setItems((prev) => prev.filter((item) => item.id !== id));
    setSearchResults((prev) => (prev ? prev.filter((item) => item.id !== id) : prev));
    setSelectedItem(null);
  }

  const activeItems = useMemo(() => {
    const source = searchResults ?? items;
    if (!filterType) return source;
    return source.filter((item) => item.type === filterType);
  }, [items, searchResults, filterType]);

  const visibleItems = activeItems.slice(0, visibleCount);

  const tabs: { id: ActiveTab; label: string; icon: ReactNode }[] = [
    { id: "browse", label: "Browse", icon: <BookOpen className="size-3.5" /> },
    { id: "ask", label: "Ask Clara", icon: <Sparkles className="size-3.5" /> },
    { id: "radar", label: "Radar", icon: <Target className="size-3.5" /> },
  ];

  return (
    <div className="space-y-5 relative">
      {/* Ingest Bar */}
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
        <h2 className="text-xl font-bold text-white">📚 Knowledge Base</h2>
        <p className="text-[#666] text-sm mt-1">Drop a link. I&apos;ll learn everything about it.</p>

        <div className="mt-4 flex gap-2">
          <Input
            value={ingestUrl}
            onChange={(e) => setIngestUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleIngest(); }}
            placeholder="Paste a URL (article, YouTube, X/Twitter...)"
            className="bg-[#0c0c0c] border-[#2a2a2a] text-white placeholder:text-[#555]"
          />
          <Button
            onClick={handleIngest}
            disabled={ingestStatus === "loading"}
            className="bg-[#10b981] hover:bg-[#0ea572] text-black font-semibold"
          >
            {ingestStatus === "loading" ? <Loader2 className="size-4 animate-spin" /> : "Add →"}
          </Button>
        </div>

        {ingestStatus !== "idle" && (
          <p
            className={`text-sm mt-3 flex items-center gap-2 ${
              ingestStatus === "error"
                ? "text-red-400"
                : ingestStatus === "duplicate"
                ? "text-yellow-400"
                : "text-[#10b981]"
            }`}
          >
            {ingestStatus === "loading" && <Loader2 className="size-4 animate-spin" />}
            {ingestStatus === "success" ? "✅ " : ""}
            {ingestMessage}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-[#1a1a1a] text-white border border-[#3a3a3a]"
                : "text-[#666] hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Browse Tab */}
      {activeTab === "browse" && (
        <>
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                placeholder="Search your knowledge base..."
                className="bg-[#0c0c0c] border-[#2a2a2a] text-white placeholder:text-[#555]"
              />
              <Button onClick={handleSearch} className="bg-[#161616] border border-[#2a2a2a] hover:bg-[#1f1f1f]">
                {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Search
              </Button>
            </div>

            {searchMode && searchMode !== "list" && (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                  searchMode === "semantic"
                    ? "bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]"
                    : "bg-[#1a1a1a] border-[#2a2a2a] text-[#666]"
                }`}>
                  {searchMode === "semantic" ? "✨ Semantic" : "🔤 Text"} search
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {[
                { key: "", label: "All" },
                { key: "article", label: "Articles" },
                { key: "youtube", label: "YouTube" },
                { key: "twitter", label: "Twitter" },
                { key: "note", label: "Notes" },
                { key: "pdf", label: "PDFs" },
                { key: "other", label: "Other" },
              ].map((filter) => (
                <button
                  key={filter.key || "all"}
                  onClick={() => setFilterType(filter.key)}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                    filterType === filter.key
                      ? "text-[#10b981] border-[#10b981]/30 bg-[#10b981]/10"
                      : "text-[#888] border-[#2a2a2a] bg-[#0d0d0d] hover:text-white"
                  }`}
                >
                  {filter.label}
                </button>
              ))}

              {searchResults !== null && (
                <button
                  onClick={clearSearch}
                  className="ml-auto px-3 py-1.5 rounded-md text-xs border border-[#2a2a2a] bg-[#0d0d0d] text-[#888] hover:text-white"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>

          <div>
            {searchResults !== null ? (
              <p className="text-sm text-[#777] mb-3">
                {activeItems.length} results for &quot;{searchQuery}&quot;
              </p>
            ) : (
              <p className="text-sm text-[#777] mb-3">{activeItems.length} items in knowledge base</p>
            )}

            {loadingItems ? (
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-10 text-center text-[#666] text-sm flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Loading knowledge items...
              </div>
            ) : loadError ? (
              <div className="bg-[#111] border border-red-500/30 rounded-xl p-6 text-sm text-red-400">{loadError}</div>
            ) : activeItems.length === 0 ? (
              <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-10 text-center text-[#666] text-sm">
                No items yet - paste your first URL above!
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`text-left border rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:border-[#3a3a3a] ${typeStyles[item.type]}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-black/20 border-white/10 text-[#bbb]">
                            <span>{typeIcons[item.type]}</span>
                            {typeLabels[item.type].toUpperCase()}
                          </Badge>
                          {hasCompetitorSignal(item) && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                              🎯
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#666]">{timeAgo(item.added_at)}</span>
                      </div>
                      <h3 className="text-white font-semibold leading-snug line-clamp-2">
                        {highlightText(item.title, searchQuery)}
                      </h3>
                      <p className="text-sm text-[#888] mt-2 line-clamp-3">
                        {highlightText(item.summary || "No summary available", searchQuery)}
                      </p>
                    </button>
                  ))}
                </div>

                {visibleCount < activeItems.length && (
                  <div className="mt-4">
                    <Button
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                      className="bg-[#161616] border border-[#2a2a2a] hover:bg-[#1f1f1f]"
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Ask Clara Tab */}
      {activeTab === "ask" && <AskClaraPanel />}

      {/* Radar Tab */}
      {activeTab === "radar" && <RadarPanel />}

      {/* Detail Slide-over Panel */}
      <div
        className={`fixed inset-0 z-40 transition-all ${
          selectedItem ? "pointer-events-auto bg-black/50" : "pointer-events-none bg-transparent"
        }`}
        onClick={() => setSelectedItem(null)}
      >
        <aside
          className={`absolute right-0 top-0 h-full w-full max-w-xl bg-[#101010] border-l border-[#2a2a2a] p-6 overflow-y-auto transition-transform duration-300 ${
            selectedItem ? "translate-x-0" : "translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {selectedItem && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-black/20 border-white/10 text-[#bbb]">
                      <span>{typeIcons[selectedItem.type]}</span>
                      {typeLabels[selectedItem.type]}
                    </Badge>
                    {hasCompetitorSignal(selectedItem) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        🎯 Competitor Signal
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-white leading-snug">{selectedItem.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-[#777] hover:text-white transition-colors"
                  aria-label="Close detail panel"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm text-[#888]">
                {selectedItem.author && <p>Author: {selectedItem.author}</p>}
                <p>Added: {new Date(selectedItem.added_at).toLocaleString()}</p>
                <p>Added by: {selectedItem.added_by || "unknown"}</p>
              </div>

              <div className="mt-6">
                <p className="text-xs text-[#666] uppercase tracking-wider mb-2">Summary</p>
                <p className="text-[#ccc] leading-relaxed whitespace-pre-wrap">
                  {selectedItem.summary || "No summary available."}
                </p>
              </div>

              {/* Entities */}
              {selectedItem.entities && (
                Object.values(selectedItem.entities).some(arr => arr && arr.length > 0)
              ) && (
                <div className="mt-6">
                  <p className="text-xs text-[#666] uppercase tracking-wider mb-3">Extracted Entities</p>
                  <div className="space-y-2">
                    {selectedItem.entities.companies && selectedItem.entities.companies.length > 0 && (
                      <div>
                        <p className="text-xs text-[#555] mb-1">🏢 Companies</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedItem.entities.companies.map((c) => (
                            <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 border border-blue-500/20 text-blue-400">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedItem.entities.people && selectedItem.entities.people.length > 0 && (
                      <div>
                        <p className="text-xs text-[#555] mb-1">👤 People</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedItem.entities.people.map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded-full text-xs bg-purple-500/10 border border-purple-500/20 text-purple-400">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedItem.entities.concepts && selectedItem.entities.concepts.length > 0 && (
                      <div>
                        <p className="text-xs text-[#555] mb-1">💡 Concepts</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedItem.entities.concepts.map((c) => (
                            <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedItem.tags?.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs text-[#666] uppercase tracking-wider mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.tags.map((tag) => (
                      <Badge key={tag} className="bg-[#1a1a1a] border-[#2a2a2a] text-[#aaa]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-2">
                <a
                  href={selectedItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#161616] border border-[#2a2a2a] text-[#ccc] hover:text-white"
                >
                  <ExternalLink className="size-4" />
                  Open original
                </a>

                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15"
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
