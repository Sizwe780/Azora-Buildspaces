/**
 * Innovation Theater — Viewers Route
 *
 * Tracks real-time viewer presence for a live session.
 * Uses Redis for persistence with in-memory fallback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedisClient } from '@/lib/redis-client'

interface Viewer {
  id: string
  name: string
  avatar?: string
  joinedAt: string
}

// In-memory fallback: sessionId -> viewerId -> Viewer
const sessionViewers = new Map<string, Map<string, Viewer>>()

async function getSessionViewersList(sessionId: string): Promise<Viewer[]> {
  const redis = await getRedisClient()
  if (redis) {
    const raw = await redis.hgetall(`theater:viewers:${sessionId}`)
    return Object.values(raw).map((val) => JSON.parse(val))
  }
  return Array.from(sessionViewers.get(sessionId)?.values() ?? [])
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId') ?? 'default'

  try {
    const viewersList = await getSessionViewersList(sessionId)
    return NextResponse.json({ viewers: viewersList, count: viewersList.length, sessionId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch viewers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId = 'default', viewerId, name, avatar, action = 'join' } = body

    if (!viewerId) {
      return NextResponse.json({ error: 'viewerId is required' }, { status: 400 })
    }

    let count = 0
    const redis = await getRedisClient()

    if (redis) {
      const key = `theater:viewers:${sessionId}`
      if (action === 'leave') {
        await redis.hdel(key, viewerId)
      } else {
        const viewer: Viewer = {
          id: viewerId,
          name: name ?? 'Anonymous',
          avatar,
          joinedAt: new Date().toISOString(),
        }
        await redis.hset(key, viewerId, JSON.stringify(viewer))
        await redis.expire(key, 60 * 60 * 24) // 24 hours
      }
      count = await redis.hlen(key)
    } else {
      let viewersMap = sessionViewers.get(sessionId)
      if (!viewersMap) {
        viewersMap = new Map()
        sessionViewers.set(sessionId, viewersMap)
      }

      if (action === 'leave') {
        viewersMap.delete(viewerId)
      } else {
        const existing = viewersMap.get(viewerId)
        viewersMap.set(viewerId, {
          id: viewerId,
          name: name ?? 'Anonymous',
          avatar,
          joinedAt: existing?.joinedAt ?? new Date().toISOString(),
        })
      }
      count = viewersMap.size
    }

    return NextResponse.json({ success: true, count, action, sessionId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update viewers' }, { status: 500 })
  }
}
