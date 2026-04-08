import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Log API
 * GET /api/projects/current/git/log?limit=50&file=optional/path
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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
