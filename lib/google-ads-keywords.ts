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
  topOpportunities: KeywordResult[]; // high volume, low competition
  seasonalInsights: Array<{
    month: string;
    totalVolume: number;
  }>;
  lastUpdated: string;
  usingMockData?: boolean;
  mockDataReason?: string;
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

// Realistic mock data based on typical monument industry search patterns
// This is used when the Google Ads API is restricted to test accounts only
function generateMockData(): MarketIntelligenceData {
  const mockKeywords: KeywordResult[] = [
    // Monument Services - High volume mainstream terms
    { keyword: 'headstones near me', category: 'Monument Services', avgMonthlySearches: 33100, competition: 'HIGH', competitionIndex: 82, lowTopOfPageBidMicros: 2150000, highTopOfPageBidMicros: 4800000, monthlySearchVolumes: generateMonthlyVolumes(33100, 0.15) },
    { keyword: 'grave markers', category: 'Monument Services', avgMonthlySearches: 27300, competition: 'HIGH', competitionIndex: 78, lowTopOfPageBidMicros: 1900000, highTopOfPageBidMicros: 4200000, monthlySearchVolumes: generateMonthlyVolumes(27300, 0.12) },
    { keyword: 'cemetery monuments', category: 'Monument Services', avgMonthlySearches: 18200, competition: 'MEDIUM', competitionIndex: 65, lowTopOfPageBidMicros: 1650000, highTopOfPageBidMicros: 3800000, monthlySearchVolumes: generateMonthlyVolumes(18200, 0.18) },
    { keyword: 'headstone engraving', category: 'Monument Services', avgMonthlySearches: 14600, competition: 'MEDIUM', competitionIndex: 58, lowTopOfPageBidMicros: 2200000, highTopOfPageBidMicros: 5100000, monthlySearchVolumes: generateMonthlyVolumes(14600, 0.10) },
    { keyword: 'granite headstones', category: 'Monument Services', avgMonthlySearches: 12800, competition: 'MEDIUM', competitionIndex: 62, lowTopOfPageBidMicros: 1800000, highTopOfPageBidMicros: 4300000, monthlySearchVolumes: generateMonthlyVolumes(12800, 0.14) },
    { keyword: 'custom headstones', category: 'Monument Services', avgMonthlySearches: 9700, competition: 'MEDIUM', competitionIndex: 55, lowTopOfPageBidMicros: 2400000, highTopOfPageBidMicros: 5400000, monthlySearchVolumes: generateMonthlyVolumes(9700, 0.11) },
    { keyword: 'memorial stones', category: 'Monument Services', avgMonthlySearches: 8900, competition: 'MEDIUM', competitionIndex: 60, lowTopOfPageBidMicros: 1700000, highTopOfPageBidMicros: 3900000, monthlySearchVolumes: generateMonthlyVolumes(8900, 0.16) },
    { keyword: 'monument company near me', category: 'Monument Services', avgMonthlySearches: 6400, competition: 'HIGH', competitionIndex: 75, lowTopOfPageBidMicros: 3200000, highTopOfPageBidMicros: 7100000, monthlySearchVolumes: generateMonthlyVolumes(6400, 0.09) },
    { keyword: 'headstone prices', category: 'Monument Services', avgMonthlySearches: 5800, competition: 'MEDIUM', competitionIndex: 52, lowTopOfPageBidMicros: 1400000, highTopOfPageBidMicros: 3300000, monthlySearchVolumes: generateMonthlyVolumes(5800, 0.13) },
    { keyword: 'grave marker prices', category: 'Monument Services', avgMonthlySearches: 3200, competition: 'LOW', competitionIndex: 38, lowTopOfPageBidMicros: 1100000, highTopOfPageBidMicros: 2800000, monthlySearchVolumes: generateMonthlyVolumes(3200, 0.08) },
    { keyword: 'monument design', category: 'Monument Services', avgMonthlySearches: 2100, competition: 'LOW', competitionIndex: 35, lowTopOfPageBidMicros: 1600000, highTopOfPageBidMicros: 3600000, monthlySearchVolumes: generateMonthlyVolumes(2100, 0.12) },
    { keyword: 'headstone repair', category: 'Monument Services', avgMonthlySearches: 1800, competition: 'LOW', competitionIndex: 28, lowTopOfPageBidMicros: 2900000, highTopOfPageBidMicros: 6200000, monthlySearchVolumes: generateMonthlyVolumes(1800, 0.07) },

    // Memorial Products
    { keyword: 'memorial plaques', category: 'Memorial Products', avgMonthlySearches: 8100, competition: 'MEDIUM', competitionIndex: 58, lowTopOfPageBidMicros: 1800000, highTopOfPageBidMicros: 4100000, monthlySearchVolumes: generateMonthlyVolumes(8100, 0.11) },
    { keyword: 'grave decorations', category: 'Memorial Products', avgMonthlySearches: 6700, competition: 'LOW', competitionIndex: 42, lowTopOfPageBidMicros: 850000, highTopOfPageBidMicros: 1900000, monthlySearchVolumes: generateMonthlyVolumes(6700, 0.22) },
    { keyword: 'memorial medallion', category: 'Memorial Products', avgMonthlySearches: 2900, competition: 'LOW', competitionIndex: 32, lowTopOfPageBidMicros: 1200000, highTopOfPageBidMicros: 2700000, monthlySearchVolumes: generateMonthlyVolumes(2900, 0.14) },
    { keyword: 'headstone accessories', category: 'Memorial Products', avgMonthlySearches: 2400, competition: 'LOW', competitionIndex: 38, lowTopOfPageBidMicros: 1300000, highTopOfPageBidMicros: 3000000, monthlySearchVolumes: generateMonthlyVolumes(2400, 0.10) },
    { keyword: 'cemetery vase', category: 'Memorial Products', avgMonthlySearches: 1900, competition: 'LOW', competitionIndex: 35, lowTopOfPageBidMicros: 900000, highTopOfPageBidMicros: 2100000, monthlySearchVolumes: generateMonthlyVolumes(1900, 0.18) },
    { keyword: 'headstone vase', category: 'Memorial Products', avgMonthlySearches: 1600, competition: 'LOW', competitionIndex: 30, lowTopOfPageBidMicros: 950000, highTopOfPageBidMicros: 2200000, monthlySearchVolumes: generateMonthlyVolumes(1600, 0.16) },
    { keyword: 'memorial bench', category: 'Memorial Products', avgMonthlySearches: 1400, competition: 'LOW', competitionIndex: 40, lowTopOfPageBidMicros: 2100000, highTopOfPageBidMicros: 4600000, monthlySearchVolumes: generateMonthlyVolumes(1400, 0.09) },
    { keyword: 'memorial garden stones', category: 'Memorial Products', avgMonthlySearches: 1100, competition: 'LOW', competitionIndex: 36, lowTopOfPageBidMicros: 1400000, highTopOfPageBidMicros: 3100000, monthlySearchVolumes: generateMonthlyVolumes(1100, 0.13) },
    { keyword: 'cremation memorial', category: 'Memorial Products', avgMonthlySearches: 890, competition: 'MEDIUM', competitionIndex: 48, lowTopOfPageBidMicros: 1700000, highTopOfPageBidMicros: 3800000, monthlySearchVolumes: generateMonthlyVolumes(890, 0.11) },
    { keyword: 'pet memorial stones', category: 'Memorial Products', avgMonthlySearches: 720, competition: 'LOW', competitionIndex: 34, lowTopOfPageBidMicros: 1100000, highTopOfPageBidMicros: 2500000, monthlySearchVolumes: generateMonthlyVolumes(720, 0.15) },

    // Memorial Tech - Emerging category
    { keyword: 'digital memorial', category: 'Memorial Tech', avgMonthlySearches: 3600, competition: 'LOW', competitionIndex: 25, lowTopOfPageBidMicros: 1800000, highTopOfPageBidMicros: 4100000, monthlySearchVolumes: generateMonthlyVolumes(3600, 0.28) },
    { keyword: 'online memorial page', category: 'Memorial Tech', avgMonthlySearches: 2100, competition: 'LOW', competitionIndex: 22, lowTopOfPageBidMicros: 1200000, highTopOfPageBidMicros: 2900000, monthlySearchVolumes: generateMonthlyVolumes(2100, 0.24) },
    { keyword: 'memorial website', category: 'Memorial Tech', avgMonthlySearches: 1800, competition: 'LOW', competitionIndex: 28, lowTopOfPageBidMicros: 1400000, highTopOfPageBidMicros: 3200000, monthlySearchVolumes: generateMonthlyVolumes(1800, 0.19) },
    { keyword: 'virtual memorial', category: 'Memorial Tech', avgMonthlySearches: 1200, competition: 'LOW', competitionIndex: 20, lowTopOfPageBidMicros: 1100000, highTopOfPageBidMicros: 2600000, monthlySearchVolumes: generateMonthlyVolumes(1200, 0.31) },
    { keyword: 'QR code headstone', category: 'Memorial Tech', avgMonthlySearches: 720, competition: 'LOW', competitionIndex: 15, lowTopOfPageBidMicros: 2400000, highTopOfPageBidMicros: 5200000, monthlySearchVolumes: generateMonthlyVolumes(720, 0.42) },
    { keyword: 'memorial QR code', category: 'Memorial Tech', avgMonthlySearches: 590, competition: 'LOW', competitionIndex: 18, lowTopOfPageBidMicros: 2100000, highTopOfPageBidMicros: 4700000, monthlySearchVolumes: generateMonthlyVolumes(590, 0.38) },
    { keyword: 'smart headstone', category: 'Memorial Tech', avgMonthlySearches: 480, competition: 'LOW', competitionIndex: 12, lowTopOfPageBidMicros: 1900000, highTopOfPageBidMicros: 4300000, monthlySearchVolumes: generateMonthlyVolumes(480, 0.35) },
    { keyword: 'digital cemetery', category: 'Memorial Tech', avgMonthlySearches: 390, competition: 'LOW', competitionIndex: 16, lowTopOfPageBidMicros: 1500000, highTopOfPageBidMicros: 3400000, monthlySearchVolumes: generateMonthlyVolumes(390, 0.29) },
    { keyword: 'interactive headstone', category: 'Memorial Tech', avgMonthlySearches: 320, competition: 'LOW', competitionIndex: 10, lowTopOfPageBidMicros: 2200000, highTopOfPageBidMicros: 4900000, monthlySearchVolumes: generateMonthlyVolumes(320, 0.40) },
    { keyword: 'memorial app', category: 'Memorial Tech', avgMonthlySearches: 280, competition: 'LOW', competitionIndex: 14, lowTopOfPageBidMicros: 1600000, highTopOfPageBidMicros: 3600000, monthlySearchVolumes: generateMonthlyVolumes(280, 0.33) },
    { keyword: 'digital grave marker', category: 'Memorial Tech', avgMonthlySearches: 210, competition: 'LOW', competitionIndex: 11, lowTopOfPageBidMicros: 2000000, highTopOfPageBidMicros: 4500000, monthlySearchVolumes: generateMonthlyVolumes(210, 0.37) },
    { keyword: 'NFC headstone', category: 'Memorial Tech', avgMonthlySearches: 140, competition: 'LOW', competitionIndex: 8, lowTopOfPageBidMicros: 1800000, highTopOfPageBidMicros: 4000000, monthlySearchVolumes: generateMonthlyVolumes(140, 0.45) },

    // Memorial Services
    { keyword: 'funeral planning', category: 'Memorial Services', avgMonthlySearches: 12400, competition: 'HIGH', competitionIndex: 72, lowTopOfPageBidMicros: 3800000, highTopOfPageBidMicros: 8200000, monthlySearchVolumes: generateMonthlyVolumes(12400, 0.08) },
    { keyword: 'memorial planning', category: 'Memorial Services', avgMonthlySearches: 4200, competition: 'MEDIUM', competitionIndex: 54, lowTopOfPageBidMicros: 2900000, highTopOfPageBidMicros: 6400000, monthlySearchVolumes: generateMonthlyVolumes(4200, 0.11) },
    { keyword: 'memorial flowers delivery', category: 'Memorial Services', avgMonthlySearches: 3100, competition: 'HIGH', competitionIndex: 68, lowTopOfPageBidMicros: 2100000, highTopOfPageBidMicros: 4700000, monthlySearchVolumes: generateMonthlyVolumes(3100, 0.19) },
    { keyword: 'headstone cleaning service', category: 'Memorial Services', avgMonthlySearches: 1400, competition: 'LOW', competitionIndex: 32, lowTopOfPageBidMicros: 3400000, highTopOfPageBidMicros: 7100000, monthlySearchVolumes: generateMonthlyVolumes(1400, 0.12) },
    { keyword: 'grave cleaning service', category: 'Memorial Services', avgMonthlySearches: 980, competition: 'LOW', competitionIndex: 28, lowTopOfPageBidMicros: 3100000, highTopOfPageBidMicros: 6800000, monthlySearchVolumes: generateMonthlyVolumes(980, 0.10) },
    { keyword: 'cemetery plot finder', category: 'Memorial Services', avgMonthlySearches: 720, competition: 'LOW', competitionIndex: 24, lowTopOfPageBidMicros: 1900000, highTopOfPageBidMicros: 4200000, monthlySearchVolumes: generateMonthlyVolumes(720, 0.09) },
    { keyword: 'obituary writing service', category: 'Memorial Services', avgMonthlySearches: 590, competition: 'LOW', competitionIndex: 30, lowTopOfPageBidMicros: 2600000, highTopOfPageBidMicros: 5700000, monthlySearchVolumes: generateMonthlyVolumes(590, 0.08) },
    { keyword: 'memorial tribute video', category: 'Memorial Services', avgMonthlySearches: 410, competition: 'LOW', competitionIndex: 26, lowTopOfPageBidMicros: 1800000, highTopOfPageBidMicros: 4000000, monthlySearchVolumes: generateMonthlyVolumes(410, 0.14) },

    // Competitor Terms
    { keyword: 'QR code grave marker', category: 'Competitor Terms', avgMonthlySearches: 290, competition: 'LOW', competitionIndex: 16, lowTopOfPageBidMicros: 2200000, highTopOfPageBidMicros: 4800000, monthlySearchVolumes: generateMonthlyVolumes(290, 0.44) },
    { keyword: 'memorial medallion company', category: 'Competitor Terms', avgMonthlySearches: 170, competition: 'LOW', competitionIndex: 12, lowTopOfPageBidMicros: 1900000, highTopOfPageBidMicros: 4200000, monthlySearchVolumes: generateMonthlyVolumes(170, 0.22) },
    { keyword: 'digital headstone company', category: 'Competitor Terms', avgMonthlySearches: 110, competition: 'LOW', competitionIndex: 9, lowTopOfPageBidMicros: 2400000, highTopOfPageBidMicros: 5300000, monthlySearchVolumes: generateMonthlyVolumes(110, 0.38) },
    { keyword: 'headstone QR code company', category: 'Competitor Terms', avgMonthlySearches: 90, competition: 'LOW', competitionIndex: 8, lowTopOfPageBidMicros: 2300000, highTopOfPageBidMicros: 5000000, monthlySearchVolumes: generateMonthlyVolumes(90, 0.41) },
    { keyword: 'grave marker technology', category: 'Competitor Terms', avgMonthlySearches: 70, competition: 'LOW', competitionIndex: 10, lowTopOfPageBidMicros: 2100000, highTopOfPageBidMicros: 4600000, monthlySearchVolumes: generateMonthlyVolumes(70, 0.35) },
    { keyword: 'memorial tech startup', category: 'Competitor Terms', avgMonthlySearches: 50, competition: 'LOW', competitionIndex: 7, lowTopOfPageBidMicros: 1700000, highTopOfPageBidMicros: 3800000, monthlySearchVolumes: generateMonthlyVolumes(50, 0.48) },
  ];

  // Build category summaries
  const categories: MarketIntelligenceData['categories'] = {};
  for (const [catName] of Object.entries(KEYWORD_CATEGORIES)) {
    const catKeywords = mockKeywords.filter(r => r.category === catName);
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
  const topOpportunities = [...mockKeywords]
    .filter(k => k.avgMonthlySearches > 0)
    .sort((a, b) => {
      const scoreA = a.avgMonthlySearches * (100 - a.competitionIndex);
      const scoreB = b.avgMonthlySearches * (100 - b.competitionIndex);
      return scoreB - scoreA;
    })
    .slice(0, 15);

  // Seasonal insights
  const monthlyTotals: Record<string, number> = {};
  for (const r of mockKeywords) {
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

  const totalMonthlySearches = mockKeywords.reduce((s, k) => s + k.avgMonthlySearches, 0);

  return {
    keywords: mockKeywords.sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches),
    totalMonthlySearches,
    categories,
    topOpportunities,
    seasonalInsights,
    lastUpdated: new Date().toISOString(),
    usingMockData: true,
    mockDataReason: 'Developer token restricted to test accounts. Apply for Google Ads API Basic/Standard access for production data.',
  };
}

// Generate realistic monthly search volume trends
function generateMonthlyVolumes(avgVolume: number, seasonalityFactor: number): Array<{ year: number; month: number; monthlySearches: number }> {
  const volumes = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Generate last 12 months of data
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // Memorial Day (late May) and Veterans Day (Nov) see increases
    let seasonalMultiplier = 1.0;
    if (month === 5) seasonalMultiplier = 1.0 + seasonalityFactor; // May (Memorial Day)
    else if (month === 11) seasonalMultiplier = 1.0 + (seasonalityFactor * 0.6); // November (Veterans Day)
    else if (month === 6 || month === 4) seasonalMultiplier = 1.0 + (seasonalityFactor * 0.3); // Spring bump

    const monthlySearches = Math.round(avgVolume * seasonalMultiplier * (0.9 + Math.random() * 0.2));

    volumes.push({ year, month, monthlySearches });
  }

  return volumes;
}

export async function fetchKeywordData(): Promise<MarketIntelligenceData> {
  try {
    const customer = getCustomer();

    // Batch keywords into chunks (API may have limits)
    const batchSize = 20;
    const allResults: KeywordResult[] = [];
    let hasTestAccountError = false;

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
        const errorMessage = err?.message || String(err);
        console.error(`Error fetching keyword batch starting at ${i}:`, err);
        
        // Check if this is the "test accounts only" error
        if (errorMessage.includes('test accounts') || errorMessage.includes('Basic or Standard access')) {
          hasTestAccountError = true;
          break; // No point continuing
        }
      }
    }

    // If we hit the test account restriction or got no results, return mock data
    if (hasTestAccountError || allResults.length === 0) {
      console.log('Returning mock data due to Google Ads API restrictions');
      return generateMockData();
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
  } catch (err: any) {
    console.error('Fatal error fetching keyword data:', err);
    // Fall back to mock data on any error
    return generateMockData();
  }
}
