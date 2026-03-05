import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_ADS_CLIENT_ID,
  process.env.GOOGLE_ADS_CLIENT_SECRET,
  'http://localhost:3000/api/google-ads/callback' // Change to production URL when deploying
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
