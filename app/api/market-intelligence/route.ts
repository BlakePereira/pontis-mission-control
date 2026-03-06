import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if we have a Google Ads refresh token
    const hasRefreshToken = !!process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (!hasRefreshToken) {
      return NextResponse.json({
        error: 'Not connected',
        message: 'Google Ads API not connected. Click "Connect Google Ads" to authorize.',
        connected: false
      }, { status: 401 });
    }

    // TODO: Implement actual Google Ads Keyword Planner API calls
    // For now, return mock data so the UI works while we build the integration

    const mockMarketData = [
      {
        metro: "Salt Lake City",
        state: "UT",
        monthly_searches: 8200,
        pontis_customers: 2,
        crm_companies: 15,
        opportunity_score: 72,
        trend: "up" as const,
        trend_pct: 8,
        top_keywords: ["monument companies", "headstone engraving", "grave markers"]
      },
      {
        metro: "Provo-Orem",
        state: "UT",
        monthly_searches: 3400,
        pontis_customers: 1,
        crm_companies: 8,
        opportunity_score: 65,
        trend: "flat" as const,
        trend_pct: 2,
        top_keywords: ["cemetery monuments", "memorial stones"]
      },
      {
        metro: "Phoenix",
        state: "AZ",
        monthly_searches: 12500,
        pontis_customers: 0,
        crm_companies: 28,
        opportunity_score: 89,
        trend: "up" as const,
        trend_pct: 12,
        top_keywords: ["headstones near me", "memorial markers"]
      },
      {
        metro: "Las Vegas",
        state: "NV",
        monthly_searches: 6800,
        pontis_customers: 0,
        crm_companies: 12,
        opportunity_score: 78,
        trend: "up" as const,
        trend_pct: 6,
        top_keywords: ["grave markers", "monument companies"]
      },
      {
        metro: "Denver",
        state: "CO",
        monthly_searches: 9100,
        pontis_customers: 0,
        crm_companies: 19,
        opportunity_score: 82,
        trend: "up" as const,
        trend_pct: 10,
        top_keywords: ["headstones denver", "cemetery monuments"]
      }
    ];

    const mockKeywordData = [
      { region: "Southwest", keyword: "grave markers", volume: 18400, trend: "up" as const, trend_pct: 7 },
      { region: "Mountain West", keyword: "monument companies", volume: 12200, trend: "up" as const, trend_pct: 5 },
      { region: "Pacific", keyword: "headstones near me", volume: 22100, trend: "up" as const, trend_pct: 9 },
      { region: "South", keyword: "cemetery monuments", volume: 15600, trend: "flat" as const, trend_pct: 1 },
      { region: "Midwest", keyword: "memorial stones", volume: 11800, trend: "down" as const, trend_pct: 3 }
    ];

    return NextResponse.json({
      connected: true,
      markets: mockMarketData,
      keywords: mockKeywordData,
      lastUpdated: new Date().toISOString(),
      dataSource: 'mock' // Will change to 'google-ads' when real API is integrated
    });

  } catch (error) {
    console.error('Error fetching market intelligence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
