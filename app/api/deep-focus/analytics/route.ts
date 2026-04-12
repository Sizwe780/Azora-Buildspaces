/**
 * Deep Focus — Analytics & Insights API
 *
 * Industry leaders: RescueTime, Forest, Centered, Toggl
 * Analytics computed from DB (FocusSession model).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const userId = (session.user as any).id as string

  // Total sessions count
  const totalSessions = await prisma.focusSession.count({ where: { userId } })

  // Total completed minutes
  const minutesAgg = await prisma.focusSession.aggregate({
    _sum: { duration: true },
    where: { userId, completed: true },
  })
  const totalMinutes = minutesAgg._sum.duration ?? 0

  // All sessions for streak + heatmap + daily totals
  const allSessions = await prisma.focusSession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true, duration: true, completed: true },
  })

  // Streak calculation
  const today = new Date()
  let streak = 0
  for (let d = 0; d < 365; d++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - d)
    const dateStr = checkDate.toISOString().split('T')[0]
    const hasSession = allSessions.some(
      (s) => s.startedAt.toISOString().split('T')[0] === dateStr,
    )
    if (hasSession) streak++
    else break
  }

  // Weekly heatmap (7 days × 24 hours)
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  allSessions.forEach((s) => {
    const day = s.startedAt.getDay()
    const hour = s.startedAt.getHours()
    heatmap[day][hour] += s.duration
  })

  // Daily totals for the last 30 days
  const dailyTotals: { date: string; minutes: number; sessions: number }[] = []
  for (let d = 29; d >= 0; d--) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - d)
    const dateStr = checkDate.toISOString().split('T')[0]
    const daySessions = allSessions.filter(
      (s) => s.startedAt.toISOString().split('T')[0] === dateStr,
    )
    dailyTotals.push({
      date: dateStr,
      minutes: daySessions.reduce((sum, s) => sum + s.duration, 0),
      sessions: daySessions.length,
    })
  }

  const avgSessionMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0
  const bestDay = dailyTotals.reduce(
    (best, day) => (day.minutes > best.minutes ? day : best),
    { date: '', minutes: 0, sessions: 0 },
  )

  return NextResponse.json({
    streak,
    totalMinutes,
    totalSessions,
    avgSessionMinutes,
    bestDay,
    heatmap,
    dailyTotals,
    goals: {
      dailyMinutes: 120,
      weeklyMinutes: 600,
      monthlyMinutes: 2400,
      dailyProgress: Math.min(
        100,
        Math.round(((dailyTotals[dailyTotals.length - 1]?.minutes ?? 0) / 120) * 100),
      ),
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
    const body = await req.json()
    const { action, data } = body

    if (action === 'log-session') {
      const focusSession = await prisma.focusSession.create({
        data: {
          userId,
          duration: data?.duration ?? 25,
          mode: data?.mode ?? 'pomodoro',
          completed: data?.completed !== false,
        },
      })
      const totalSessions = await prisma.focusSession.count({ where: { userId } })
      return NextResponse.json({ success: true, totalSessions, session: focusSession })
    }

    if (action === 'ai-insights') {
      const recentSessions = await prisma.focusSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 50,
        select: { duration: true, mode: true, completed: true, startedAt: true },
      })
      const totalSessions = await prisma.focusSession.count({ where: { userId } })
      const avgDuration =
        recentSessions.length > 0
          ? Math.round(recentSessions.reduce((s, ses) => s + ses.duration, 0) / recentSessions.length)
          : 0

      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          productivityScore: z.number().min(0).max(100),
          peakHours: z.array(z.string()),
          insights: z.array(z.string()),
          recommendations: z.array(z.string()),
          encouragement: z.string(),
        }),
        prompt: `Analyze this developer's focus session data and provide actionable insights.
        
Sessions: ${JSON.stringify(recentSessions)}
Total sessions: ${totalSessions}
Average session: ${avgDuration} minutes

Provide:
1. Productivity score (0-100)
2. Best hours for deep work
3. Key insights about patterns
4. Recommendations for improvement
5. An encouraging message aligned with Ubuntu philosophy ("I am because we are")

Be warm, specific, and actionable. Respect the user's autonomy.`,
      })
      return NextResponse.json(result.object)
    }

    if (action === 'set-goal') {
      return NextResponse.json({ success: true, goal: data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
