import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { gitIntegrationService } from '@/lib/services/git-integration'
import fs from 'fs/promises'
import path from 'path'

function resolveRepoFilePath(repoPath: string, file: string): string | null {
  const normalized = file.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.includes('\0')) {
    return null
  }

  const absolute = path.resolve(repoPath, normalized)
  if (absolute !== repoPath && !absolute.startsWith(repoPath + path.sep)) {
    return null
  }

  return absolute
}

/**
 * Git Diff API
 * GET /api/projects/current/git/diff?file=path/to/file
 * GET /api/projects/current/git/diff  (all changes)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const file = searchParams.get('file')
    const repoPath = process.cwd()

    if (file) {
      const absolutePath = resolveRepoFilePath(repoPath, file)
      if (!absolutePath) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
      }

      const diff = await gitIntegrationService.getDiff(repoPath, file)
      const [originalContent, modifiedContent] = await Promise.all([
        gitIntegrationService.getFileAtCommit(repoPath, file, 'HEAD').catch(() => ''),
        fs.readFile(absolutePath, 'utf-8').catch(() => ''),
      ])

      return NextResponse.json({
        diff,
        originalContent,
        modifiedContent,
      })
    } else {
      const diffs = await gitIntegrationService.getDiffAll(repoPath)
      return NextResponse.json({ diffs })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
