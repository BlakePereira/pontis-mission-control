import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword');
    const location = searchParams.get('location'); // e.g., "Phoenix, AZ"
    
    if (!keyword) {
      return NextResponse.json({ error: 'keyword parameter is required' }, { status: 400 });
    }

    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    });

    // Use Keyword Planner to get search volume
    const response = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      keyword_seed: {
        keywords: [keyword],
      },
      ...(location && {
        geo_target_constants: [await getLocationId(location)],
      }),
    });

    if (!response.results || response.results.length === 0) {
      return NextResponse.json({
        keyword,
        location: location || 'all',
        monthly_searches: 0,
        competition: 'unknown',
      });
    }

    const result = response.results[0];
    const monthlySearches = result.keyword_idea_metrics?.avg_monthly_searches || 0;
    const competition = result.keyword_idea_metrics?.competition || 'UNSPECIFIED';

    return NextResponse.json({
      keyword,
      location: location || 'all',
      monthly_searches: monthlySearches,
      competition: competition.toLowerCase(),
      raw_data: result,
    });
  } catch (error: any) {
    console.error('Error fetching keyword volume:', error);
    return NextResponse.json({
      error: 'Failed to fetch keyword volume',
      details: error.message,
    }, { status: 500 });
  }
}

// Helper to convert location name to Google Ads location ID
async function getLocationId(locationName: string): Promise<string> {
  // Simplified mapping - in production, you'd query the GeoTargetConstantService
  const locationMap: Record<string, string> = {
    'Phoenix, AZ': '1023191',
    'Los Angeles, CA': '1014044',
    'New York, NY': '1023191',
    // Add more as needed
  };
  
  return locationMap[locationName] || '2840'; // Default to USA
}
