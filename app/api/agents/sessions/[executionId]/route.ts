import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'
import { loadExecutionState } from '@/lib/agents/persistence'

/**
 * Execution Session Details API
 *
 * Returns details for a specific agent execution session.
 * SECURITY: Requires authentication.
 */

const serializeFirestore = (record: any) => {
  if (!record) return null
  const updatedAt = record?.updatedAt?.toDate
    ? record.updatedAt.toDate().toISOString()
    : record.updatedAt
  const trace = Array.isArray(record.trace)
    ? record.trace.map((step: any) => ({
        ...step,
        timestamp: step.timestamp?.toDate
          ? step.timestamp.toDate().toISOString()
          : step.timestamp,
      }))
    : []
  return { ...record, updatedAt, trace }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { executionId } = await params

    // Try Prisma first
    const execution = await prisma.buildSpaceExecution.findUnique({
      where: { id: executionId },
      include: { project: true, spec: true },
    })

    if (execution) {
      return NextResponse.json({ record: execution }, { status: 200 })
    }

    // Fall back to Firestore for legacy records
    const record = await loadExecutionState(executionId)
    if (!record) {
      return NextResponse.json({ record: null }, { status: 200 })
    }
    return NextResponse.json({ record: serializeFirestore(record) }, { status: 200 })
  } catch (error) {
    console.error('[agents/sessions] failed to load', error)
    return NextResponse.json({ record: null }, { status: 200 })
  }
}
