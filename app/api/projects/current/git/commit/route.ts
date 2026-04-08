import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Commit API
 * POST /api/projects/current/git/commit
 * Body: { message: string, amend?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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
