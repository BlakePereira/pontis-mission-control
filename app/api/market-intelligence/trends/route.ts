import { NextResponse } from 'next/server';
import googleTrends from 'google-trends-api';

// Cache trends data for 24 hours
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

const KEYWORD_GROUPS: Record<string, string[]> = {
  'Memorial Tech': ['QR code headstone', 'digital memorial', 'QR memorial', 'smart headstone', 'memorial QR code'],
  'Monument Services': ['headstone near me', 'grave markers', 'cemetery monuments', 'memorial stones'],
  'Memorial Products': ['memorial medallion', 'headstone accessories', 'grave decoration'],
  'Competitor Terms': ['memorygram', 'turning hearts medallion'],
};

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchTrends() {
  const results: any = {
    interestOverTime: {} as Record<string, any[]>,
    interestByRegion: [] as any[],
    risingQueries: [] as any[],
    topQueries: [] as any[],
    fetchedAt: new Date().toISOString(),
  };

  // Fetch interest over time for each group
  for (const [group, keywords] of Object.entries(KEYWORD_GROUPS)) {
    try {
      const timeData = await googleTrends.interestOverTime({
        keyword: keywords.slice(0, 5),
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        geo: 'US',
      });

      const parsed = JSON.parse(timeData);
      if (parsed?.default?.timelineData) {
        results.interestOverTime[group] = parsed.default.timelineData.map((point: any) => ({
          date: point.formattedTime,
          timestamp: parseInt(point.time) * 1000,
          values: point.value,
          keywords: keywords.slice(0, 5),
        }));
      }

      await delay(2000);
    } catch (err: any) {
      console.error(`Trends error for ${group}:`, err?.message);
      results.interestOverTime[group] = [];
    }
  }

  // Fetch geographic interest for "headstone"
  try {
    const geoData = await googleTrends.interestByRegion({
      keyword: ['headstone'],
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      geo: 'US',
      resolution: 'REGION',
    });

    const parsed = JSON.parse(geoData);
    if (parsed?.default?.geoMapData) {
      results.interestByRegion = parsed.default.geoMapData
        .map((region: any) => ({
          state: region.geoName,
          geoCode: region.geoCode,
          interest: region.value?.[0] || 0,
        }))
        .sort((a: any, b: any) => b.interest - a.interest);
    }

    await delay(2000);
  } catch (err: any) {
    console.error('Geo trends error:', err?.message);
    results.interestByRegion = [];
  }

  // Fetch related queries for key terms
  for (const keyword of ['headstone', 'digital memorial', 'QR memorial']) {
    try {
      const relatedData = await googleTrends.relatedQueries({
        keyword: [keyword],
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        geo: 'US',
      });

      const parsed = JSON.parse(relatedData);
      if (parsed?.default) {
        const rising = parsed.default.rankedList?.[1]?.rankedKeyword || [];
        const top = parsed.default.rankedList?.[0]?.rankedKeyword || [];

        results.risingQueries.push(
          ...rising.slice(0, 5).map((q: any) => ({
            query: q.query,
            value: q.formattedValue,
            link: q.link,
            sourceKeyword: keyword,
          }))
        );

        results.topQueries.push(
          ...top.slice(0, 5).map((q: any) => ({
            query: q.query,
            value: q.value,
            link: q.link,
            sourceKeyword: keyword,
          }))
        );
      }

      await delay(2000);
    } catch (err: any) {
      console.error(`Related queries error for ${keyword}:`, err?.message);
    }
  }

  // Deduplicate rising queries
  const seenRising = new Set<string>();
  results.risingQueries = results.risingQueries.filter((q: any) => {
    if (seenRising.has(q.query)) return false;
    seenRising.add(q.query);
    return true;
  });

  return results;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Return cached data if fresh
    if (cachedData && !forceRefresh && (Date.now() - cacheTimestamp) < CACHE_DURATION_MS) {
      return NextResponse.json({
        ...cachedData,
        dataSource: 'google-trends',
        cached: true,
        cacheAge: Math.round((Date.now() - cacheTimestamp) / 1000 / 60),
      });
    }

    const data = await fetchTrends();
    cachedData = data;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      ...data,
      dataSource: 'google-trends',
      cached: false,
    });
  } catch (error: any) {
    console.error('Trends API error:', error);

    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        dataSource: 'google-trends',
        cached: true,
        stale: true,
        warning: 'Showing cached data due to API error',
      });
    }

    return NextResponse.json({
      error: 'Failed to fetch Google Trends data',
      message: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}
