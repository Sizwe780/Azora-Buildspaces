import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  const userId = (session.user as any).id

  const encoder = new TextEncoder()
  let intervalId: ReturnType<typeof setInterval>
  let lastChecked = new Date()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode('event: connected\ndata: {"status":"connected"}\n\n'))

      // Poll for new notifications every 5 seconds
      intervalId = setInterval(async () => {
        try {
          const newNotifications = await prisma.notification.findMany({
            where: { userId, createdAt: { gt: lastChecked }, read: false },
            orderBy: { createdAt: 'desc' },
          })
          lastChecked = new Date()

          if (newNotifications.length > 0) {
            const data = JSON.stringify({ notifications: newNotifications, count: newNotifications.length })
            controller.enqueue(encoder.encode(`event: notification\ndata: ${data}\n\n`))
          }
        } catch {
          // DB unavailable — keep connection alive
        }
      }, 5000)
    },
    cancel() {
      clearInterval(intervalId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
