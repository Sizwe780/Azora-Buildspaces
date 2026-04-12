/**
 * Cross-Room API — Room interconnection, activity feed, and analytics
 *
 * This endpoint powers the cross-room activity feed that shows
 * what's happening across all rooms. Industry leaders (Linear, Notion, Figma)
 * all have activity feeds — this is ours.
 *
 * Constitutional Compliance:
 * - Ubuntu Philosophy: Transparency across all rooms
 * - Collective Benefit: Everyone sees the community's progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/database/client'

const activitySchema = z.object({
  room: z.string().max(100),
  action: z.string().max(200),
  description: z.string().max(500),
  metadata: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const room = searchParams.get('room')
  const limit = parseInt(searchParams.get('limit') || '50')

  const filtered = await prisma.activityEntry.findMany({
    where: { ...(room ? { room } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Room analytics — count all entries per room
  const allEntries = await prisma.activityEntry.findMany({
    select: { room: true, createdAt: true },
  })

  const roomCounts = allEntries.reduce((acc, a) => {
    if (a.room) acc[a.room] = (acc[a.room] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Activity heatmap (last 24 hours by hour)
  const now = Date.now()
  const heatmap = Array.from({ length: 24 }, (_, hour) => {
    const start = now - (23 - hour) * 3600000
    const end = start + 3600000
    return {
      hour,
      count: allEntries.filter((a) => {
        const t = new Date(a.createdAt).getTime()
        return t >= start && t < end
      }).length,
    }
  })

  return NextResponse.json({
    activities: filtered,
    totalActivities: allEntries.length,
    roomAnalytics: roomCounts,
    heatmap,
    mostActiveRoom: Object.entries(roomCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = activitySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const { room, action, metadata, userId } = result.data

    const activity = await prisma.activityEntry.create({
      data: {
        userId: userId || 'system',
        type: action,
        room,
        metadata,
      },
    })

    return NextResponse.json({ success: true, activity })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
