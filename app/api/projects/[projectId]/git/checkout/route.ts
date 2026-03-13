import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// POST /api/projects/[projectId]/git/checkout
export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId } = await params
    const { branch } = await request.json()

    if (!branch || typeof branch !== 'string') {
      return NextResponse.json(
        { error: 'Branch name is required' },
        { status: 400 }
      )
    }

    const projectPath = process.cwd()

    try {
      await execFileAsync('git', ['checkout', branch], { cwd: projectPath })
      return NextResponse.json({
        success: true,
        message: `Switched to branch '${branch}'`
      })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to checkout branch' },
      { status: 500 }
    )
  }
}