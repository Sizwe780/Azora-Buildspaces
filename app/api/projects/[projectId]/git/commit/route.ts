import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// POST /api/projects/[projectId]/git/commit
export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid commit message' },
        { status: 400 }
      )
    }

    // Implement actual git commit using system git
    const projectPath = process.cwd()
    // Ensure git user is configured in this environment
    await execFileAsync('git', ['config', 'user.email', 'buildspaces@example.com'], { cwd: projectPath })
    await execFileAsync('git', ['config', 'user.name', 'BuildSpaces Test'], { cwd: projectPath })

    try {
      await execFileAsync('git', ['add', '.'], { cwd: projectPath })
      await execFileAsync('git', ['commit', '-m', message], { cwd: projectPath })
      const { stdout: rev } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: projectPath })
      return NextResponse.json({ success: true, commitHash: rev.trim(), message: 'Changes committed successfully' })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to commit changes' },
      { status: 500 }
    )
  }
}
