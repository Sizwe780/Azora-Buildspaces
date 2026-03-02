import { NextRequest, NextResponse } from 'next/server'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Commit API
 * POST /api/projects/current/git/commit
 * Body: { message: string, amend?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { message, amend } = await request.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'commit message required' }, { status: 400 })
    }

    const repoPath = process.cwd()
    const commit = await gitIntegrationService.commit(repoPath, message, {
      amend: amend || false,
    })

    return NextResponse.json({ success: true, commit })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to commit' },
      { status: 500 }
    )
  }
}
