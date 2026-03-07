import { getOAuth2Client } from './google-ads-auth';

// Keyword categories for Pontis market intelligence
export const KEYWORD_CATEGORIES: Record<string, string[]> = {
  'Memorial Tech': [
    'QR code headstone',
    'digital memorial',
    'smart headstone',
    'digital cemetery',
    'memorial QR code',
    'interactive headstone',
    'NFC headstone',
    'digital grave marker',
    'online memorial page',
    'memorial website',
    'virtual memorial',
    'memorial app',
  ],
  'Monument Services': [
    'monument company near me',
    'headstone engraving',
    'grave markers',
    'cemetery monuments',
    'headstones near me',
    'memorial stones',
    'granite headstones',
    'custom headstones',
    'headstone prices',
    'grave marker prices',
    'monument design',
    'headstone repair',
  ],
  'Memorial Products': [
    'memorial medallion',
    'headstone accessories',
    'grave decorations',
    'memorial plaques',
    'cemetery vase',
    'headstone vase',
    'memorial bench',
    'memorial garden stones',
    'cremation memorial',
    'pet memorial stones',
  ],
  'Memorial Services': [
    'memorial flowers delivery',
    'headstone cleaning service',
    'grave cleaning service',
    'cemetery plot finder',
    'memorial planning',
    'funeral planning',
    'obituary writing service',
    'memorial tribute video',
  ],
  'Competitor Terms': [
    'memorial medallion company',
    'headstone QR code company',
    'grave marker technology',
    'digital headstone company',
    'memorial tech startup',
    'QR code grave marker',
  ],
};

export const ALL_KEYWORDS = Object.values(KEYWORD_CATEGORIES).flat();

export interface KeywordResult {
  keyword: string;
  category: string;
  avgMonthlySearches: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSPECIFIED';
  competitionIndex: number;
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: Array<{
    year: number;
    month: number;
    monthlySearches: number;
  }>;
}

export interface MarketIntelligenceData {
  keywords: KeywordResult[];
  totalMonthlySearches: number;
  categories: Record<string, {
    keywords: KeywordResult[];
    totalVolume: number;
    avgCompetition: number;
    avgCpcLow: number;
    avgCpcHigh: number;
  }>;
  topOpportunities: KeywordResult[];
  seasonalInsights: Array<{
    month: string;
    totalVolume: number;
  }>;
  lastUpdated: string;
}

function getCategoryForKeyword(keyword: string): string {
  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    if (keywords.map(k => k.toLowerCase()).includes(keyword.toLowerCase())) return category;
  }
  return 'Other';
}

function mapCompetition(level: string | null | undefined): 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSPECIFIED' {
  switch (level) {
    case 'LOW': return 'LOW';
    case 'MEDIUM': return 'MEDIUM';
    case 'HIGH': return 'HIGH';
    default: return 'UNSPECIFIED';
  }
}

function mapMonthEnum(monthStr: string | null | undefined): number {
  const months: Record<string, number> = {
    JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
    JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
  };
  return months[monthStr || ''] || 1;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function getAccessToken(): Promise<string> {
  const oauth2Client = getOAuth2Client(process.env.GOOGLE_ADS_REFRESH_TOKEN!);
  const { token } = await oauth2Client.getAccessToken();
  if (!token) throw new Error('Failed to get access token');
  return token;
}

async function generateKeywordIdeas(keywords: string[], accessToken: string): Promise<any> {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!;
  const url = `https://googleads.googleapis.com/v18/customers/${customerId}:generateKeywordIdeas`;

  const body = {
    keywordSeed: {
      keywords: keywords,
    },
    geoTargetConstants: ['geoTargetConstants/2840'], // United States
    language: 'languageConstants/1000', // English
    keywordPlanNetwork: 'GOOGLE_SEARCH',
    includeAdultKeywords: false,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Google Ads API error:', response.status, errorBody);
    throw new Error(`Google Ads API error (${response.status}): ${errorBody.substring(0, 500)}`);
  }

  return response.json();
}

export async function fetchKeywordData(): Promise<MarketIntelligenceData> {
  const accessToken = await getAccessToken();

  // Batch keywords to avoid oversized requests
  const batchSize = 20;
  const allResults: KeywordResult[] = [];

  for (let i = 0; i < ALL_KEYWORDS.length; i += batchSize) {
    const batch = ALL_KEYWORDS.slice(i, i + batchSize);

    try {
      const response = await generateKeywordIdeas(batch, accessToken);
      const results = response?.results || [];

      for (const idea of results) {
        const text = idea?.text || '';
        const metrics = idea?.keywordIdeaMetrics || {};

        if (!text) continue;

        const monthlyVolumes: KeywordResult['monthlySearchVolumes'] = [];
        const monthlySearchVolumesRaw = metrics?.monthlySearchVolumes || [];

        for (const mv of monthlySearchVolumesRaw) {
          monthlyVolumes.push({
            year: mv?.year || 0,
            month: mapMonthEnum(mv?.month),
            monthlySearches: Number(mv?.monthlySearches || 0),
          });
        }

        allResults.push({
          keyword: text,
          category: getCategoryForKeyword(text),
          avgMonthlySearches: Number(metrics?.avgMonthlySearches || 0),
          competition: mapCompetition(metrics?.competition),
          competitionIndex: Number(metrics?.competitionIndex || 0),
          lowTopOfPageBidMicros: Number(metrics?.lowTopOfPageBidMicros || 0),
          highTopOfPageBidMicros: Number(metrics?.highTopOfPageBidMicros || 0),
          monthlySearchVolumes: monthlyVolumes,
        });
      }
    } catch (err: any) {
      console.error(`Error fetching keyword batch starting at ${i}:`, err?.message || err);
      // Continue with next batch
    }
  }

  // Deduplicate by keyword
  const seen = new Set<string>();
  const dedupedResults: KeywordResult[] = [];
  for (const r of allResults) {
    const key = r.keyword.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      dedupedResults.push(r);
    }
  }

  // Build category summaries
  const categories: MarketIntelligenceData['categories'] = {};
  for (const catName of Object.keys(KEYWORD_CATEGORIES)) {
    const catKeywords = dedupedResults.filter(r => r.category === catName);
    if (catKeywords.length === 0) continue;

    const totalVolume = catKeywords.reduce((s, k) => s + k.avgMonthlySearches, 0);
    const avgCompetition = Math.round(
      catKeywords.reduce((s, k) => s + k.competitionIndex, 0) / catKeywords.length
    );
    const avgCpcLow = Math.round(
      catKeywords.reduce((s, k) => s + k.lowTopOfPageBidMicros, 0) / catKeywords.length
    );
    const avgCpcHigh = Math.round(
      catKeywords.reduce((s, k) => s + k.highTopOfPageBidMicros, 0) / catKeywords.length
    );

    categories[catName] = {
      keywords: catKeywords.sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches),
      totalVolume,
      avgCompetition,
      avgCpcLow,
      avgCpcHigh,
    };
  }

  // Top opportunities: high volume, low competition
  const topOpportunities = [...dedupedResults]
    .filter(k => k.avgMonthlySearches > 0)
    .sort((a, b) => {
      const scoreA = a.avgMonthlySearches * (100 - a.competitionIndex);
      const scoreB = b.avgMonthlySearches * (100 - b.competitionIndex);
      return scoreB - scoreA;
    })
    .slice(0, 15);

  // Seasonal insights
  const monthlyTotals: Record<string, number> = {};
  for (const r of dedupedResults) {
    for (const mv of r.monthlySearchVolumes) {
      const key = `${mv.year}-${String(mv.month).padStart(2, '0')}`;
      monthlyTotals[key] = (monthlyTotals[key] || 0) + mv.monthlySearches;
    }
  }

  const seasonalInsights = Object.entries(monthlyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, totalVolume]) => {
      const [year, month] = key.split('-');
      return {
        month: `${MONTH_NAMES[parseInt(month) - 1]} ${year}`,
        totalVolume,
      };
    });

  const totalMonthlySearches = dedupedResults.reduce((s, k) => s + k.avgMonthlySearches, 0);

  return {
    keywords: dedupedResults.sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches),
    totalMonthlySearches,
    categories,
    topOpportunities,
    seasonalInsights,
    lastUpdated: new Date().toISOString(),
  };
}
