"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, MapPin, Search, Target, Link as LinkIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MarketData {
  metro: string;
  state: string;
  monthly_searches: number;
  pontis_customers: number;
  crm_companies: number;
  opportunity_score: number;
  trend: "up" | "down" | "flat";
  trend_pct: number;
  top_keywords: string[];
}

interface KeywordData {
  region: string;
  keyword: string;
  volume: number;
  trend: "up" | "down" | "flat";
  trend_pct: number;
}

export default function MarketIntelligenceClient() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [dataSource, setDataSource] = useState<'mock' | 'google-ads'>('mock');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [keywordData, setKeywordData] = useState<KeywordData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketData();
  }, []);

  async function fetchMarketData() {
    try {
      const response = await fetch("/api/market-intelligence");
      const data = await response.json();
      
      if (response.status === 401) {
        setConnected(false);
        setError(data.message);
      } else {
        setConnected(data.connected || false);
        setDataSource(data.dataSource || 'mock');
        setMarketData(data.markets || []);
        setKeywordData(data.keywords || []);
        setError(null);
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      setError("Failed to load market data");
    } finally {
      setLoading(false);
    }
  }

  function handleConnectGoogleAds() {
    // Redirect to the OAuth auth endpoint
    window.location.href = '/api/google-ads/auth';
  }

  const getOpportunityBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-red-500 hover:bg-red-600">🔥 HIGH</Badge>;
    if (score >= 50) return <Badge className="bg-yellow-500 hover:bg-yellow-600">⚠️ MEDIUM</Badge>;
    return <Badge className="bg-green-500 hover:bg-green-600">✅ COVERED</Badge>;
  };

  const getTrendIcon = (trend: "up" | "down" | "flat", pct: number) => {
    if (trend === "up") return <span className="flex items-center gap-1 text-green-500"><TrendingUp size={14} /> +{pct}%</span>;
    if (trend === "down") return <span className="flex items-center gap-1 text-red-500"><TrendingDown size={14} /> -{pct}%</span>;
    return <span className="flex items-center gap-1 text-gray-500"><Minus size={14} /> {pct}%</span>;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto mb-4"></div>
              <p className="text-gray-400">Loading market intelligence data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topOpportunities = [...marketData]
    .sort((a, b) => b.opportunity_score - a.opportunity_score)
    .slice(0, 10);

  const totalSearchVolume = marketData.reduce((sum, m) => sum + m.monthly_searches, 0);
  const untappedMarkets = marketData.filter(m => m.pontis_customers === 0).length;
  const avgOpportunityScore = Math.round(
    marketData.reduce((sum, m) => sum + m.opportunity_score, 0) / marketData.length
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Monument Market Intelligence</h1>
            {!connected && !loading && (
              <Button 
                onClick={handleConnectGoogleAds}
                className="bg-[#10b981] hover:bg-[#059669] text-white"
              >
                <LinkIcon size={16} className="mr-2" />
                Connect Google Ads
              </Button>
            )}
            {connected && dataSource === 'mock' && (
              <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                ⚠️ Using Mock Data
              </Badge>
            )}
            {connected && dataSource === 'google-ads' && (
              <Badge className="bg-green-500/10 text-green-500 border border-green-500/20">
                ✅ Connected to Google Ads
              </Badge>
            )}
          </div>
          <p className="text-gray-400">
            Search demand analysis and geographic opportunity mapping for monument industry sales prioritization
          </p>
        </div>

        {/* Connection Alert */}
        {!connected && !loading && (
          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-200">
              <strong>Google Ads not connected.</strong> Click "Connect Google Ads" above to authorize access to real keyword planner data. 
              Currently showing mock data for demonstration.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Total Monthly Searches</CardDescription>
              <CardTitle className="text-2xl text-white">{formatNumber(totalSearchVolume)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Markets Tracked</CardDescription>
              <CardTitle className="text-2xl text-white">{marketData.length}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Untapped Markets</CardDescription>
              <CardTitle className="text-2xl text-white">{untappedMarkets}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader className="pb-3">
              <CardDescription className="text-gray-400">Avg Opportunity Score</CardDescription>
              <CardTitle className="text-2xl text-white">{avgOpportunityScore}/100</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="heatmap" className="space-y-4">
          <TabsList className="bg-[#0f0f0f] border border-[#2a2a2a]">
            <TabsTrigger value="heatmap" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <MapPin size={16} className="mr-2" />
              Market Heatmap
            </TabsTrigger>
            <TabsTrigger value="keywords" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Search size={16} className="mr-2" />
              Keyword Analysis
            </TabsTrigger>
            <TabsTrigger value="expansion" className="data-[state=active]:bg-[#10b981]/10 data-[state=active]:text-[#10b981]">
              <Target size={16} className="mr-2" />
              Expansion Priorities
            </TabsTrigger>
          </TabsList>

          {/* Market Heatmap Tab */}
          <TabsContent value="heatmap">
            <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Market Opportunity Heatmap</CardTitle>
                <CardDescription className="text-gray-400">
                  Search volume, Pontis coverage, and opportunity scores by metro area
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a2a] text-left">
                        <th className="pb-3 text-gray-400 font-medium">Metro Area</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Monthly Searches</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Trend</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Pontis Customers</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">CRM Companies</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Opportunity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketData.map((market, idx) => (
                        <tr key={idx} className="border-b border-[#2a2a2a]/50 hover:bg-[#1a1a1a] transition-colors">
                          <td className="py-3 text-white">
                            <div>
                              <div className="font-medium">{market.metro}</div>
                              <div className="text-sm text-gray-500">{market.state}</div>
                            </div>
                          </td>
                          <td className="py-3 text-right text-white font-mono">{formatNumber(market.monthly_searches)}</td>
                          <td className="py-3 text-right">{getTrendIcon(market.trend, market.trend_pct)}</td>
                          <td className="py-3 text-right text-white">{market.pontis_customers}</td>
                          <td className="py-3 text-right text-gray-400">{market.crm_companies}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-white font-medium">{market.opportunity_score}</span>
                              {getOpportunityBadge(market.opportunity_score)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keyword Analysis Tab */}
          <TabsContent value="keywords">
            <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Keyword Variations by Region</CardTitle>
                <CardDescription className="text-gray-400">
                  Top monument-related search terms by geographic region
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#2a2a2a] text-left">
                        <th className="pb-3 text-gray-400 font-medium">Region</th>
                        <th className="pb-3 text-gray-400 font-medium">Top Keyword</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Volume</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordData.map((kw, idx) => (
                        <tr key={idx} className="border-b border-[#2a2a2a]/50 hover:bg-[#1a1a1a] transition-colors">
                          <td className="py-3 text-white font-medium">{kw.region}</td>
                          <td className="py-3 text-gray-300">"{kw.keyword}"</td>
                          <td className="py-3 text-right text-white font-mono">{formatNumber(kw.volume)}</td>
                          <td className="py-3 text-right">{getTrendIcon(kw.trend, kw.trend_pct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                  <h4 className="text-white font-medium mb-2">💡 Sales Insight</h4>
                  <p className="text-gray-400 text-sm">
                    Use region-specific keyword language in your outreach. If Texas prospects search "grave markers" 
                    more than "headstones", mirror that language in your pitch to increase resonance and credibility.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expansion Priorities Tab */}
          <TabsContent value="expansion">
            <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Top 10 Expansion Priorities</CardTitle>
                <CardDescription className="text-gray-400">
                  High-opportunity markets ranked by search volume, coverage gaps, and growth potential
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topOpportunities.map((market, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border border-[#2a2a2a] hover:border-[#10b981]/30 hover:bg-[#1a1a1a] transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#10b981]/10 text-[#10b981] font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="text-white font-medium text-lg">{market.metro}, {market.state}</h3>
                            <p className="text-gray-500 text-sm">
                              {formatNumber(market.monthly_searches)} searches/month {getTrendIcon(market.trend, market.trend_pct)}
                            </p>
                          </div>
                        </div>
                        {getOpportunityBadge(market.opportunity_score)}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-[#2a2a2a]">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Pontis Coverage</p>
                          <p className="text-white font-medium">
                            {market.pontis_customers === 0 ? "🔴 None" : `✅ ${market.pontis_customers} customer${market.pontis_customers > 1 ? 's' : ''}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Companies in CRM</p>
                          <p className="text-white font-medium">{market.crm_companies} prospects</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Top Keywords</p>
                          <p className="text-gray-400 text-sm">{market.top_keywords.join(", ")}</p>
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-[#10b981]/5 rounded border border-[#10b981]/20">
                        <p className="text-[#10b981] text-sm font-medium mb-1">🎯 Recommended Action</p>
                        <p className="text-gray-300 text-sm">
                          {market.pontis_customers === 0 
                            ? `Prioritize these ${market.crm_companies} companies — zero coverage in a high-demand market. Use "${market.top_keywords[0]}" in your pitch.`
                            : `Expand coverage beyond current ${market.pontis_customers} customer${market.pontis_customers > 1 ? 's' : ''}. ${market.crm_companies - market.pontis_customers} more prospects available.`
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Data Source Notice */}
        <Card className="bg-[#0f0f0f] border-[#2a2a2a]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">ℹ️</div>
              <div>
                <h4 className="text-white font-medium mb-1">About This Data</h4>
                <p className="text-gray-400 text-sm">
                  {dataSource === 'google-ads' ? (
                    <>
                      Market intelligence is refreshed monthly using <span className="text-[#10b981]">Google Keyword Planner API</span>. 
                      Opportunity scores are calculated based on search volume, market saturation, Pontis coverage, 
                      and regional growth trends. Last updated: <span className="text-white">March 6, 2026</span>
                    </>
                  ) : (
                    <>
                      Currently showing <span className="text-yellow-500">mock demonstration data</span>. 
                      Connect Google Ads above to access real search volume data from Google Keyword Planner. 
                      Opportunity scores will be calculated based on actual search demand, market saturation, and regional trends.
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
