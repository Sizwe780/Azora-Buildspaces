import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Unstage API
 * POST /api/projects/current/git/unstage
 * Body: { files: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { files } = await request.json()
    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'files array required' }, { status: 400 })
    }

    const repoPath = process.cwd()

    for (const file of files) {
      await gitIntegrationService.unstage(repoPath, file)
    }

    return NextResponse.json({ success: true, unstaged: files })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to unstage files' },
      { status: 500 }
    )
  }
}
