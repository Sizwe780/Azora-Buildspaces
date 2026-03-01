import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { spawn } from 'child_process'
import path from 'path'

/**
 * POST /api/fs/exec
 * 
 * Executes a command in the workspace directory and returns the output.
 * This provides terminal functionality without requiring a separate
 * WebSocket server on port 3001.
 * 
 * Body: { command: string, workspaceId: string }
 * Returns: { stdout: string, stderr: string, exitCode: number }
 */

const BLOCKED_COMMANDS = ['rm -rf /', 'format', 'mkfs', 'dd if=', ':(){', 'fork bomb']
const MAX_OUTPUT_LENGTH = 100_000 // 100KB max output

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    try {
        const { command, workspaceId: reqWorkspaceId } = await request.json()
        const workspaceId = reqWorkspaceId || session.user?.id || 'default'

        if (!command || typeof command !== 'string') {
            return NextResponse.json({ error: 'Command is required' }, { status: 400 })
        }

        // Basic security: block dangerous commands
        const lowerCmd = command.toLowerCase()
        if (BLOCKED_COMMANDS.some(blocked => lowerCmd.includes(blocked))) {
            return NextResponse.json({ error: 'Command blocked for security' }, { status: 403 })
        }

        const workspaceRoot = path.join(process.cwd(), 'workspaces', workspaceId)

        return new Promise<NextResponse>((resolve) => {
            let stdout = ''
            let stderr = ''

            const isWindows = process.platform === 'win32'
            const shell = isWindows ? 'powershell.exe' : '/bin/bash'
            const shellArgs = isWindows ? ['-Command', command] : ['-c', command]

            const child = spawn(shell, shellArgs, {
                cwd: workspaceRoot,
                env: { ...process.env, FORCE_COLOR: '0' },
                timeout: 30000, // 30 second timeout
            })

            child.stdout?.on('data', (data) => {
                stdout += data.toString()
                if (stdout.length > MAX_OUTPUT_LENGTH) {
                    stdout = stdout.substring(0, MAX_OUTPUT_LENGTH) + '\n... (output truncated)'
                    child.kill()
                }
            })

            child.stderr?.on('data', (data) => {
                stderr += data.toString()
                if (stderr.length > MAX_OUTPUT_LENGTH) {
                    stderr = stderr.substring(0, MAX_OUTPUT_LENGTH) + '\n... (output truncated)'
                    child.kill()
                }
            })

            child.on('close', (exitCode) => {
                resolve(NextResponse.json({
                    stdout,
                    stderr,
                    exitCode: exitCode ?? -1
                }))
            })

            child.on('error', (error) => {
                resolve(NextResponse.json({
                    stdout,
                    stderr: error.message,
                    exitCode: -1
                }))
            })
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
