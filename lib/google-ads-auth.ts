import { google } from 'googleapis';

function getRedirectUri() {
  // Use env var for redirect URI, or default to Vercel preview
  if (process.env.GOOGLE_ADS_REDIRECT_URI) {
    return process.env.GOOGLE_ADS_REDIRECT_URI;
  }
  // For Vercel deployments
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/google-ads/callback`;
  }
  // Fallback to localhost for local dev
  return 'http://localhost:3000/api/google-ads/callback';
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_ADS_CLIENT_ID,
  process.env.GOOGLE_ADS_CLIENT_SECRET,
  getRedirectUri()
);

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/adwords'],
    prompt: 'consent'
  });
}

export async function getTokenFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function getOAuth2Client(refreshToken: string) {
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });
  return oauth2Client;
}
