import { NextRequest, NextResponse } from 'next/server'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Unstage API
 * POST /api/projects/current/git/unstage
 * Body: { files: string[] }
 */
export async function POST(request: NextRequest) {
  try {
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
