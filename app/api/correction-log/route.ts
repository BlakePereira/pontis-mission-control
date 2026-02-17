import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const workspacePath = process.env.WORKSPACE_PATH || '/Users/claraadkinson/.openclaw/workspace'
    const filePath = path.join(workspacePath, 'memory', 'correction-log.md')
    const content = await fs.readFile(filePath, 'utf-8')
    return NextResponse.json({ content })
  } catch {
    return NextResponse.json({
      content: '',
      error: 'File not accessible on this instance',
    })
  }
}
