import { NextRequest, NextResponse } from 'next/server'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Blame API (project-scoped)
 * GET /api/projects/[projectId]/git/blame?file=<filepath>
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const file = request.nextUrl.searchParams.get('file')
    if (!file) {
      return NextResponse.json(
        { error: 'Missing required query parameter: file' },
        { status: 400 }
      )
    }

    // For now all projects resolve to cwd
    const repoPath = process.cwd()
    const result = await gitIntegrationService.getBlame(repoPath, file)

    const blame = result.lines.map(line => ({
      lineNumber: line.lineNumber,
      author: line.commit.author,
      date: formatRelativeDate(line.commit.timestamp),
      commit: line.commit.oid.slice(0, 7),
      message: line.commit.message,
      email: line.commit.email,
    }))

    return NextResponse.json({ blame, filepath: result.filepath, projectId })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get git blame' },
      { status: 500 }
    )
  }
}

function formatRelativeDate(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (months > 0) return `${months}mo ago`
  if (weeks > 0) return `${weeks}w ago`
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}
