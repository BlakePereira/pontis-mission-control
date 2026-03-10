"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, AlertCircle, RefreshCw, Calendar, MapPin, Flame,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

interface GoogleTrendsData {
  dataSource: string;
  lastUpdated: string;
  categories: Record<string, any>;
  seasonalTrends: Array<{ date: string; averageInterest: number }>;
  risingQueries: Array<{ query: string; value?: any; formattedValue: string }>;
  topQueries: Array<{ query: string; value?: any; formattedValue: string }>;
  keywordCount: number;
  cached?: boolean;
  stale?: boolean;
  cacheAge?: number;
  warning?: string;
  error?: string;
  message?: string;
  usingMockData?: boolean;
  mockDataReason?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Memorial Tech": "#10b981",
  "Monument Services": "#3b82f6",
  "Memorial Products": "#f59e0b",
  "Competitor Terms": "#ef4444",
};

export default function GoogleTrendsSection() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<GoogleTrendsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData(refresh = false) {
    if (refresh) setRefreshing(true);
    try {
      const url = refresh
        ? "/api/market-intelligence/trends?refresh=true"
        : "/api/market-intelligence/trends";
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        setData(result);
        setError(null);
      } else {
        setError(result.message || "Failed to fetch Google Trends data");
        setData(null);
      }
    } catch (err) {
      console.error("Failed to fetch trends data:", err);
      setError("Failed to load Google Trends data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Process seasonal trends for chart
  const seasonalChartData = useMemo(() => {
    if (!data?.seasonalTrends) return [];
    return data.seasonalTrends.map((point) => ({
      month: point.date,
      interest: point.averageInterest,
    }));
  }, [data]);

  // Aggregate regional data across all keywords
  const topRegions = useMemo(() => {
    if (!data?.categories) return [];
    const regionMap: Record<string, { state: string; totalInterest: number; count: number }> = {};
    
    for (const categoryData of Object.values(data.categories)) {
      if (categoryData.interestByRegion) {
        // Check if it's an array directly (for mock data) or object with keyword keys
        const regions = Array.isArray(categoryData.interestByRegion)
          ? categoryData.interestByRegion
          : Object.values(categoryData.interestByRegion).flat();
        
        regions.forEach((region: any) => {
          if (region && region.state) {
            if (!regionMap[region.state]) {
              regionMap[region.state] = { state: region.state, totalInterest: 0, count: 0 };
            }
            regionMap[region.state].totalInterest += region.value || region.avgInterest || 0;
            regionMap[region.state].count += 1;
          }
        });
      }
    }
    
    return Object.values(regionMap)
      .map((r) => ({
        state: r.state,
        avgInterest: Math.round(r.totalInterest / r.count),
      }))
      .sort((a, b) => b.avgInterest - a.avgInterest)
      .slice(0, 15);
  }, [data]);

  // Prepare comparison data for each category (latest average interest)
  const categoryComparison = useMemo(() => {
    if (!data?.categories) return [];
    
    return Object.entries(data.categories).map(([name, categoryData]) => {
      let totalInterest = 0;
      let count = 0;
      
      if (categoryData.interestOverTime) {
        for (const [keyword, timeData] of Object.entries(categoryData.interestOverTime)) {
          if (Array.isArray(timeData) && timeData.length > 0) {
            // Get the average of the last 3 months
            const recent = timeData.slice(-3);
            totalInterest += recent.reduce((sum: number, point: any) => sum + (point.value || 0), 0);
            count += recent.length;
          }
        }
      }
      
      return {
        category: name,
        avgInterest: count > 0 ? Math.round(totalInterest / count) : 0,
        fill: CATEGORY_COLORS[name] || "#6b7280",
      };
    }).sort((a, b) => b.avgInterest - a.avgInterest);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
          <CardContent className="py-12 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto mb-4" />
              <p className="text-gray-400">Loading Google Trends data...</p>
              <p className="text-gray-500 text-sm mt-2">(This may take 30-60 seconds on first load)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
          <CardContent className="py-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-red-200 font-medium mb-1">Failed to Load Trends Data</p>
                <p className="text-red-300 text-sm">{error}</p>
                <Button
                  onClick={() => fetchData(true)}
                  variant="outline"
                  size="sm"
                  className="mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <RefreshCw size={14} className="mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={24} className="text-[#10b981]" />
            Google Trends Analysis
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Search interest data — relative popularity, not absolute volumes
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
          <Badge className={
            data.usingMockData
              ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
              : "bg-green-500/10 text-green-500 border border-green-500/20"
          }>
            {data.usingMockData ? "📊 Demo Data" : "✅ Live Google Trends"}
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

      {data.usingMockData && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-200 font-medium mb-1">Using Realistic Market Data (Demo Mode)</p>
            <p className="text-blue-300 text-sm">{data.mockDataReason}</p>
          </div>
        </div>
      )}

      {/* Seasonal Trends Chart */}
      <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calendar size={18} className="text-[#10b981]" />
            Seasonal Search Interest (Last 12 Months)
          </CardTitle>
          <CardDescription className="text-gray-400">
            Average search interest across all memorial & monument keywords. 
            Peaks typically occur around Memorial Day (late May), Veterans Day (Nov 11), and holidays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {seasonalChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seasonalChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 12 }}
                    label={{ value: "Relative Interest", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: any) => [value, "Interest"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="interest"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: "#10b981", r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-12">No seasonal data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Geographic Interest and Category Comparison Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Heat Map */}
        <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin size={18} className="text-blue-400" />
              Top States by Search Interest
            </CardTitle>
            <CardDescription className="text-gray-400">
              Geographic breakdown — which US states show the most interest in memorial keywords
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topRegions.length > 0 ? (
              <div className="space-y-2">
                {topRegions.map((region, idx) => (
                  <div
                    key={region.state}
                    className="flex items-center justify-between p-2 rounded hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-xs w-6">#{idx + 1}</span>
                      <span className="text-white font-medium text-sm">{region.state}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-[#1a1a1a] rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-blue-400"
                          style={{ width: `${(region.avgInterest / topRegions[0].avgInterest) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-400 font-mono text-xs w-8 text-right">
                        {region.avgInterest}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No regional data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Category Comparison */}
        <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-[#10b981]" />
              Keyword Category Comparison
            </CardTitle>
            <CardDescription className="text-gray-400">
              Relative search interest by keyword category (recent average)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryComparison.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="category"
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
                      formatter={(value: any) => [value, "Avg Interest"]}
                    />
                    <Bar dataKey="avgInterest" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No category data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rising Queries */}
      <Card className="bg-[#0f0f0f] border-[#10b981]/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Flame size={18} className="text-orange-400" />
            Rising Search Queries
          </CardTitle>
          <CardDescription className="text-gray-400">
            What's gaining momentum in the memorial space — breakout terms show explosive growth
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.risingQueries && data.risingQueries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.risingQueries.slice(0, 12).map((query, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#10b981]/5 border border-[#10b981]/20 hover:border-[#10b981]/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium text-sm">{query.query}</span>
                    <Badge
                      className={
                        query.formattedValue === "Breakout"
                          ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                          : "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30"
                      }
                    >
                      {query.formattedValue}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No rising queries available.</p>
          )}
        </CardContent>
      </Card>

      {/* Top Related Queries */}
      <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white">Top Related Queries</CardTitle>
          <CardDescription className="text-gray-400">
            Most popular related searches — consistently high volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.topQueries && data.topQueries.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {data.topQueries.slice(0, 16).map((query, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-colors"
                >
                  <span className="text-white text-sm">{query.query}</span>
                  <span className="text-gray-500 text-xs ml-2">({query.formattedValue})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No top queries available.</p>
          )}
        </CardContent>
      </Card>

      {/* Data Source Notice */}
      <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              Source: {data.usingMockData ? "Realistic demo data based on industry patterns" : "Google Trends (relative interest, not absolute volumes)"} | Last updated:{" "}
              {data.lastUpdated
                ? new Date(data.lastUpdated).toLocaleString()
                : "—"}
            </span>
            <span>US market | {data.keywordCount} keywords tracked</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
