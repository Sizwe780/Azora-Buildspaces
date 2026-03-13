import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// POST /api/projects/[projectId]/git/unstage
export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const { files } = await request.json()

    if (!Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files must be an array' },
        { status: 400 }
      )
    }

    const projectPath = process.cwd()

    try {
      if (files.length === 0) {
        // Unstage all changes
        await execFileAsync('git', ['reset', 'HEAD'], { cwd: projectPath })
      } else {
        // Unstage specific files
        for (const file of files) {
          await execFileAsync('git', ['reset', 'HEAD', file], { cwd: projectPath })
        }
      }

      return NextResponse.json({
        success: true,
        message: `Unstaged ${files.length === 0 ? 'all changes' : files.length + ' file(s)'}`
      })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to unstage files' },
      { status: 500 }
    )
  }
}