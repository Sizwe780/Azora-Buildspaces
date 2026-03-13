/**
 * Innovation Theater — Viewers Route
 *
 * Tracks real-time viewer presence for a live session.
 * Uses an in-memory map keyed by session ID with Redis fallback for persistence.
 */

import { NextRequest, NextResponse } from "next/server"
import { Redis } from "ioredis"

interface Viewer {
  id: string
  name: string
  avatar?: string
  joinedAt: string
}

let redis: Redis | null = null
if (process.env.REDIS_URL && process.env.NODE_ENV !== "test") {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    })
    
    // Handle connection errors gracefully
    redis.on('error', (err: Error) => {
      console.warn('[Theater] Redis connection error:', err.message)
      // Don't crash the app on Redis errors
    })
    
    redis.on('connect', () => {
      console.log('[Theater] Redis connected successfully')
    })
    
    // Try to connect but don't block startup
    redis.connect().catch((err) => {
      console.warn('[Theater] Redis connection failed, using in-memory fallback:', err instanceof Error ? err.message : String(err))
      redis = null
    })
  } catch (err) {
    console.warn("[Theater] Failed to initialize Redis:", err)
    redis = null
  }
}

// In-memory fallback
const sessionViewers = new Map<string, Map<string, Viewer>>()

async function getSessionViewersCount(sessionId: string): Promise<number> {
  if (redis) {
    return await redis.hlen(`theater:viewers:${sessionId}`)
  } else {
    return sessionViewers.get(sessionId)?.size ?? 0
  }
}

async function getSessionViewersList(sessionId: string): Promise<Viewer[]> {
  if (redis) {
    const raw = await redis.hgetall(`theater:viewers:${sessionId}`)
    return Object.values(raw).map((val) => JSON.parse(val))
  } else {
    return Array.from(sessionViewers.get(sessionId)?.values() ?? [])
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId") ?? "default"

  const viewersList = await getSessionViewersList(sessionId)
  return NextResponse.json({ viewers: viewersList, count: viewersList.length, sessionId })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId = "default", viewerId, name, avatar, action = "join" } = body

    if (!viewerId) {
      return NextResponse.json({ error: "viewerId is required" }, { status: 400 })
    }

    let count = 0

    if (redis) {
      const key = `theater:viewers:${sessionId}`
      if (action === "leave") {
        await redis.hdel(key, viewerId)
      } else {
        const viewer: Viewer = {
          id: viewerId,
          name: name ?? "Anonymous",
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

      if (action === "leave") {
        viewersMap.delete(viewerId)
      } else {
        const existing = viewersMap.get(viewerId)
        viewersMap.set(viewerId, {
          id: viewerId,
          name: name ?? "Anonymous",
          avatar,
          joinedAt: existing?.joinedAt ?? new Date().toISOString(),
        })
      }
      count = viewersMap.size
    }

    return NextResponse.json({
      success: true,
      count,
      action,
      sessionId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update viewers" }, { status: 500 })
  }
}
