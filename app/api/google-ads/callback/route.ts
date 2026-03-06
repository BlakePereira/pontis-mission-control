import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCode } from '@/lib/google-ads-auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    
    if (!code) {
      // If called from the callback page, return JSON error
      if (request.headers.get('accept')?.includes('application/json')) {
        return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
      }
      // Otherwise redirect to error page
      return NextResponse.redirect(new URL('/google-ads-callback?error=no_code', request.url));
    }

    const tokens = await getTokenFromCode(code);
    
    // If this is an API request (from the callback page), return JSON
    if (request.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json({
        message: 'Authorization successful!',
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expiry_date: tokens.expiry_date
      });
    }
    
    // Otherwise redirect to the callback page which will fetch the tokens
    return NextResponse.redirect(new URL(`/google-ads-callback?code=${code}`, request.url));
    
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    
    if (request.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json({ error: 'Failed to exchange authorization code' }, { status: 500 });
    }
    
    return NextResponse.redirect(new URL('/google-ads-callback?error=exchange_failed', request.url));
  }
}
