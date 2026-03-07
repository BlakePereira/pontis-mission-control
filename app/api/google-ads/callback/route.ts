import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromCode } from '@/lib/google-ads-auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/google-ads-callback?error=${error}`, request.url));
    }
    
    if (!code) {
      return NextResponse.redirect(new URL('/google-ads-callback?error=no_code', request.url));
    }

    // Exchange the code for tokens immediately (code can only be used once!)
    const tokens = await getTokenFromCode(code);
    
    // Redirect to the callback page with the refresh token as a query param
    const callbackUrl = new URL('/google-ads-callback', request.url);
    callbackUrl.searchParams.set('success', 'true');
    if (tokens.refresh_token) {
      callbackUrl.searchParams.set('refresh_token', tokens.refresh_token);
    }
    if (tokens.access_token) {
      callbackUrl.searchParams.set('access_token', tokens.access_token);
    }
    if (tokens.expiry_date) {
      callbackUrl.searchParams.set('expiry_date', String(tokens.expiry_date));
    }
    
    return NextResponse.redirect(callbackUrl);
    
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(new URL('/google-ads-callback?error=exchange_failed', request.url));
  }
}
