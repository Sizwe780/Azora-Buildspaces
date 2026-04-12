import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'

/**
 * Deep Focus — Session History & Management
 * GET/POST /api/deep-focus/sessions
 *
 * Manages focus session records: list past sessions, retrieve stats.
 * Backed by Prisma FocusSession model.
 *
 * Industry parity: Toggl Track, RescueTime session log
 */

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10)

  const sessions = await prisma.focusSession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  })

  // Aggregate stats
  const allSessions = await prisma.focusSession.findMany({ where: { userId } })
  const totalMinutes = allSessions.reduce((sum, s) => sum + s.duration, 0)
  const completedSessions = allSessions.filter((s) => s.completed).length
  const completionRate =
    allSessions.length > 0 ? Math.round((completedSessions / allSessions.length) * 100) : 0

  return NextResponse.json({
    sessions,
    stats: {
      totalSessions: allSessions.length,
      totalMinutes,
      completedSessions,
      completionRate,
      avgDuration:
        allSessions.length > 0 ? Math.round(totalMinutes / allSessions.length) : 0,
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  try {
    const { session: sessionData } = await req.json()

    if (!sessionData) {
      return NextResponse.json({ error: 'Session data is required' }, { status: 400 })
    }

    const focusSession = await prisma.focusSession.create({
      data: {
        userId,
        duration: sessionData.duration ?? 25,
        mode: sessionData.mode ?? 'pomodoro',
        completed: sessionData.completed !== false,
        startedAt: sessionData.startedAt ? new Date(sessionData.startedAt) : new Date(),
        endedAt: sessionData.endedAt ? new Date(sessionData.endedAt) : new Date(),
      },
    })

    return NextResponse.json({ success: true, session: focusSession })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
