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

    // For now, return mock data until we complete OAuth flow
    // TODO: Replace with real Google Ads API call after getting refresh token
    const mockData = {
      keyword,
      location: location || 'all',
      monthly_searches: Math.floor(Math.random() * 10000) + 1000,
      competition: 'medium',
      status: 'mock_data',
      message: 'Real data will be available after completing OAuth flow'
    };

    return NextResponse.json(mockData);
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
