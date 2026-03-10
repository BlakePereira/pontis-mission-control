"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, MapPin, Search, RefreshCw, Zap, Globe,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const GROUP_COLORS: Record<string, string> = {
  "Memorial Tech": "#10b981",
  "Monument Services": "#3b82f6",
  "Memorial Products": "#f59e0b",
  "Competitor Terms": "#ef4444",
};

interface TrendsData {
  interestOverTime: Record<string, Array<{
    date: string;
    timestamp: number;
    values: number[];
    keywords: string[];
  }>>;
  interestByRegion: Array<{
    state: string;
    geoCode: string;
    interest: number;
  }>;
  risingQueries: Array<{
    query: string;
    value: string;
    sourceKeyword: string;
  }>;
  topQueries: Array<{
    query: string;
    value: number;
    sourceKeyword: string;
  }>;
  fetchedAt: string;
  dataSource: string;
  cached?: boolean;
  cacheAge?: number;
  error?: string;
}

export default function GoogleTrendsSection() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData(refresh = false) {
    if (refresh) setRefreshing(true);
    try {
      const url = refresh
        ? "/api/market-intelligence/trends?refresh=true"
        : "/api/market-intelligence/trends";
      const res = await fetch(url);
      const result = await res.json();
      if (result.error) {
        setError(result.message || result.error);
      } else {
        setData(result);
        setError(null);
      }
    } catch (err) {
      setError("Failed to load Google Trends data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-6 bg-gray-200 rounded w-48" /></CardHeader>
            <CardContent><div className="h-48 bg-gray-100 rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center">
          <p className="text-red-700 mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Prepare seasonal chart data from first group with data
  const seasonalData: any[] = [];
  const firstGroup = Object.entries(data.interestOverTime).find(([, v]) => v.length > 0);
  if (firstGroup) {
    const [groupName, timeData] = firstGroup;
    const keywords = timeData[0]?.keywords || [];
    timeData.forEach((point) => {
      const entry: any = { date: point.date };
      keywords.forEach((kw: string, i: number) => {
        entry[kw] = point.values[i] || 0;
      });
      seasonalData.push(entry);
    });
  }

  // Top 15 states
  const topStates = (data.interestByRegion || []).slice(0, 15);
  const maxStateInterest = topStates[0]?.interest || 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Google Trends — Live Data</h2>
          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
            Real Data
          </Badge>
          {data.cached && (
            <Badge variant="outline" className="text-gray-500">
              Cached {data.cacheAge}m ago
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <p className="text-sm text-gray-500">
        Source: Google Trends (relative interest 0-100, not absolute search volumes). Updated {data.fetchedAt ? new Date(data.fetchedAt).toLocaleDateString() : "recently"}.
      </p>

      {/* Seasonal Trends */}
      {seasonalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Search Interest Over 12 Months
            </CardTitle>
            <CardDescription>
              Relative search interest (0-100). Look for peaks around Memorial Day (May), Veterans Day (Nov), and holidays.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={seasonalData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval={Math.floor(seasonalData.length / 8)}
                />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                {firstGroup && firstGroup[1][0]?.keywords.map((kw: string, i: number) => (
                  <Line
                    key={kw}
                    type="monotone"
                    dataKey={kw}
                    stroke={Object.values(GROUP_COLORS)[i % 4]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* All Groups Interest Over Time */}
      {Object.entries(data.interestOverTime)
        .filter(([group]) => group !== firstGroup?.[0])
        .filter(([, v]) => v.length > 0)
        .map(([group, timeData]) => {
          const keywords = timeData[0]?.keywords || [];
          const chartData = timeData.map((point) => {
            const entry: any = { date: point.date };
            keywords.forEach((kw: string, i: number) => {
              entry[kw] = point.values[i] || 0;
            });
            return entry;
          });

          return (
            <Card key={group}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: GROUP_COLORS[group] || "#6b7280" }}
                  />
                  {group} — 12 Month Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 6)} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    {keywords.map((kw: string, i: number) => (
                      <Line
                        key={kw}
                        type="monotone"
                        dataKey={kw}
                        stroke={Object.values(GROUP_COLORS)[(i + Object.keys(GROUP_COLORS).indexOf(group)) % 4]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })}

      {/* Geographic Breakdown */}
      {topStates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Top States — "Headstone" Search Interest
            </CardTitle>
            <CardDescription>
              Where people search most for headstone-related terms. Higher = more demand. Use this to prioritize sales outreach by state.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topStates} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="state" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={(value: number) => [`${value}/100`, "Interest"]} />
                <Bar dataKey="interest" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {topStates.map((entry, i) => (
                    <Cell
                      key={entry.state}
                      fill={entry.interest > 80 ? "#10b981" : entry.interest > 50 ? "#3b82f6" : "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Rising & Top Queries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rising Queries */}
        {data.risingQueries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                Rising Queries
              </CardTitle>
              <CardDescription>
                Searches gaining momentum in the memorial space. "Breakout" = massive growth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.risingQueries.slice(0, 10).map((q, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{q.query}</span>
                      <span className="text-xs text-gray-400 ml-2">via "{q.sourceKeyword}"</span>
                    </div>
                    <Badge
                      className={
                        q.value === "Breakout"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                      }
                    >
                      {q.value === "Breakout" ? "🔥 Breakout" : `+${q.value}`}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Queries */}
        {data.topQueries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-500" />
                Top Related Queries
              </CardTitle>
              <CardDescription>
                Most popular related searches. Higher value = more search volume relative to the keyword.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.topQueries.slice(0, 10).map((q, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{q.query}</span>
                      <span className="text-xs text-gray-400 ml-2">via "{q.sourceKeyword}"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${q.value}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{q.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
