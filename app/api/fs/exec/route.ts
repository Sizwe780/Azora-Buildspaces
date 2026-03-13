import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { executeTerminalCommand, TerminalExecutionRequestError } from '@/lib/runtime/terminal-exec'

/**
 * POST /api/fs/exec
 *
 * Backward-compatible terminal execution endpoint.
 */
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    try {
        const body = await request.json().catch(() => ({}))

        const result = await executeTerminalCommand({
            command: String(body.command || ''),
            workspaceId: String(body.workspaceId || session.user?.id || 'default'),
            shell: body.shell,
            env: body.env,
            cwd: body.cwd,
            sessionId: body.sessionId,
        })

        return NextResponse.json(result)
    } catch (error) {
        if (error instanceof TerminalExecutionRequestError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode })
        }

        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
}
