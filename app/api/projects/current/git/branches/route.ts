import { NextRequest, NextResponse } from 'next/server'
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Branches API
 * GET  /api/projects/current/git/branches  - list branches
 * POST /api/projects/current/git/branches  - create / switch / delete branch
 */
export async function GET() {
  try {
    const repoPath = process.cwd()
    const branches = await gitIntegrationService.getBranches(repoPath)
    return NextResponse.json({ branches })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, name, from } = await request.json()
    const repoPath = process.cwd()

    switch (action) {
      case 'create':
        if (!name) return NextResponse.json({ error: 'branch name required' }, { status: 400 })
        await gitIntegrationService.createBranch(repoPath, name, from)
        return NextResponse.json({ success: true, branch: name })

      case 'switch':
        if (!name) return NextResponse.json({ error: 'branch name required' }, { status: 400 })
        await gitIntegrationService.switchBranch(repoPath, name)
        return NextResponse.json({ success: true, branch: name })

      case 'delete':
        if (!name) return NextResponse.json({ error: 'branch name required' }, { status: 400 })
        await gitIntegrationService.deleteBranch(repoPath, name)
        return NextResponse.json({ success: true, deleted: name })

      case 'merge': {
        if (!name) return NextResponse.json({ error: 'branch name required' }, { status: 400 })
        const result = await gitIntegrationService.mergeBranch(repoPath, name)
        return NextResponse.json({ success: true, result })
      }

      default:
        return NextResponse.json({ error: 'Invalid action. Use: create, switch, delete, merge' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
