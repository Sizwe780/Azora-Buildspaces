import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  const userId = (session.user as any).id

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  const notifications = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  const unreadCount = await prisma.notification.count({ where: { userId, read: false } })
  return NextResponse.json({ notifications, unreadCount })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  const userId = (session.user as any).id

  const body = await request.json()

  if (body.action === 'mark-read') {
    await prisma.notification.updateMany({
      where: { userId, ...(body.id ? { id: body.id } : {}) },
      data: { read: true },
    })
    return NextResponse.json({ success: true })
  }

  // Create notification
  const notification = await prisma.notification.create({
    data: {
      userId,
      type: body.type || 'SYSTEM_ALERT',
      title: body.title,
      message: body.message,
      data: body.data,
    },
  })
  return NextResponse.json({ success: true, notification })
}
