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
  const categories: Record<string, any> = {};
  const allSeasonalPoints: Record<string, { total: number; count: number }> = {};
  const allRising: any[] = [];
  const allTop: any[] = [];
  let totalKeywords = 0;

  // Fetch interest over time for each group
  for (const [group, keywords] of Object.entries(KEYWORD_GROUPS)) {
    totalKeywords += keywords.length;
    categories[group] = {
      interestOverTime: {} as Record<string, any[]>,
      interestByRegion: [] as any[],
    };

    try {
      const timeData = await googleTrends.interestOverTime({
        keyword: keywords.slice(0, 5),
        startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        geo: 'US',
      });

      const parsed = JSON.parse(timeData);
      if (parsed?.default?.timelineData) {
        // Map each keyword's time series
        keywords.forEach((kw: string, kwIdx: number) => {
          categories[group].interestOverTime[kw] = parsed.default.timelineData.map((point: any) => {
            const val = point.value[kwIdx] || 0;
            // Aggregate for seasonal trends
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
        });
      }

      await delay(2000);
    } catch (err: any) {
      console.error(`Trends error for ${group}:`, err?.message);
    }
  }

  // Fetch geographic interest for "headstone" and distribute to categories
  try {
    const geoData = await googleTrends.interestByRegion({
      keyword: ['headstone'],
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

      // Add to Monument Services category (most relevant)
      categories['Monument Services'].interestByRegion = regionData;
      // Also add to Memorial Tech for broader view
      categories['Memorial Tech'].interestByRegion = regionData;
    }

    await delay(2000);
  } catch (err: any) {
    console.error('Geo trends error:', err?.message);
  }

  // Fetch related queries
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

      await delay(2000);
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

  // Build seasonal trends from aggregated data
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
