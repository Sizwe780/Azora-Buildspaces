import { NextRequest, NextResponse } from 'next/server'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Log API
 * GET /api/projects/current/git/log?limit=50&file=optional/path
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const maxCount = parseInt(searchParams.get('limit') || '50', 10)
    const filepath = searchParams.get('file') || undefined
    const repoPath = process.cwd()

    const log = await gitIntegrationService.getLog(repoPath, { maxCount, filepath })
    return NextResponse.json({ commits: log })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
