import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { request: updateRequest } = await request.json()
    if (!updateRequest || typeof updateRequest !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/bible_update_requests`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ request: updateRequest })
    })
    if (res.ok || res.status === 201) {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: false, error: await res.text() }, { status: 500 })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
