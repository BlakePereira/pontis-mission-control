import { NextResponse } from 'next/server';
import googleTrends from 'google-trends-api';

// Cache the data for 24 hours (Google Trends data doesn't change frequently)
let cachedData: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Keyword categories for the memorial industry
const KEYWORD_CATEGORIES = {
  'Memorial Tech': [
    'digital memorial',
    'QR memorial',
    'memorial QR code',
  ],
  'Monument Services': [
    'headstone near me',
    'grave markers',
    'cemetery monuments',
  ],
  'Memorial Products': [
    'memorial medallion',
    'headstone accessories',
  ],
  'Competitor Terms': [
    'memorygram',
    'turning hearts medallion',
  ],
};

// Helper to safely parse Google Trends JSON responses
function safeParse(jsonString: string): any {
  try {
    // Google Trends returns data prefixed with ")]}'" for security
    const cleanJson = jsonString.replace(/^\)\]\}',?\n?/, '');
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Failed to parse Google Trends response');
    return null;
  }
}

// Retry wrapper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  initialDelay = 1000
): Promise<T | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (i === maxRetries - 1) {
        return null;
      }
      const delay = initialDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
}

// Fetch interest over time for a list of keywords (comparison)
async function fetchInterestOverTime(keywords: string[]) {
  try {
    const result = await googleTrends.interestOverTime({
      keyword: keywords,
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Last 12 months
      geo: 'US',
    });
    const data = safeParse(result);
    if (!data?.default?.timelineData) return null;
    
    return data.default.timelineData.map((point: any) => ({
      date: point.formattedTime,
      values: point.value,
      hasData: point.hasData,
    }));
  } catch (error) {
    console.error(`Error fetching interest over time:`, error);
    return null;
  }
}

// Fetch interest by region (US states) for a keyword
async function fetchInterestByRegion(keyword: string) {
  try {
    const result = await googleTrends.interestByRegion({
      keyword,
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      geo: 'US',
      resolution: 'REGION',
    });
    const data = safeParse(result);
    if (!data?.default?.geoMapData) return null;
    
    return data.default.geoMapData
      .map((region: any) => ({
        state: region.geoName,
        stateCode: region.geoCode,
        value: region.value[0],
        formattedValue: region.formattedValue?.[0] || region.value[0]?.toString(),
      }))
      .filter((r: any) => r.value > 0)
      .sort((a: any, b: any) => b.value - a.value);
  } catch (error) {
    console.error(`Error fetching interest by region for "${keyword}":`, error);
    return null;
  }
}

// Fetch related queries (rising and top) for a keyword
async function fetchRelatedQueries(keyword: string) {
  try {
    const result = await googleTrends.relatedQueries({
      keyword,
      startTime: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      geo: 'US',
    });
    const data = safeParse(result);
    if (!data?.default?.rankedList) return null;
    
    const rising = data.default.rankedList.find((list: any) => list.rankedKeyword);
    
    return {
      rising: rising?.rankedKeyword
        ?.filter((item: any) => item.topic?.type === 'RISING')
        ?.slice(0, 10)
        .map((q: any) => ({
          query: q.topic?.title || q.topic?.name || 'Unknown',
          value: q.value || 0,
          formattedValue: q.formattedValue || 'Breakout',
        })) || [],
      top: rising?.rankedKeyword
        ?.filter((item: any) => item.topic?.type === 'TOP')
        ?.slice(0, 10)
        .map((q: any) => ({
          query: q.topic?.title || q.topic?.name || 'Unknown',
          value: q.value || 0,
          formattedValue: q.formattedValue || '100',
        })) || [],
    };
  } catch (error) {
    console.error(`Error fetching related queries for "${keyword}":`, error);
    return null;
  }
}

// Generate realistic mock data as fallback
function generateMockData() {
  const months = [
    'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025',
    'Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025',
  ];
  
  // Memorial Day boost in May, Veterans Day in November
  const seasonalTrends = months.map((month, idx) => {
    const baseInterest = 45 + Math.random() * 15;
    let boost = 0;
    if (idx === 4) boost = 35; // May (Memorial Day)
    if (idx === 10) boost = 28; // November (Veterans Day)
    if (idx === 11) boost = 15; // December (holidays)
    return {
      date: month,
      averageInterest: Math.round(baseInterest + boost),
    };
  });
  
  const states = [
    'Texas', 'California', 'Florida', 'Pennsylvania', 'Ohio',
    'Illinois', 'New York', 'Georgia', 'North Carolina', 'Michigan',
    'Arizona', 'Virginia', 'Tennessee', 'Indiana', 'Massachusetts',
  ];
  
  const topRegions = states.map((state, idx) => ({
    state,
    avgInterest: 100 - idx * 4,
  }));
  
  const risingQueries = [
    { query: 'digital memorial qr code', formattedValue: 'Breakout' },
    { query: 'smart headstone technology', formattedValue: '+350%' },
    { query: 'qr code grave marker', formattedValue: '+280%' },
    { query: 'virtual memorial service', formattedValue: '+220%' },
    { query: 'memorial video qr', formattedValue: '+180%' },
    { query: 'interactive headstone', formattedValue: '+150%' },
    { query: 'digital grave marker', formattedValue: '+140%' },
    { query: 'memorial tech products', formattedValue: '+120%' },
  ];
  
  const topQueries = [
    { query: 'headstone near me', formattedValue: '100' },
    { query: 'grave markers with pictures', formattedValue: '85' },
    { query: 'cemetery monuments prices', formattedValue: '75' },
    { query: 'custom headstone design', formattedValue: '70' },
    { query: 'memorial stone engraving', formattedValue: '65' },
    { query: 'pet memorial stones', formattedValue: '60' },
    { query: 'flat grave markers', formattedValue: '55' },
    { query: 'bronze memorial plaques', formattedValue: '50' },
  ];
  
  // Category comparison data
  const categories: any = {};
  for (const [catName, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    categories[catName] = {
      keywords,
      interestOverTime: {},
      interestByRegion: {},
      relatedQueries: {},
    };
    
    // Generate time series for each keyword in category
    keywords.forEach((keyword: string) => {
      categories[catName].interestOverTime[keyword] = months.map((month, idx) => {
        const base = catName === 'Memorial Tech' ? 60 : catName === 'Monument Services' ? 75 : 50;
        const seasonal = idx === 4 ? 20 : idx === 10 ? 15 : 0;
        return {
          date: month,
          value: Math.round(base + seasonal + (Math.random() * 20 - 10)),
        };
      });
    });
  }
  
  return {
    dataSource: 'google-trends-mock',
    lastUpdated: new Date().toISOString(),
    categories,
    seasonalTrends,
    risingQueries,
    topQueries,
    keywordCount: Object.values(KEYWORD_CATEGORIES).flat().length,
    cached: false,
    usingMockData: true,
    mockDataReason: 'Using realistic mock data — Google Trends API can be rate-limited or blocked. Data reflects typical memorial industry search patterns.',
  };
}

// Main handler
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    // Return cached data if fresh enough
    if (cachedData && !forceRefresh && (Date.now() - cacheTimestamp) < CACHE_DURATION_MS) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        cacheAge: Math.round((Date.now() - cacheTimestamp) / 1000 / 60), // minutes
      });
    }

    console.log('Fetching Google Trends data...');
    
    // Try to fetch real data from Google Trends
    let hasRealData = false;
    const categoryResults: any = {};
    
    // Test with one representative keyword from each category
    for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
      console.log(`Fetching data for category: ${category}`);
      
      // Use the first keyword as representative
      const testKeyword = keywords[0];
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to fetch interest over time for all keywords in category at once
      const timeData = await retryWithBackoff(() => fetchInterestOverTime(keywords));
      
      if (timeData && timeData.length > 0) {
        hasRealData = true;
        categoryResults[category] = {
          keywords,
          interestOverTime: timeData,
        };
        
        // Add another delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch regional data for the representative keyword
        const regionData = await retryWithBackoff(() => fetchInterestByRegion(testKeyword));
        if (regionData) {
          categoryResults[category].interestByRegion = regionData;
        }
        
        // Add another delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch related queries
        const relatedData = await retryWithBackoff(() => fetchRelatedQueries(testKeyword));
        if (relatedData) {
          categoryResults[category].relatedQueries = relatedData;
        }
      }
    }
    
    // If we got some real data, process it; otherwise use mock data
    if (hasRealData) {
      console.log('Successfully fetched real Google Trends data!');
      
      // Process the data into the expected format
      const seasonalTrends: any = {};
      const allRising: any[] = [];
      const allTop: any[] = [];
      
      for (const categoryData of Object.values(categoryResults) as any[]) {
        // Aggregate seasonal trends
        if (Array.isArray(categoryData.interestOverTime)) {
          categoryData.interestOverTime.forEach((point: any) => {
            if (!seasonalTrends[point.date]) {
              seasonalTrends[point.date] = { date: point.date, total: 0, count: 0 };
            }
            if (Array.isArray(point.values)) {
              const sum = point.values.reduce((a: number, b: number) => a + b, 0);
              seasonalTrends[point.date].total += sum;
              seasonalTrends[point.date].count += point.values.length;
            }
          });
        }
        
        // Collect related queries
        if (categoryData.relatedQueries) {
          if (categoryData.relatedQueries.rising) allRising.push(...categoryData.relatedQueries.rising);
          if (categoryData.relatedQueries.top) allTop.push(...categoryData.relatedQueries.top);
        }
      }
      
      const seasonalData = Object.values(seasonalTrends)
        .map((point: any) => ({
          date: point.date,
          averageInterest: Math.round(point.total / Math.max(1, point.count)),
        }))
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      
      const response = {
        dataSource: 'google-trends',
        lastUpdated: new Date().toISOString(),
        categories: categoryResults,
        seasonalTrends: seasonalData,
        risingQueries: allRising.slice(0, 20),
        topQueries: allTop.slice(0, 20),
        keywordCount: Object.values(KEYWORD_CATEGORIES).flat().length,
        cached: false,
      };
      
      cachedData = response;
      cacheTimestamp = Date.now();
      
      return NextResponse.json(response);
    } else {
      console.log('Google Trends API unavailable, using mock data');
      
      // Use mock data
      const mockData = generateMockData();
      cachedData = mockData;
      cacheTimestamp = Date.now();
      
      return NextResponse.json(mockData);
    }

  } catch (error: any) {
    console.error('Error fetching Google Trends data:', error);
    
    // If we have cached data, return it even if stale
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        cached: true,
        stale: true,
        cacheAge: Math.round((Date.now() - cacheTimestamp) / 1000 / 60),
        warning: 'Showing cached data due to API error',
      });
    }

    // Last resort: return mock data
    const mockData = generateMockData();
    return NextResponse.json(mockData);
  }
}
