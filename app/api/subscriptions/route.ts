import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'

/**
 * Subscription Management API
 *
 * SECURITY: Requires authentication for all operations
 */

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { billingHistory: { orderBy: { billedAt: 'desc' }, take: 10 } },
    })

    return NextResponse.json({ subscription })
  } catch (err: any) {
    console.error('[subscriptions] GET error', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()

    // Only allow updating safe fields
    const { cancelledAt, cancelReason, tier, status, metadata } = body
    const updateData: Record<string, unknown> = {}
    if (cancelledAt !== undefined) updateData.cancelledAt = cancelledAt ? new Date(cancelledAt) : null
    if (cancelReason !== undefined) updateData.cancelReason = cancelReason
    if (tier !== undefined) updateData.tier = tier
    if (status !== undefined) updateData.status = status
    if (metadata !== undefined) updateData.metadata = metadata

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      update: updateData,
      create: { userId, ...updateData },
    })

    return NextResponse.json({ subscription })
  } catch (err: any) {
    console.error('[subscriptions] PUT error', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
