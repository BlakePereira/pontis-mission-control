import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { request: updateRequest } = await request.json()
    if (!updateRequest || typeof updateRequest !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
    }

    const workspacePath = process.env.WORKSPACE_PATH || '/Users/claraadkinson/.openclaw/workspace'
    const filePath = path.join(workspacePath, 'bank', 'bible-update-requests.md')

    const timestamp = new Date().toISOString()
    const entry = `\n## ${timestamp}\n\n${updateRequest.trim()}\n`

    // Ensure file exists with a header, then append
    try {
      await fs.access(filePath)
    } catch {
      await fs.writeFile(filePath, '# Bible Update Requests\n\n', 'utf-8')
    }

    await fs.appendFile(filePath, entry, 'utf-8')
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({
      ok: false,
      error: 'File not accessible on this instance',
    }, { status: 500 })
  }
}
