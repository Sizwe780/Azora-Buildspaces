import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

/**
 * Git Checkout API
 * POST /api/projects/current/git/checkout
 */
export async function POST(request: NextRequest) {
  try {
    const { branch, create } = await request.json()

    if (!branch || typeof branch !== 'string') {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 })
    }

    const projectPath = process.cwd()
    const args = create ? ['checkout', '-b', branch] : ['checkout', branch]

    try {
      await execFileAsync('git', args, { cwd: projectPath })
      return NextResponse.json({
        success: true,
        message: create ? `Created and switched to branch '${branch}'` : `Switched to branch '${branch}'`,
      })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to checkout branch' }, { status: 500 })
  }
}
