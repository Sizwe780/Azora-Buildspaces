import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Git Stash API
 * GET  /api/projects/current/git/stash - list stashes
 * POST /api/projects/current/git/stash - push/pop/apply stash
 */
export async function GET() {
  try {
    const projectPath = process.cwd()
    const { stdout } = await execFileAsync('git', ['stash', 'list'], { cwd: projectPath })

    const stashes = stdout.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^stash@\{(\d+)\}: (.+)$/)
      return match ? { id: match[1], message: match[2] } : null
    }).filter(Boolean)

    return NextResponse.json({ stashes })
  } catch {
    return NextResponse.json({ stashes: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, message, stashId } = await request.json()
    const projectPath = process.cwd()

    if (action === 'push') {
      const args = ['stash', 'push']
      if (message) args.push('-m', message)
      await execFileAsync('git', args, { cwd: projectPath })
      return NextResponse.json({ success: true, message: 'Changes stashed' })
    }

    if (action === 'pop') {
      const args = ['stash', 'pop']
      if (stashId) args.push(`stash@{${stashId}}`)
      await execFileAsync('git', args, { cwd: projectPath })
      return NextResponse.json({ success: true, message: 'Stash popped' })
    }

    if (action === 'apply') {
      const args = ['stash', 'apply']
      if (stashId) args.push(`stash@{${stashId}}`)
      await execFileAsync('git', args, { cwd: projectPath })
      return NextResponse.json({ success: true, message: 'Stash applied' })
    }

    if (action === 'drop') {
      const args = ['stash', 'drop']
      if (stashId) args.push(`stash@{${stashId}}`)
      await execFileAsync('git', args, { cwd: projectPath })
      return NextResponse.json({ success: true, message: 'Stash dropped' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Stash operation failed' }, { status: 500 })
  }
}
