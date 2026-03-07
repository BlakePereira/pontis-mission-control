"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Minus, Search, Target, BarChart3,
  AlertCircle, RefreshCw, ArrowUpDown, ChevronUp, ChevronDown,
  DollarSign, Zap, Calendar, Link as LinkIcon, Lightbulb,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

interface KeywordResult {
  keyword: string;
  category: string;
  avgMonthlySearches: number;
  competition: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED";
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: Array<{
    year: number;
    month: number;
    monthlySearches: number;
  }>;
}

interface CategoryData {
  keywords: KeywordResult[];
  totalVolume: number;
  avgCompetition: number;
  avgCpcLow: number;
  avgCpcHigh: number;
}

interface MarketData {
  keywords: KeywordResult[];
  totalMonthlySearches: number;
  categories: Record<string, CategoryData>;
  topOpportunities: KeywordResult[];
  seasonalInsights: Array<{ month: string; totalVolume: number }>;
  lastUpdated: string;
  connected: boolean;
  dataSource: string;
  cached?: boolean;
  stale?: boolean;
  cacheAge?: number;
  warning?: string;
  error?: string;
  message?: string;
}

type SortField = "keyword" | "avgMonthlySearches" | "competition" | "competitionIndex" | "cpc";
type SortDir = "asc" | "desc";

const CATEGORY_COLORS: Record<string, string> = {
  "Memorial Tech": "#10b981",
  "Monument Services": "#3b82f6",
  "Memorial Products": "#f59e0b",
  "Memorial Services": "#8b5cf6",
  "Competitor Terms": "#ef4444",
  Other: "#6b7280",
};

const COMPETITION_COLORS: Record<string, string> = {
  LOW: "#10b981",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  UNSPECIFIED: "#6b7280",
};

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function microsToUsd(micros: number): string {
  return `$${(micros / 1000000).toFixed(2)}`;
}

function getCompetitionBadge(comp: string) {
  const color = COMPETITION_COLORS[comp] || COMPETITION_COLORS.UNSPECIFIED;
  return (
    <Badge
      className="text-xs"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
      }}
    >
      {comp}
    </Badge>
  );
}

export default function MarketIntelligenceClient() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("avgMonthlySearches");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData(refresh = false) {
    if (refresh) setRefreshing(true);
    try {
      const url = refresh
        ? "/api/market-intelligence?refresh=true"
        : "/api/market-intelligence";
      const response = await fetch(url);
      const result = await response.json();

      if (response.status === 401) {
        setError(result.message || "Not connected");
        setData(null);
      } else if (response.status >= 500 && !result.keywords) {
        setError(result.message || "API error");
        setData(null);
      } else {
        setData(result);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to fetch market data:", err);
      setError("Failed to load market data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredKeywords = useMemo(() => {
    if (!data?.keywords) return [];
    let kws = selectedCategory === "all"
      ? data.keywords
      : data.keywords.filter((k) => k.category === selectedCategory);

    kws = [...kws].sort((a, b) => {
      let valA: number | string, valB: number | string;
      switch (sortField) {
        case "keyword":
          valA = a.keyword;
          valB = b.keyword;
          break;
        case "avgMonthlySearches":
          valA = a.avgMonthlySearches;
          valB = b.avgMonthlySearches;
          break;
        case "competition":
          valA = a.competitionIndex;
          valB = b.competitionIndex;
          break;
        case "competitionIndex":
          valA = a.competitionIndex;
          valB = b.competitionIndex;
          break;
        case "cpc":
          valA = a.highTopOfPageBidMicros;
          valB = b.highTopOfPageBidMicros;
          break;
        default:
          valA = a.avgMonthlySearches;
          valB = b.avgMonthlySearches;
      }
      if (typeof valA === "string") {
        return sortDir === "asc"
          ? valA.localeCompare(valB as string)
          : (valB as string).localeCompare(valA);
      }
      return sortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return kws;
  }, [data, selectedCategory, sortField, sortDir]);

  const categoryChartData = useMemo(() => {
    if (!data?.categories) return [];
    return Object.entries(data.categories)
      .map(([name, cat]) => ({
        name,
        volume: cat.totalVolume,
        keywords: cat.keywords.length,
        avgCpc: cat.avgCpcHigh / 1000000,
        fill: CATEGORY_COLORS[name] || "#6b7280",
      }))
      .sort((a, b) => b.volume - a.volume);
  }, [data]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="ml-1 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="ml-1 text-[#10b981]" />
      : <ChevronDown size={12} className="ml-1 text-[#10b981]" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto mb-4" />
            <p className="text-gray-400">Loading market intelligence from Google Ads...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Market Intelligence</h1>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-200 font-medium mb-1">Connection Error</p>
              <p className="text-red-300 text-sm">{error}</p>
              <Button
                onClick={() => (window.location.href = "/api/google-ads/auth")}
                className="mt-4 bg-[#10b981] hover:bg-[#059669] text-white"
              >
                <LinkIcon size={16} className="mr-2" />
                Connect Google Ads
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const highValueKeywords = data.keywords?.filter(
    (k) => k.highTopOfPageBidMicros > 3000000 && k.competition !== "HIGH"
  ) || [];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Market Intelligence</h1>
            <p className="text-gray-400 mt-1">
              Google Keyword Planner data for memorial &amp; monument industry
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data.cached && (
              <span className="text-xs text-gray-500">
                Cached {data.cacheAge}min ago
              </span>
            )}
            {data.stale && (
              <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-xs">
                Stale Data
              </Badge>
            )}
            <Badge
              className={
                data.dataSource === "google-ads"
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
              }
            >
              {data.dataSource === "google-ads" ? "✅ Live Data" : "⚠️ " + data.dataSource}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => fetchData(true)}
              className="border-[#2a2a2a] text-gray-300 hover:bg-[#1a1a1a]"
            >
              <RefreshCw size={14} className={`mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {data.warning && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-yellow-200 text-sm">{data.warning}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-gray-500 text-xs">Total Monthly Searches</CardDescription>
              <CardTitle className="text-xl text-white">
                {formatNumber(data.totalMonthlySearches)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-gray-500 text-xs">Keywords Tracked</CardDescription>
              <CardTitle className="text-xl text-white">
                {data.keywords?.length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-gray-500 text-xs">Categories</CardDescription>
              <CardTitle className="text-xl text-white">
                {Object.keys(data.categories || {}).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-gray-500 text-xs">Opportunities</CardDescription>
              <CardTitle className="text-xl text-white">
                {data.topOpportunities?.length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="text-gray-500 text-xs">High-Value Keywords</CardDescription>
              <CardTitle className="text-xl text-white">
                {highValueKeywords.length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="keywords" className="space-y-4">
          <TabsList className="bg-[#0f0f0f] border border-[#2a2a2a]">
            <TabsTrigger value="keywords" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Search size={14} className="mr-2" />
              Keywords
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <BarChart3 size={14} className="mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Target size={14} className="mr-2" />
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Calendar size={14} className="mr-2" />
              Seasonal Trends
            </TabsTrigger>
          </TabsList>

          {/* Keywords Tab */}
          <TabsContent value="keywords">
            <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Keyword Research</CardTitle>
                    <CardDescription className="text-gray-400">
                      Search volume, competition, and CPC data from Google Keyword Planner
                    </CardDescription>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCategory("all")}
                      className={`border-[#2a2a2a] text-xs ${
                        selectedCategory === "all"
                          ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30"
                          : "text-gray-400 hover:bg-[#1a1a1a]"
                      }`}
                    >
                      All
                    </Button>
                    {Object.keys(data.categories || {}).map((cat) => (
                      <Button
                        key={cat}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCategory(cat)}
                        className={`border-[#2a2a2a] text-xs ${
                          selectedCategory === cat
                            ? "bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30"
                            : "text-gray-400 hover:bg-[#1a1a1a]"
                        }`}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2a2a2a]">
                        <th
                          className="pb-3 text-gray-400 font-medium text-left cursor-pointer select-none"
                          onClick={() => handleSort("keyword")}
                        >
                          <span className="flex items-center">Keyword <SortIcon field="keyword" /></span>
                        </th>
                        <th className="pb-3 text-gray-400 font-medium text-left">Category</th>
                        <th
                          className="pb-3 text-gray-400 font-medium text-right cursor-pointer select-none"
                          onClick={() => handleSort("avgMonthlySearches")}
                        >
                          <span className="flex items-center justify-end">Vol/mo <SortIcon field="avgMonthlySearches" /></span>
                        </th>
                        <th
                          className="pb-3 text-gray-400 font-medium text-right cursor-pointer select-none"
                          onClick={() => handleSort("competitionIndex")}
                        >
                          <span className="flex items-center justify-end">Competition <SortIcon field="competitionIndex" /></span>
                        </th>
                        <th
                          className="pb-3 text-gray-400 font-medium text-right cursor-pointer select-none"
                          onClick={() => handleSort("cpc")}
                        >
                          <span className="flex items-center justify-end">CPC Range <SortIcon field="cpc" /></span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeywords.map((kw, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-[#2a2a2a]/50 hover:bg-[#1a1a1a] transition-colors"
                        >
                          <td className="py-2.5 text-white font-medium">{kw.keyword}</td>
                          <td className="py-2.5">
                            <span
                              className="text-xs px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: `${CATEGORY_COLORS[kw.category] || "#6b7280"}15`,
                                color: CATEGORY_COLORS[kw.category] || "#6b7280",
                              }}
                            >
                              {kw.category}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-white font-mono">
                            {formatNumber(kw.avgMonthlySearches)}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-gray-500 text-xs font-mono">{kw.competitionIndex}</span>
                              {getCompetitionBadge(kw.competition)}
                            </div>
                          </td>
                          <td className="py-2.5 text-right text-gray-400 font-mono text-xs">
                            {kw.lowTopOfPageBidMicros > 0
                              ? `${microsToUsd(kw.lowTopOfPageBidMicros)} - ${microsToUsd(kw.highTopOfPageBidMicros)}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredKeywords.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No keywords found for this category.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Volume Chart */}
              <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white text-base">Search Volume by Category</CardTitle>
                  <CardDescription className="text-gray-400">
                    Total monthly searches across keyword categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: "#9ca3af", fontSize: 11 }}
                          width={120}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1a1a1a",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          formatter={(value: any) => [formatNumber(Number(value)), "Monthly Searches"]}
                        />
                        <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Cards */}
              <div className="space-y-4">
                {Object.entries(data.categories || {})
                  .sort(([, a], [, b]) => b.totalVolume - a.totalVolume)
                  .map(([name, cat]) => (
                    <Card
                      key={name}
                      className="bg-[#0f0f0f] border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedCategory(name);
                        const tabsList = document.querySelector('[data-state="active"][value="keywords"]') ||
                          document.querySelector('[value="keywords"]');
                        if (tabsList) (tabsList as HTMLElement).click();
                      }}
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CATEGORY_COLORS[name] }}
                            />
                            <h3 className="text-white font-medium">{name}</h3>
                          </div>
                          <span className="text-white font-mono font-bold">
                            {formatNumber(cat.totalVolume)}/mo
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-gray-500">Keywords</span>
                            <p className="text-gray-300 font-medium">{cat.keywords.length}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Avg Competition</span>
                            <p className="text-gray-300 font-medium">{cat.avgCompetition}/100</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Avg CPC</span>
                            <p className="text-gray-300 font-medium">
                              {microsToUsd(cat.avgCpcLow)} - {microsToUsd(cat.avgCpcHigh)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {cat.keywords.slice(0, 4).map((kw) => (
                            <span
                              key={kw.keyword}
                              className="text-xs px-2 py-0.5 rounded bg-[#1a1a1a] text-gray-400"
                            >
                              {kw.keyword} ({formatNumber(kw.avgMonthlySearches)})
                            </span>
                          ))}
                          {cat.keywords.length > 4 && (
                            <span className="text-xs px-2 py-0.5 text-gray-600">
                              +{cat.keywords.length - 4} more
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>

            {/* Market Size Estimate */}
            <Card className="bg-[#0f0f0f] border-[#2a2a2a] mt-6">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-[#10b981] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium mb-1">Market Size Estimate</h4>
                    <p className="text-gray-400 text-sm">
                      With <span className="text-white font-medium">{formatNumber(data.totalMonthlySearches)}</span> monthly
                      searches across tracked keywords, and assuming a 2-3% conversion rate with an average
                      transaction value of $50-200 for memorial tech products, the addressable online market
                      is estimated at{" "}
                      <span className="text-[#10b981] font-medium">
                        {microsToUsd(data.totalMonthlySearches * 12 * 0.025 * 100 * 1000000)}
                        {" - "}
                        {microsToUsd(data.totalMonthlySearches * 12 * 0.03 * 200 * 1000000)}
                      </span>{" "}
                      annually in the US alone.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities">
            <div className="space-y-6">
              {/* Quick Wins */}
              <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap size={18} className="text-yellow-400" />
                    Top SEO Opportunities
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Keywords ranked by opportunity score (high volume × low competition)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(data.topOpportunities || []).map((kw, idx) => {
                      const score = kw.avgMonthlySearches * (100 - kw.competitionIndex);
                      const maxScore = (data.topOpportunities?.[0]?.avgMonthlySearches || 1) *
                        (100 - (data.topOpportunities?.[0]?.competitionIndex || 0));
                      const barWidth = Math.max(5, (score / maxScore) * 100);

                      return (
                        <div
                          key={kw.keyword}
                          className="p-3 rounded-lg border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-[#10b981] font-bold text-sm w-6">
                                #{idx + 1}
                              </span>
                              <span className="text-white font-medium">{kw.keyword}</span>
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[kw.category] || "#6b7280"}15`,
                                  color: CATEGORY_COLORS[kw.category] || "#6b7280",
                                }}
                              >
                                {kw.category}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-400">
                                <Search size={12} className="inline mr-1" />
                                {formatNumber(kw.avgMonthlySearches)}/mo
                              </span>
                              {getCompetitionBadge(kw.competition)}
                              {kw.highTopOfPageBidMicros > 0 && (
                                <span className="text-gray-400 font-mono text-xs">
                                  <DollarSign size={12} className="inline" />
                                  {microsToUsd(kw.highTopOfPageBidMicros)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-[#1a1a1a] rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-[#10b981]"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* High-Value Low-Competition */}
              {highValueKeywords.length > 0 && (
                <Card className="bg-[#0f0f0f] border-[#10b981]/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign size={18} className="text-[#10b981]" />
                      High-Value, Low-Competition Keywords
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Keywords with CPC &gt; $3 but not high competition — strong commercial intent with room to rank
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {highValueKeywords.map((kw) => (
                        <div
                          key={kw.keyword}
                          className="p-3 rounded-lg bg-[#10b981]/5 border border-[#10b981]/20"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium text-sm">{kw.keyword}</span>
                            <span className="text-[#10b981] font-mono text-sm font-bold">
                              {microsToUsd(kw.highTopOfPageBidMicros)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>{formatNumber(kw.avgMonthlySearches)} searches/mo</span>
                            {getCompetitionBadge(kw.competition)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Strategic Insights */}
              <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-[#10b981] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-white font-medium mb-2">Strategic Recommendations</h4>
                      <ul className="text-gray-400 text-sm space-y-2">
                        <li>
                          <strong className="text-gray-200">Content Strategy:</strong> Create SEO-optimized landing pages
                          for each top opportunity keyword. Focus blog posts on informational queries
                          like &quot;what is a digital memorial&quot; to capture top-of-funnel traffic.
                        </li>
                        <li>
                          <strong className="text-gray-200">Paid Search:</strong> High-CPC keywords indicate strong
                          commercial intent. Consider Google Ads campaigns targeting keywords with
                          CPC &gt; $3 and competition below HIGH — these represent the best ROI.
                        </li>
                        <li>
                          <strong className="text-gray-200">Product Positioning:</strong> Keywords with the highest volume
                          reveal what customers are actually searching for. Align product naming and
                          features with these search terms.
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Seasonal Trends Tab */}
          <TabsContent value="trends">
            <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Monthly Search Volume Trends</CardTitle>
                <CardDescription className="text-gray-400">
                  Aggregate search volume across all tracked keywords by month
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.seasonalInsights && data.seasonalInsights.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.seasonalInsights}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: "#9ca3af", fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1a1a1a",
                            border: "1px solid #2a2a2a",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          formatter={(value: any) => [formatNumber(Number(value)), "Total Searches"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="totalVolume"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={{ fill: "#10b981", r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">
                    No seasonal data available yet. Monthly search volumes will appear here once the API returns historical data.
                  </p>
                )}

                <div className="mt-6 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-[#10b981]" />
                    Seasonal Marketing Calendar
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="p-2 rounded bg-[#0f0f0f]">
                      <p className="text-gray-500 text-xs">Memorial Day</p>
                      <p className="text-white font-medium">Late May</p>
                      <p className="text-[#10b981] text-xs">📈 Peak season</p>
                    </div>
                    <div className="p-2 rounded bg-[#0f0f0f]">
                      <p className="text-gray-500 text-xs">Veterans Day</p>
                      <p className="text-white font-medium">Nov 11</p>
                      <p className="text-[#10b981] text-xs">📈 High demand</p>
                    </div>
                    <div className="p-2 rounded bg-[#0f0f0f]">
                      <p className="text-gray-500 text-xs">Mother&apos;s/Father&apos;s Day</p>
                      <p className="text-white font-medium">May / June</p>
                      <p className="text-yellow-500 text-xs">📊 Moderate lift</p>
                    </div>
                    <div className="p-2 rounded bg-[#0f0f0f]">
                      <p className="text-gray-500 text-xs">All Saints&apos; Day</p>
                      <p className="text-white font-medium">Nov 1</p>
                      <p className="text-yellow-500 text-xs">📊 Moderate lift</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                Data source: Google Keyword Planner API | Last updated:{" "}
                {data.lastUpdated
                  ? new Date(data.lastUpdated).toLocaleString()
                  : "—"}
              </span>
              <span>US market (English) | Google Search network</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
