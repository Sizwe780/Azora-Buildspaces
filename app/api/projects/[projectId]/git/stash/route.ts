import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

interface GitStash {
  id: string
  message: string
}

// GET /api/projects/[projectId]/git/stash?action=list
// POST /api/projects/[projectId]/git/stash
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
      const { stdout } = await execFileAsync('git', ['stash', 'list'], { cwd: projectPath })

      const stashes: GitStash[] = stdout.split('\n')
        .filter(Boolean)
        .map(line => {
          const match = line.match(/^stash@{(\d+)}: (.+)$/)
          if (match) {
            return {
              id: match[1],
              message: match[2]
            }
          }
          return null
        })
        .filter(Boolean) as GitStash[]

      return NextResponse.json({ stashes })
    } catch (e: any) {
      return NextResponse.json({ stashes: [] })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list stashes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const { action, message, stashId } = await request.json()

    const projectPath = process.cwd()

    try {
      if (action === 'push') {
        const args = ['stash', 'push']
        if (message) args.push('-m', message)
        await execFileAsync('git', args, { cwd: projectPath })
        return NextResponse.json({
          success: true,
          message: 'Changes stashed successfully'
        })
      } else if (action === 'pop') {
        const args = ['stash', 'pop']
        if (stashId) args.push(`stash@{${stashId}}`)
        await execFileAsync('git', args, { cwd: projectPath })
        return NextResponse.json({
          success: true,
          message: 'Stash popped successfully'
        })
      } else {
        return NextResponse.json(
          { error: 'Invalid action. Must be "push" or "pop"' },
          { status: 400 }
        )
      }
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to perform stash operation' },
      { status: 500 }
    )
  }
}