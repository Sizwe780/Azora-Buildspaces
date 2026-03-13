import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

interface GitBranch {
  name: string
  current: boolean
}

// GET /api/projects/[projectId]/git/branches
export async function GET(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const projectPath = process.cwd()

    try {
      const { stdout } = await execFileAsync('git', ['branch', '--list'], { cwd: projectPath })
      const { stdout: currentBranch } = await execFileAsync('git', ['branch', '--show-current'], { cwd: projectPath })

      const branches: GitBranch[] = stdout.split('\n')
        .filter(Boolean)
        .map(line => {
          const isCurrent = line.startsWith('* ')
          const name = line.replace(/^\*?\s*/, '').trim()
          return {
            name,
            current: name === currentBranch.trim()
          }
        })

      return NextResponse.json({ branches })
    } catch (e: any) {
      // Not a git repo
      return NextResponse.json({ branches: [] })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch git branches' },
      { status: 500 }
    )
  }
}