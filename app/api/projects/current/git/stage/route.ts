import { NextRequest, NextResponse } from 'next/server'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Stage API
 * POST /api/projects/current/git/stage
 * Body: { files: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json()
    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'files array required' }, { status: 400 })
    }

    const repoPath = process.cwd()

    if (files.length === 0) {
      // Stage all
      await gitIntegrationService.stageAll(repoPath)
    } else {
      for (const file of files) {
        await gitIntegrationService.stage(repoPath, file)
      }
    }

    return NextResponse.json({ success: true, staged: files })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to stage files' },
      { status: 500 }
    )
  }
}
