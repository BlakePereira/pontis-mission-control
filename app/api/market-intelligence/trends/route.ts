import { NextResponse } from 'next/server';
import googleTrends from 'google-trends-api';

// Cache trends data for 12 hours
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000;

const KEYWORD_GROUPS: Record<string, string[]> = {
  'Memorial Tech': ['QR code headstone', 'digital memorial', 'QR memorial'],
  'Monument Services': ['headstone near me', 'grave markers', 'cemetery monuments'],
  'Memorial Products': ['memorial medallion', 'headstone accessories', 'grave decoration'],
  'Competitor Terms': ['memorygram', 'turning hearts medallion'],
};

// Single keywords to fetch individual trends for (more reliable than batches)
const TREND_KEYWORDS = ['headstone', 'digital memorial', 'grave markers', 'memorial QR code'];

async function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchTrends() {
  const categories: Record<string, any> = {};
  const allSeasonalPoints: Record<string, { total: number; count: number }> = {};
  const allRising: any[] = [];
  const allTop: any[] = [];
  let totalKeywords = 0;

  // Initialize categories
  for (const [group, keywords] of Object.entries(KEYWORD_GROUPS)) {
    totalKeywords += keywords.length;
    categories[group] = {
      interestOverTime: {} as Record<string, any[]>,
      interestByRegion: [] as any[],
    };
  }

  // Fetch interest over time ONE keyword at a time (avoids Google rate limiting)
  for (const keyword of TREND_KEYWORDS) {
    try {
      const timeData = await googleTrends.interestOverTime({
        keyword: [keyword],
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        geo: 'US',
      });

      const parsed = JSON.parse(timeData);
      if (parsed?.default?.timelineData) {
        // Find which category this keyword belongs to
        const group = Object.entries(KEYWORD_GROUPS).find(([, kws]) =>
          kws.some(k => k.toLowerCase() === keyword.toLowerCase())
        )?.[0] || 'Memorial Tech';

        categories[group].interestOverTime[keyword] = parsed.default.timelineData.map((point: any) => {
          const val = point.value[0] || 0;
          const dateKey = point.formattedTime;
          if (!allSeasonalPoints[dateKey]) {
            allSeasonalPoints[dateKey] = { total: 0, count: 0 };
          }
          allSeasonalPoints[dateKey].total += val;
          allSeasonalPoints[dateKey].count += 1;

          return {
            date: point.formattedTime,
            value: val,
            timestamp: parseInt(point.time) * 1000,
          };
        });
      }

      await delay(3000); // 3 seconds between requests
    } catch (err: any) {
      console.error(`Trends error for ${keyword}:`, err?.message);
    }
  }

  // Fetch geographic interest for multiple terms
  for (const keyword of ['headstone', 'memorial']) {
    try {
      const geoData = await googleTrends.interestByRegion({
        keyword: [keyword],
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        geo: 'US',
        resolution: 'REGION',
      });

      const parsed = JSON.parse(geoData);
      if (parsed?.default?.geoMapData) {
        const regionData = parsed.default.geoMapData
          .map((region: any) => ({
            state: region.geoName,
            geoCode: region.geoCode,
            value: region.value?.[0] || 0,
            avgInterest: region.value?.[0] || 0,
          }))
          .sort((a: any, b: any) => b.value - a.value);

        // Add to relevant categories
        if (keyword === 'headstone') {
          categories['Monument Services'].interestByRegion = regionData;
        }
        if (keyword === 'memorial') {
          categories['Memorial Tech'].interestByRegion = regionData;
        }
      }

      await delay(3000);
    } catch (err: any) {
      console.error('Geo trends error:', err?.message);
    }
  }

  // Fetch related queries
  for (const keyword of ['headstone', 'digital memorial']) {
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

        allRising.push(
          ...rising.slice(0, 5).map((q: any) => ({
            query: q.query,
            value: q.value,
            formattedValue: q.formattedValue || String(q.value),
            sourceKeyword: keyword,
          }))
        );

        allTop.push(
          ...top.slice(0, 5).map((q: any) => ({
            query: q.query,
            value: q.value,
            formattedValue: q.formattedValue || String(q.value),
            sourceKeyword: keyword,
          }))
        );
      }

      await delay(3000);
    } catch (err: any) {
      console.error(`Related queries error for ${keyword}:`, err?.message);
    }
  }

  // Deduplicate
  const seenRising = new Set<string>();
  const risingQueries = allRising.filter((q: any) => {
    if (seenRising.has(q.query)) return false;
    seenRising.add(q.query);
    return true;
  });

  const seenTop = new Set<string>();
  const topQueries = allTop.filter((q: any) => {
    if (seenTop.has(q.query)) return false;
    seenTop.add(q.query);
    return true;
  });

  // Build seasonal trends
  const seasonalTrends = Object.entries(allSeasonalPoints)
    .map(([date, agg]) => ({
      date,
      averageInterest: Math.round(agg.total / agg.count),
    }));

  return {
    dataSource: 'google-trends',
    lastUpdated: new Date().toISOString(),
    categories,
    seasonalTrends,
    risingQueries,
    topQueries,
    keywordCount: totalKeywords,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    if (cachedData && !forceRefresh && (Date.now() - cacheTimestamp) < CACHE_DURATION_MS) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        cacheAge: Math.round((Date.now() - cacheTimestamp) / 1000 / 60),
      });
    }

    const data = await fetchTrends();
    cachedData = data;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      ...data,
      cached: false,
    });
  } catch (error: any) {
    console.error('Trends API error:', error);

    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
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
