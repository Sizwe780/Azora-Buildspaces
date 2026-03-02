import { NextRequest, NextResponse } from 'next/server'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Diff API
 * GET /api/projects/current/git/diff?file=path/to/file
 * GET /api/projects/current/git/diff  (all changes)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')
    const repoPath = process.cwd()

    if (file) {
      const diff = await gitIntegrationService.getDiff(repoPath, file)
      return NextResponse.json({ diff })
    } else {
      const diffs = await gitIntegrationService.getDiffAll(repoPath)
      return NextResponse.json({ diffs })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
