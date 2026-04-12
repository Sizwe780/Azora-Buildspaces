import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'

/**
 * Project Snapshot API
 *
 * Returns the current state of a project including specs and recent executions.
 * SECURITY: Requires authentication and project ownership.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { projectId } = await params

    const project = await prisma.buildSpaceProject.findUnique({
      where: { id: projectId },
      include: {
        specs: { orderBy: { updatedAt: 'desc' } },
        executions: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify ownership
    if (project.ownerId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ snapshot: project })
  } catch (err: any) {
    console.error('[projects/snapshot] GET error', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
