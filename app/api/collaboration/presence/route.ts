import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth/config'
import { getRedisClient } from '@/lib/redis-client'

const presenceSchema = z.object({
  roomId: z.string().max(200).optional(),
  userId: z.string().max(200),
  displayName: z.string().max(100).optional(),
  status: z.enum(['online', 'idle', 'focus', 'away']).optional(),
  currentFile: z.string().max(500).optional(),
  currentRoom: z.string().max(200).optional(),
  cursor: z.object({ line: z.number(), column: z.number() }).optional(),
})

/**
 * Collaboration — Presence API (Figma Live parity)
 * GET/POST /api/collaboration/presence
 *
 * Tracks who is online, what they're working on, and their status.
 * Updates are polled or pushed via SSE/WebSocket.
 *
 * Industry parity: Figma multiplayer, VS Live Share, Linear presence
 */

interface UserPresence {
  userId: string
  displayName: string
  avatar?: string
  status: 'online' | 'idle' | 'focus' | 'away'
  currentFile?: string
  currentRoom?: string
  cursor?: { line: number; column: number }
  color: string
  lastSeen: string
}

// In-memory fallback presence store (roomId → Map<userId, presence>)
const presenceStore = new Map<string, Map<string, UserPresence>>()

// Stale presence timeout (2 minutes)
const PRESENCE_TIMEOUT_MS = 120_000
const PRESENCE_TTL_SECONDS = 120

// Colour palette for collaborators
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']

function redisKey(roomId: string) {
  return `collab:presence:${roomId}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  }

  const roomId = req.nextUrl.searchParams.get('roomId') || 'default'
  const now = Date.now()

  const redis = await getRedisClient()

  if (redis) {
    try {
      const key = redisKey(roomId)
      const raw = await redis.hgetall(key)
      const users: UserPresence[] = []

      for (const [uid, json] of Object.entries(raw)) {
        try {
          const p: UserPresence = JSON.parse(json)
          // Filter stale entries
          if (now - new Date(p.lastSeen).getTime() <= PRESENCE_TIMEOUT_MS) {
            users.push(p)
          } else {
            await redis.hdel(key, uid)
          }
        } catch {
          // Skip malformed entries
        }
      }

      return NextResponse.json({ roomId, users, count: users.length })
    } catch (err) {
      console.warn('[Presence] Redis GET failed, falling back to in-memory:', err)
    }
  }

  // In-memory fallback
  const room = presenceStore.get(roomId) || new Map()
  for (const [uid, p] of room.entries()) {
    if (now - new Date(p.lastSeen).getTime() > PRESENCE_TIMEOUT_MS) {
      room.delete(uid)
    }
  }

  return NextResponse.json({
    roomId,
    users: Array.from(room.values()),
    count: room.size,
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    const body = await req.json()
    const result = presenceSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.flatten().fieldErrors }, { status: 400 })
    }
    const { roomId = 'default', userId, displayName, status, currentFile, currentRoom, cursor } = result.data

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const redis = await getRedisClient()

    if (redis) {
      try {
        const key = redisKey(roomId)

        // Get existing entry to preserve color and displayName
        let existing: UserPresence | null = null
        const existingRaw = await redis.hget(key, userId)
        if (existingRaw) {
          try { existing = JSON.parse(existingRaw) } catch { /* ignore */ }
        }

        // Determine color: use existing or assign based on current hash size
        const raw = await redis.hgetall(key)
        const colorIndex = Object.keys(raw).length % COLORS.length

        const presence: UserPresence = {
          userId,
          displayName: displayName || existing?.displayName || userId,
          avatar: existing?.avatar,
          status: status || 'online',
          currentFile: currentFile ?? existing?.currentFile,
          currentRoom: currentRoom ?? existing?.currentRoom,
          cursor: cursor ?? existing?.cursor,
          color: existing?.color || COLORS[colorIndex],
          lastSeen: new Date().toISOString(),
        }

        await redis.hset(key, userId, JSON.stringify(presence))
        await redis.expire(key, PRESENCE_TTL_SECONDS)

        const roomSize = await redis.hlen(key)

        return NextResponse.json({ success: true, presence, roomUsers: roomSize })
      } catch (err) {
        console.warn('[Presence] Redis POST failed, falling back to in-memory:', err)
      }
    }

    // In-memory fallback
    const room = presenceStore.get(roomId) || new Map()
    presenceStore.set(roomId, room)

    const existing = room.get(userId)
    const colorIndex = room.size % COLORS.length

    const presence: UserPresence = {
      userId,
      displayName: displayName || existing?.displayName || userId,
      avatar: existing?.avatar,
      status: status || 'online',
      currentFile: currentFile ?? existing?.currentFile,
      currentRoom: currentRoom ?? existing?.currentRoom,
      cursor: cursor ?? existing?.cursor,
      color: existing?.color || COLORS[colorIndex],
      lastSeen: new Date().toISOString(),
    }

    room.set(userId, presence)

    return NextResponse.json({ success: true, presence, roomUsers: room.size })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
