import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'mc_auth_session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export function middleware(request: NextRequest) {
  // Check for existing session cookie first
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
  if (sessionCookie?.value === 'authenticated') {
    return NextResponse.next()
  }

  // No valid session, check basic auth
  const authHeader = request.headers.get('authorization')
  
  if (authHeader) {
    const base64 = authHeader.split(' ')[1]
    const [user, pass] = Buffer.from(base64, 'base64').toString().split(':')
    
    if (user === 'pontis' && pass === 'missioncontrol2026') {
      // Valid credentials - set session cookie and allow access
      const response = NextResponse.next()
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: 'authenticated',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
      })
      return response
    }
  }
  
  // No session and invalid/missing auth - prompt for credentials
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Mission Control"',
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
