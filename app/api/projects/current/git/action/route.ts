import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { gitIntegrationService } from '@/lib/services/git-integration'

/**
 * Git Actions API
 * POST /api/projects/current/git/action
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const body = await req.json()
        const { action, payload } = body
        const repoPath = process.cwd()

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 })
        }

        switch (action) {
            case 'stage':
                if (payload?.files?.length === 0) {
                    await gitIntegrationService.stageAll(repoPath)
                } else if (payload?.files) {
                    await gitIntegrationService.stage(repoPath, payload.files)
                }
                break

            case 'unstage':
                if (payload?.files) {
                    await gitIntegrationService.unstage(repoPath, payload.files)
                }
                break

            case 'commit':
                if (!payload?.message) {
                    return NextResponse.json({ error: 'Commit message required' }, { status: 400 })
                }
                await gitIntegrationService.commit(repoPath, payload.message, { author: { name: session.user.name || 'User', email: session.user.email || 'user@example.com' } })
                break

            case 'sync':
                if (payload?.action === 'pull') {
                    await gitIntegrationService.pull(repoPath)
                } else if (payload?.action === 'push') {
                    await gitIntegrationService.push(repoPath)
                }
                break

            case 'checkout':
                if (payload?.branch) {
                    if (payload.create) {
                        await gitIntegrationService.createBranch(repoPath, payload.branch, { checkout: true })
                    } else {
                        await gitIntegrationService.switchBranch(repoPath, payload.branch)
                    }
                } else if (payload?.files) {
                    // discard changes logic
                    for (const file of payload.files) {
                        await gitIntegrationService.resolveConflict(repoPath, file, 'ours') // basic discard
                        // Actually, we should just checkout the file
                        const { execFile } = require('child_process');
                        const { promisify } = require('util');
                        const execFileAsync = promisify(execFile);
                        await execFileAsync('git', ['checkout', '--', file], { cwd: repoPath });
                    }
                }
                break

            case 'stash':
                if (payload?.action === 'push') {
                    await gitIntegrationService.stash(repoPath, payload.message)
                } else if (payload?.action === 'pop') {
                    // extract index from stashId like stash@{0}
                    const match = payload.stashId?.match(/stash@\{(\d+)\}/)
                    const index = match ? parseInt(match[1], 10) : 0
                    await gitIntegrationService.stashPop(repoPath, index)
                } else if (payload?.action === 'apply') {
                    // not directly implemented in service, fallback to raw exec
                    const match = payload.stashId?.match(/stash@\{(\d+)\}/)
                    const index = match ? parseInt(match[1], 10) : 0
                    const { execFile } = require('child_process');
                    const { promisify } = require('util');
                    const execFileAsync = promisify(execFile);
                    await execFileAsync('git', ['stash', 'apply', `stash@{${index}}`], { cwd: repoPath });
                } else if (payload?.action === 'drop') {
                    const match = payload.stashId?.match(/stash@\{(\d+)\}/)
                    const index = match ? parseInt(match[1], 10) : 0
                    await gitIntegrationService.stashDrop(repoPath, index)
                } else {
                    // List stashes
                    const stashes = await gitIntegrationService.stashList(repoPath)
                    return NextResponse.json({ success: true, stashes })
                }
                break

            case 'branches':
                const branches = await gitIntegrationService.getBranches(repoPath)
                return NextResponse.json({ success: true, branches })

            case 'log':
                // limit logic could go here
                const commits = await gitIntegrationService.getLog(repoPath, { maxCount: 30 })
                const mappedCommits = commits.map(c => ({
                    hash: c.oid,
                    message: c.message,
                    author: c.author.name,
                    date: new Date(c.author.timestamp).toLocaleDateString()
                }))
                return NextResponse.json({ success: true, commits: mappedCommits })

            case 'diff':
                // To provide backward compatibility with gitApi("diff?file=...")
                const fileDiff = await gitIntegrationService.getDiff(repoPath, payload.file)
                return NextResponse.json({ success: true, patch: fileDiff.patch })

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Git action failed' }, { status: 500 })
    }
}
