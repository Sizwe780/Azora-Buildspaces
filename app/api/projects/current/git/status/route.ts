import { NextRequest, NextResponse } from 'next/server'
import { gitIntegrationService, GitFileStatus } from '@/lib/services/git-integration'

/**
 * Git Status API
 * GET /api/projects/current/git/status
 */
export async function GET() {
  try {
    const repoPath = process.cwd()
    const status = await gitIntegrationService.getStatus(repoPath)

    // Map to the format expected by SourceControlView
    return NextResponse.json({
      branch: status.branch,
      hasChanges: status.files.length > 0,
      stagedFiles: status.files
        .filter((f: GitFileStatus) => f.staged)
        .map((f: GitFileStatus) => f.filepath),
      unstagedFiles: status.files
        .filter((f: GitFileStatus) => !f.staged)
        .map((f: GitFileStatus) => f.filepath),
      files: status.files,
      ahead: status.ahead,
      behind: status.behind,
      isClean: status.isClean,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get Git status' },
      { status: 500 }
    )
  }
}
