import { NextRequest, NextResponse } from 'next/server'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Push / Pull / Fetch API
 * POST /api/projects/current/git/sync
 * Body: { action: 'push' | 'pull' | 'fetch', remote?: string, branch?: string, force?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { action, remote, branch, force } = await request.json()
    const repoPath = process.cwd()
    const r = remote || 'origin'

    switch (action) {
      case 'push':
        await gitIntegrationService.push(repoPath, {
          remote: r,
          branch,
          force: force || false,
        })
        return NextResponse.json({ success: true, action: 'pushed', remote: r })

      case 'pull':
        await gitIntegrationService.pull(repoPath, { remote: r, branch })
        return NextResponse.json({ success: true, action: 'pulled', remote: r })

      case 'fetch':
        await gitIntegrationService.fetch(repoPath, { remote: r })
        return NextResponse.json({ success: true, action: 'fetched', remote: r })

      default:
        return NextResponse.json({ error: 'Invalid action. Use: push, pull, fetch' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
