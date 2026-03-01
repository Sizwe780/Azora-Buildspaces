import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import fs from 'fs/promises'
import path from 'path'

/**
 * GET /api/fs/content?path=src/app/page.tsx&workspaceId=xxx
 * 
 * Returns the content of a single file within a workspace.
 * Used by the Zustand file system store for lazy file loading.
 */

function validateWorkspacePath(targetPath: string, workspaceId: string) {
    const normalizedPath = path.normalize(targetPath)
    if (normalizedPath.includes('..')) {
        return { valid: false, error: 'Path traversal detected' }
    }
    const workspaceRoot = path.join(process.cwd(), 'workspaces', workspaceId)
    const absolutePath = path.resolve(workspaceRoot, normalizedPath)
    if (!absolutePath.startsWith(workspaceRoot)) {
        return { valid: false, error: 'Access denied: Path outside workspace' }
    }
    return { valid: true, absolutePath }
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetPath = searchParams.get('path')
    const workspaceId = searchParams.get('workspaceId') || session.user?.id || 'default'

    if (!targetPath) {
        return NextResponse.json({ error: 'Path is required' }, { status: 400 })
    }

    const validation = validateWorkspacePath(targetPath, workspaceId)
    if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 403 })
    }

    try {
        const content = await fs.readFile(validation.absolutePath!, 'utf-8')
        return NextResponse.json({ content })
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
