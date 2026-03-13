import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// POST /api/projects/[projectId]/git/sync
export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const { action } = await request.json()

    if (!action || !['push', 'pull'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "push" or "pull"' },
        { status: 400 }
      )
    }

    const projectPath = process.cwd()

    try {
      if (action === 'push') {
        const { stdout, stderr } = await execFileAsync('git', ['push', '--all', '--no-verify'], { cwd: projectPath })
        return NextResponse.json({
          success: true,
          stdout,
          stderr,
          message: 'Push completed successfully'
        })
      } else if (action === 'pull') {
        const { stdout, stderr } = await execFileAsync('git', ['pull', '--no-edit'], { cwd: projectPath })
        return NextResponse.json({
          success: true,
          stdout,
          stderr,
          message: 'Pull completed successfully'
        })
      }
    } catch (e: any) {
      return NextResponse.json({
        error: e.message,
        stdout: e.stdout || '',
        stderr: e.stderr || ''
      }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to sync changes' },
      { status: 500 }
    )
  }
}