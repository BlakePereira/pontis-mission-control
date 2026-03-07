import { GoogleAdsApi } from 'google-ads-api';

// Keyword categories for Pontis market intelligence
export const KEYWORD_CATEGORIES = {
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

interface KeywordResult {
  keyword: string;
  category: string;
  avgMonthlySearches: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSPECIFIED';
  competitionIndex: number; // 0-100
  lowTopOfPageBidMicros: number;
  highTopOfPageBidMicros: number;
  monthlySearchVolumes: Array<{
    year: number;
    month: number;
    monthlySearches: number;
  }>;
}

interface MarketIntelligenceData {
  keywords: KeywordResult[];
  totalMonthlySearches: number;
  categories: Record<string, {
    keywords: KeywordResult[];
    totalVolume: number;
    avgCompetition: number;
    avgCpcLow: number;
    avgCpcHigh: number;
  }>;
  topOpportunities: KeywordResult[]; // high volume, low competition
  seasonalInsights: Array<{
    month: string;
    totalVolume: number;
  }>;
  lastUpdated: string;
}

function getClient() {
  return new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
}

function getCustomer() {
  const client = getClient();
  return client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  });
}

function getCategoryForKeyword(keyword: string): string {
  for (const [category, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    if (keywords.includes(keyword)) return category;
  }
  return 'Other';
}

// Map Google Ads competition enum to string
function mapCompetition(level: number | null | undefined): 'LOW' | 'MEDIUM' | 'HIGH' | 'UNSPECIFIED' {
  switch (level) {
    case 2: return 'LOW';
    case 3: return 'MEDIUM';
    case 4: return 'HIGH';
    default: return 'UNSPECIFIED';
  }
}

// Map month enum to number (1-12)
function mapMonth(monthEnum: number | null | undefined): number {
  // Google Ads month enum: JANUARY=2, FEBRUARY=3, ..., DECEMBER=13
  if (!monthEnum || monthEnum < 2) return 1;
  return monthEnum - 1;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function fetchKeywordData(): Promise<MarketIntelligenceData> {
  const customer = getCustomer();

  // Batch keywords into chunks (API may have limits)
  const batchSize = 20;
  const allResults: KeywordResult[] = [];

  for (let i = 0; i < ALL_KEYWORDS.length; i += batchSize) {
    const batch = ALL_KEYWORDS.slice(i, i + batchSize);

    try {
      const response = await customer.keywordPlanIdeas.generateKeywordIdeas({
        customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
        keyword_seed: {
          keywords: batch,
        },
        // US market
        geo_target_constants: ['geoTargetConstants/2840'], // United States
        language: 'languageConstants/1000', // English
        keyword_plan_network: 2, // GOOGLE_SEARCH
        include_adult_keywords: false,
      });

      // Process results
      const results = (response as any)?.results || response || [];
      
      if (Array.isArray(results)) {
        for (const idea of results) {
          const text = idea?.text || idea?.keyword_idea_metrics?.keyword || '';
          const metrics = idea?.keyword_idea_metrics || idea;

          if (!text) continue;

          const monthlyVolumes: KeywordResult['monthlySearchVolumes'] = [];
          const monthlySearchVolumesRaw = metrics?.monthly_search_volumes || [];

          for (const mv of monthlySearchVolumesRaw) {
            monthlyVolumes.push({
              year: mv?.year || 0,
              month: mapMonth(mv?.month),
              monthlySearches: Number(mv?.monthly_searches || 0),
            });
          }

          allResults.push({
            keyword: text,
            category: getCategoryForKeyword(text),
            avgMonthlySearches: Number(metrics?.avg_monthly_searches || 0),
            competition: mapCompetition(metrics?.competition),
            competitionIndex: Number(metrics?.competition_index || 0),
            lowTopOfPageBidMicros: Number(metrics?.low_top_of_page_bid_micros || 0),
            highTopOfPageBidMicros: Number(metrics?.high_top_of_page_bid_micros || 0),
            monthlySearchVolumes: monthlyVolumes,
          });
        }
      }
    } catch (err: any) {
      console.error(`Error fetching keyword batch starting at ${i}:`, err?.message || err);
      // Continue with next batch rather than failing entirely
    }
  }

  // Deduplicate by keyword (API may return same keyword from different seeds)
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
  for (const [catName] of Object.entries(KEYWORD_CATEGORIES)) {
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
      // Score: high volume * (100 - competition) = opportunity
      const scoreA = a.avgMonthlySearches * (100 - a.competitionIndex);
      const scoreB = b.avgMonthlySearches * (100 - b.competitionIndex);
      return scoreB - scoreA;
    })
    .slice(0, 15);

  // Seasonal insights - aggregate monthly volumes across all keywords
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
