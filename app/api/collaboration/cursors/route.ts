// NOTE: Real-time cursor sync is handled via Y.js awareness protocol over WebSocket (/api/collab).
// This HTTP endpoint serves as a fallback for clients that cannot use WebSocket.
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getRedisClient } from '@/lib/redis-client'

/**
 * Collaboration — Remote Cursors API (VS Live Share parity)
 * GET/POST /api/collaboration/cursors
 *
 * Tracks cursor positions of all collaborators in a file.
 * Supports selections, scroll position, and typing indicators.
 *
 * Industry parity: VS Live Share, Google Docs cursors, Figma cursors
 */

interface CursorState {
  userId: string
  displayName: string
  color: string
  file: string
  cursor: { line: number; column: number }
  selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number }
  scroll?: { topLine: number; bottomLine: number }
  isTyping: boolean
  lastUpdate: string
}

// In-memory fallback cursor store (fileId → Map<userId, cursor>)
const cursorStore = new Map<string, Map<string, CursorState>>()

// Stale cursor timeout (30 seconds)
const CURSOR_TIMEOUT_MS = 30_000
const CURSOR_TTL_SECONDS = 30

function redisKey(fileId: string) {
  return `collab:cursors:${fileId}`
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  }

  const fileId = req.nextUrl.searchParams.get('fileId')

  if (!fileId) {
    return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
  }

  const now = Date.now()
  const redis = await getRedisClient()

  if (redis) {
    try {
      const key = redisKey(fileId)
      const raw = await redis.hgetall(key)
      const cursors: CursorState[] = []

      for (const [uid, json] of Object.entries(raw)) {
        try {
          const c: CursorState = JSON.parse(json)
          // Filter stale entries
          if (now - new Date(c.lastUpdate).getTime() <= CURSOR_TIMEOUT_MS) {
            cursors.push(c)
          } else {
            await redis.hdel(key, uid)
          }
        } catch {
          // Skip malformed entries
        }
      }

      return NextResponse.json({ fileId, cursors, count: cursors.length })
    } catch (err) {
      console.warn('[Cursors] Redis GET failed, falling back to in-memory:', err)
    }
  }

  // In-memory fallback
  const fileCursors = cursorStore.get(fileId) || new Map()
  for (const [uid, c] of fileCursors.entries()) {
    if (now - new Date(c.lastUpdate).getTime() > CURSOR_TIMEOUT_MS) {
      fileCursors.delete(uid)
    }
  }

  return NextResponse.json({
    fileId,
    cursors: Array.from(fileCursors.values()),
    count: fileCursors.size,
  })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Auth required' }, { status: 401 })
    }

    const { fileId, userId, displayName, color, cursor, selection, scroll, isTyping } = await req.json()

    if (!fileId || !userId) {
      return NextResponse.json({ error: 'fileId and userId are required' }, { status: 400 })
    }

    const redis = await getRedisClient()

    if (redis) {
      try {
        const key = redisKey(fileId)

        const state: CursorState = {
          userId,
          displayName: displayName || userId,
          color: color || '#4ECDC4',
          file: fileId,
          cursor: cursor || { line: 1, column: 1 },
          selection,
          scroll,
          isTyping: isTyping || false,
          lastUpdate: new Date().toISOString(),
        }

        await redis.hset(key, userId, JSON.stringify(state))
        await redis.expire(key, CURSOR_TTL_SECONDS)

        const collaborators = await redis.hlen(key)

        return NextResponse.json({ success: true, cursor: state, collaborators })
      } catch (err) {
        console.warn('[Cursors] Redis POST failed, falling back to in-memory:', err)
      }
    }

    // In-memory fallback
    const fileCursors = cursorStore.get(fileId) || new Map()
    cursorStore.set(fileId, fileCursors)

    const state: CursorState = {
      userId,
      displayName: displayName || userId,
      color: color || '#4ECDC4',
      file: fileId,
      cursor: cursor || { line: 1, column: 1 },
      selection,
      scroll,
      isTyping: isTyping || false,
      lastUpdate: new Date().toISOString(),
    }

    fileCursors.set(userId, state)

    return NextResponse.json({ success: true, cursor: state, collaborators: fileCursors.size })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
