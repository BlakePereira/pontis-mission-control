import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCode } from '@/lib/google-ads-auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }

    const tokens = await getTokenFromCode(code);
    
    // In production, you'd store this refresh_token securely (database or env var)
    // For now, we'll display it so Joe can add it to Vercel env vars
    return NextResponse.json({
      message: 'Authorization successful! Add this refresh token to Vercel env vars as GOOGLE_ADS_REFRESH_TOKEN',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 500 });
  }
}
