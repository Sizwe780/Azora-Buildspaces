import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

interface GitCommit {
  hash: string
  message: string
  author: string
  date: string
  filesChanged: number
}

// GET /api/projects/[projectId]/git/log
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const projectPath = process.cwd()

    try {
      // Get commit log with detailed format
      const { stdout } = await execFileAsync('git', [
        'log',
        '--oneline',
        '--pretty=format:%H|%s|%an|%ad|%w(0,0,0)',
        '--date=short',
        `--max-count=${limit}`
      ], { cwd: projectPath })

      const commits: GitCommit[] = stdout.split('\n')
        .filter(Boolean)
        .map(line => {
          const [hash, message, author, date] = line.split('|')
          return {
            hash: hash.slice(0, 7),
            message,
            author,
            date,
            filesChanged: 0 // We'll get this separately if needed
          }
        })

      return NextResponse.json({ commits })
    } catch (e: any) {
      // Not a git repo or no commits
      return NextResponse.json({ commits: [] })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch git log' },
      { status: 500 }
    )
  }
}