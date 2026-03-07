import { NextResponse } from 'next/server';
import { fetchKeywordData } from '@/lib/google-ads-keywords';

// Cache the data for 24 hours to avoid hitting API limits
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Check if we have required env vars
    const hasConfig = !!(
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CUSTOMER_ID
    );

    if (!hasConfig) {
      return NextResponse.json({
        error: 'Not connected',
        message: 'Google Ads API not configured. Missing required environment variables.',
        connected: false,
      }, { status: 401 });
    }

    // Return cached data if fresh enough
    if (cachedData && !forceRefresh && (Date.now() - cacheTimestamp) < CACHE_DURATION_MS) {
      return NextResponse.json({
        ...cachedData,
        connected: true,
        dataSource: 'google-ads',
        cached: true,
        cacheAge: Math.round((Date.now() - cacheTimestamp) / 1000 / 60), // minutes
      });
    }

    // Fetch fresh data from Google Ads API
    const data = await fetchKeywordData();

    // Cache it
    cachedData = data;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      ...data,
      connected: true,
      dataSource: 'google-ads',
      cached: false,
    });

  } catch (error: any) {
    console.error('Error fetching market intelligence:', error);
    
    // If we have cached data, return it even if stale
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        connected: true,
        dataSource: 'google-ads',
        cached: true,
        stale: true,
        cacheAge: Math.round((Date.now() - cacheTimestamp) / 1000 / 60),
        warning: 'Showing cached data due to API error',
      });
    }

    return NextResponse.json({
      error: 'API Error',
      message: error?.message || 'Failed to fetch keyword data from Google Ads',
      details: error?.errors?.[0]?.message || error?.details || null,
      connected: true,
      dataSource: 'error',
    }, { status: 500 });
  }
}
