import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import fs from 'fs/promises'
import path from 'path'
import { projectTemplates } from '@/lib/templates/project-templates'

const WORKSPACE_ID_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/

/**
 * POST /api/fs/scaffold
 * 
 * Creates a new workspace directory from a project template.
 * Body: { templateId: string, workspaceId?: string }
 * 
 * This writes real files to disk under workspaces/{workspaceId}/
 * so that the /api/fs routes can operate on them.
 */
export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { templateId, workspaceId: reqWorkspaceId } = body
    const workspaceIdRaw = reqWorkspaceId || session.user?.id || 'default'
    const workspaceId = String(workspaceIdRaw)

    if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
        return NextResponse.json({ error: 'Invalid workspaceId' }, { status: 400 })
    }

    // Find template
    const template = projectTemplates.find(t => t.id === templateId)
    if (!template) {
        return NextResponse.json({ error: `Template "${templateId}" not found` }, { status: 404 })
    }

    const workspacesBase = path.resolve(process.cwd(), 'workspaces')
    const workspaceRoot = path.resolve(workspacesBase, workspaceId)
    if (!workspaceRoot.startsWith(workspacesBase + path.sep) && workspaceRoot !== workspacesBase) {
        return NextResponse.json({ error: 'Invalid workspace path' }, { status: 400 })
    }

    try {
        // Create workspace root
        await fs.mkdir(workspaceRoot, { recursive: true })

        // Write all template files
        for (const [filePath, fileData] of Object.entries(template.files)) {
            const fullPath = path.resolve(workspaceRoot, filePath)
            if (!fullPath.startsWith(workspaceRoot + path.sep) && fullPath !== workspaceRoot) {
                throw new Error(`Template path escapes workspace root: ${filePath}`)
            }

            if (fileData.type === 'directory') {
                await fs.mkdir(fullPath, { recursive: true })
            } else {
                // Ensure parent directory exists
                await fs.mkdir(path.dirname(fullPath), { recursive: true })
                await fs.writeFile(fullPath, fileData.content, 'utf-8')
            }
        }

        return NextResponse.json({
            success: true,
            workspaceId,
            template: template.id,
            fileCount: Object.keys(template.files).filter(
                k => template.files[k].type === 'file'
            ).length
        })
    } catch (error: any) {
        console.error('Scaffold error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
