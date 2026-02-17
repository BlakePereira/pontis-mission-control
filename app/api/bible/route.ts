import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const runtime = 'nodejs'

export async function GET() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/documents?key=eq.pontis-bible&select=content,updated_at`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    )
    const data = await res.json()
    if (data && data[0]) {
      return NextResponse.json({ content: data[0].content, lastModified: data[0].updated_at })
    }
    return NextResponse.json({ content: '', error: 'Document not found' })
  } catch (err) {
    return NextResponse.json({ content: '', error: String(err) })
  }
}
