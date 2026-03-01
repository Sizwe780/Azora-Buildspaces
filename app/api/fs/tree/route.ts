import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import fs from 'fs/promises'
import path from 'path'

/**
 * GET /api/fs/tree?workspaceId=xxx
 * 
 * Returns a recursive file tree for the given workspace as a flat 
 * array of { path, type, size } objects — the client Zustand store 
 * rebuilds its nested FileNode map from this list.
 */

interface TreeEntry {
    path: string       // relative to workspace root, e.g. "src/app/page.tsx"
    type: 'file' | 'directory'
    size: number
}

async function walkDir(dir: string, base: string): Promise<TreeEntry[]> {
    const entries: TreeEntry[] = []
    let items: any[]

    try {
        items = await fs.readdir(dir, { withFileTypes: true }) as any[]
    } catch {
        return entries
    }

    for (const item of items) {
        const name = String(item.name)
        // Skip hidden files/dirs and node_modules
        if (name.startsWith('.') || name === 'node_modules') continue

        const fullPath = path.join(dir, name)
        const relPath = path.relative(base, fullPath).replace(/\\/g, '/')

        if (item.isDirectory && item.isDirectory()) {
            entries.push({ path: relPath, type: 'directory', size: 0 })
            const children = await walkDir(fullPath, base)
            entries.push(...children)
        } else {
            try {
                const stat = await fs.stat(fullPath)
                entries.push({ path: relPath, type: 'file', size: stat.size })
            } catch {
                entries.push({ path: relPath, type: 'file', size: 0 })
            }
        }
    }

    return entries
}

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || session.user?.id || 'default'

    const workspaceRoot = path.join(process.cwd(), 'workspaces', workspaceId)

    try {
        await fs.access(workspaceRoot)
    } catch {
        // Workspace directory doesn't exist yet — return empty tree
        return NextResponse.json({ entries: [], exists: false })
    }

    const entries = await walkDir(workspaceRoot, workspaceRoot)
    return NextResponse.json({ entries, exists: true })
}
